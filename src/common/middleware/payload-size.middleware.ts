import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PayloadSizeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Set additional headers for large payloads
    req.setTimeout(300000); // 5 minutes timeout
    
    // Handle payload size errors at middleware level
    req.on('error', (err: any) => {
      if (err.code === 'LIMIT_FILE_SIZE' || err.message.includes('request entity too large')) {
        return res.status(413).json({
          statusCode: 413,
          message: 'Payload too large. Maximum allowed size is 100MB.',
          error: 'Payload Too Large',
        });
      }
    });
    
    next();
  }
}