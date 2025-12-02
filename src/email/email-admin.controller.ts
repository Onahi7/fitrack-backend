import { Controller, Get, Post, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin/emails')
@UseGuards(FirebaseAuthGuard, AdminGuard)
export class EmailAdminController {
  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Get email queue statistics
   */
  @Get('stats')
  async getStats() {
    return this.emailQueueService.getQueueStats();
  }

  /**
   * Get queue items (pending, sent, failed)
   */
  @Get('queue')
  async getQueue(
    @Query('status') status?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
  ) {
    return this.emailQueueService.getQueueItems(status, limit, offset);
  }

  /**
   * Get recent email logs
   */
  @Get('logs')
  async getLogs(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.emailQueueService.getRecentLogs(limit);
  }

  /**
   * Send a test email (public for testing)
   */
  @Post('test')
  async sendTestEmail() {
    try {
      const result = await this.emailService.sendDailyCheckInReminder(
        'dicksnhardy7@gmail.com',
        'Intentional User',
      );
      
      return {
        success: true,
        message: 'Test email sent successfully to dicksnhardy7@gmail.com',
        result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send test email',
        error: error.message,
      };
    }
  }
}

// Create a public controller for testing emails without auth
@Controller('emails')
export class EmailTestController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send-test')
  async sendTest() {
    try {
      const result = await this.emailService.sendDailyCheckInReminder(
        'dicksnhardy7@gmail.com',
        'Test User',
      );
      
      return {
        success: true,
        message: 'Email sent successfully to dicksnhardy7@gmail.com',
        result: result?.data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      };
    }
  }
}
