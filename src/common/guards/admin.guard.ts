import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails = [
    process.env.ADMIN_EMAIL || 'admin@fittrack.com',
    // Add more admin emails from environment variables if needed
    ...(process.env.ADMIN_EMAILS?.split(',') || []),
  ];

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No user found in request');
    }

    // Check if user email is in admin list
    const isAdmin = this.adminEmails.includes(user.email);

    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
