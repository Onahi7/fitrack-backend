import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class PayloadTooLargeFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Check if it's a payload too large error
    if (
      exception.message?.includes('request entity too large') ||
      exception.type === 'entity.too.large' ||
      exception.code === 'LIMIT_FILE_SIZE'
    ) {
      response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
        statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'Payload too large. Maximum allowed size is 100MB.',
        error: 'Payload Too Large',
        timestamp: new Date().toISOString(),
      });
    } else {
      // Re-throw if it's not a payload size error
      throw exception;
    }
  }
}