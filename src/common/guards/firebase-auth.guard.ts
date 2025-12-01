import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private firebaseInitialized = false;

  constructor(private configService: ConfigService) {
    // Initialize Firebase Admin SDK only if credentials are properly configured
    if (!admin.apps.length) {
      const projectId = this.configService.get('FIREBASE_PROJECT_ID');
      const privateKey = this.configService.get('FIREBASE_PRIVATE_KEY');
      const clientEmail = this.configService.get('FIREBASE_CLIENT_EMAIL');

      // Check if Firebase credentials are properly configured (not placeholder values)
      const hasValidCredentials =
        projectId &&
        privateKey &&
        clientEmail &&
        !privateKey.includes('YOUR_PRIVATE_KEY_HERE') &&
        !privateKey.includes('your-private-key') &&
        !clientEmail.includes('xxxxx') &&
        privateKey.includes('-----BEGIN PRIVATE KEY-----') &&
        privateKey.length > 100; // Real private keys are much longer than placeholders

      if (hasValidCredentials) {
        try {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              privateKey: privateKey.replace(/\\n/g, '\n'),
              clientEmail,
            }),
          });
          this.firebaseInitialized = true;
          console.log('Firebase Admin SDK initialized successfully.');
        } catch (error) {
          console.warn('Firebase Admin SDK initialization failed:', error.message);
          console.warn('Authentication will be disabled. Please configure Firebase credentials in .env file.');
        }
      } else {
        console.warn('Firebase credentials not configured or using placeholder values.');
        console.warn('Authentication will be disabled. Please add valid Firebase credentials to .env file.');
      }
    } else {
      this.firebaseInitialized = true;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // If Firebase is not initialized, reject the request
    if (!this.firebaseInitialized) {
      throw new UnauthorizedException(
        'Firebase authentication is not configured. Please add valid Firebase credentials to the .env file.',
      );
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7);

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('[FIREBASE AUTH] Decoded token:', { uid: decodedToken.uid, user_id: decodedToken.user_id });
      request.user = decodedToken; // Attach user to request
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
