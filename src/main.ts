import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  
  // Enable CORS
  const allowedOrigins = configService.get('ALLOWED_ORIGINS')?.split(',') || [
    'http://localhost:5173',
    'https://fittrac.me',
    'https://fittrack.vercel.app',
    'https://www.fittrac.me'
  ];
  
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true, // Allow all origins if no specific origins configured
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  const port = configService.get('PORT') || 3000;
  await app.listen(port);
  
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
