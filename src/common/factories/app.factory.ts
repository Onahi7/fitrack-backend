import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from '../../app.module';
import * as express from 'express';

export async function createApp() {
  // Create Express app first with custom configuration
  const expressApp = express();
  
  // Configure Express with increased limits before NestJS takes over
  expressApp.use(express.json({ 
    limit: '100mb',
    strict: false
  }));
  
  expressApp.use(express.urlencoded({ 
    limit: '100mb', 
    extended: true,
    parameterLimit: 50000
  }));
  
  // Create NestJS application
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    {
      rawBody: true,
    }
  );

  // Apply the pre-configured middleware to the NestJS app
  app.use(express.json({ 
    limit: '100mb',
    strict: false
  }));

  app.use(express.urlencoded({ 
    limit: '100mb', 
    extended: true,
    parameterLimit: 50000
  }));
  
  return app;
}