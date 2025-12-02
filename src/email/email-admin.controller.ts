import { Controller, Get, Post, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
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
   * Send test emails for any template
   */
  @Post('send-test')
  async sendTestEmail(
    @Body() body: { 
      templateType: string; 
      email: string; 
      name?: string;
      challengeName?: string;
      taskTitle?: string;
      achievementName?: string;
      mealType?: string;
    },
  ) {
    try {
      const { templateType, email, name = 'Test User', challengeName, taskTitle, achievementName, mealType } = body;
      let result;

      switch (templateType) {
        case 'daily_checkin':
          result = await this.emailService.sendDailyCheckInReminder(email, name);
          break;
        
        case 'weekly_checkin':
          result = await this.emailService.sendWeeklyCheckInReminder(email, name);
          break;
        
        case 'meal_reminder':
          result = await this.emailService.sendMealReminder(email, name, mealType || 'Breakfast');
          break;
        
        case 'achievement_unlocked':
          result = await this.emailService.sendAchievementUnlocked(
            email,
            name,
            achievementName || 'First Steps',
            'Complete your first check-in',
          );
          break;
        
        case 'new_challenge':
          result = await this.emailService.sendNewChallengeNotification(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            'Transform your health in 30 days with daily tasks and community support',
            'wellness',
            30,
          );
          break;
        
        case 'challenge_joined':
          result = await this.emailService.sendChallengeJoinedNotification(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            new Date().toISOString(),
            30,
          );
          break;
        
        case 'challenge_starting_soon':
          result = await this.emailService.sendChallengeStartingSoonNotification(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          );
          break;
        
        case 'daily_task_reminder':
          result = await this.emailService.sendDailyChallengeTaskReminder(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            3,
            8,
          );
          break;
        
        case 'daily_task_created':
          result = await this.emailService.sendDailyTaskCreatedNotification(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            taskTitle || 'Morning Workout',
            'Complete a 30-minute cardio session',
            'exercise',
            10,
            new Date().toISOString(),
          );
          break;
        
        case 'challenge_completed':
          result = await this.emailService.sendChallengeCompletedNotification(
            email,
            name,
            challengeName || '30-Day Wellness Challenge',
            85.5,
            3,
            50,
          );
          break;
        
        default:
          return {
            success: false,
            message: `Unknown template type: ${templateType}`,
          };
      }
      
      return {
        success: true,
        message: `Test email sent successfully to ${email}`,
        templateType,
        result: result?.data || result,
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
      // Resend free tier only allows sending to verified email
      const result = await this.emailService.sendDailyCheckInReminder(
        'hardytechabuja@gmail.com',
        'Hardy',
      );
      
      return {
        success: true,
        message: 'Email sent successfully to hardytechabuja@gmail.com',
        result: result?.data || result,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send email',
        error: error.message,
        stack: error.stack,
      };
    }
  }
}
