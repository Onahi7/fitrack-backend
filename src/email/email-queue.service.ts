import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrizzleService } from '../database/drizzle.service';
import { EmailService } from './email.service';
import { emailQueue, emailLogs, users } from '../database/schema';
import { eq, lte, and, sql } from 'drizzle-orm';

export interface QueueEmailDto {
  recipient: string;
  recipientName?: string;
  recipientUserId?: string;
  subject: string;
  emailType: string;
  templateData?: any;
  priority?: number;
  scheduledFor?: Date;
}

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private isProcessing = false;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Add email to queue
   */
  async queueEmail(dto: QueueEmailDto) {
    const [queued] = await this.drizzle.db
      .insert(emailQueue)
      .values({
        recipient: dto.recipient,
        recipientName: dto.recipientName,
        recipientUserId: dto.recipientUserId,
        subject: dto.subject,
        emailType: dto.emailType,
        templateData: dto.templateData || {},
        priority: dto.priority || 5,
        scheduledFor: dto.scheduledFor || new Date(),
        status: 'pending',
        retryCount: 0,
      })
      .returning();

    this.logger.log(`Email queued: ${dto.emailType} to ${dto.recipient}`);
    return queued;
  }

  /**
   * Queue multiple emails at once
   */
  async queueBulkEmails(emails: QueueEmailDto[]) {
    if (emails.length === 0) return [];

    const values = emails.map(dto => ({
      recipient: dto.recipient,
      recipientName: dto.recipientName,
      recipientUserId: dto.recipientUserId,
      subject: dto.subject,
      emailType: dto.emailType,
      templateData: dto.templateData || {},
      priority: dto.priority || 5,
      scheduledFor: dto.scheduledFor || new Date(),
      status: 'pending' as const,
      retryCount: 0,
    }));

    const queued = await this.drizzle.db
      .insert(emailQueue)
      .values(values)
      .returning();

    this.logger.log(`Bulk queued ${queued.length} emails`);
    return queued;
  }

  /**
   * Process email queue - runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processQueue() {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending emails that are scheduled to be sent
      const pending = await this.drizzle.db
        .select()
        .from(emailQueue)
        .where(
          and(
            eq(emailQueue.status, 'pending'),
            lte(emailQueue.scheduledFor, new Date()),
          ),
        )
        .orderBy(emailQueue.priority, emailQueue.scheduledFor)
        .limit(10); // Process 10 at a time

      if (pending.length === 0) {
        this.logger.debug('No pending emails in queue');
        return;
      }

      this.logger.log(`Processing ${pending.length} emails from queue`);

      // Process in batches of 2 to respect rate limits
      for (let i = 0; i < pending.length; i += 2) {
        const batch = pending.slice(i, i + 2);
        await Promise.all(batch.map(email => this.sendQueuedEmail(email)));
        
        // Wait 1 second between batches
        if (i + 2 < pending.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      this.logger.error('Error processing email queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single queued email
   */
  private async sendQueuedEmail(queueItem: any) {
    try {
      this.logger.log(`Sending ${queueItem.emailType} to ${queueItem.recipient}`);

      let result;
      const data = queueItem.templateData || {};

      // Route to appropriate email service method
      switch (queueItem.emailType) {
        case 'challenge_new':
          result = await this.emailService.sendNewChallengeNotification(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.challengeDescription,
            data.challengeType,
            data.duration,
            data.imageUrl,
          );
          break;

        case 'challenge_joined':
          result = await this.emailService.sendChallengeJoinedNotification(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.startDate,
            data.duration,
          );
          break;

        case 'challenge_starting_soon':
          result = await this.emailService.sendChallengeStartingSoonNotification(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.startDate,
          );
          break;

        case 'daily_task_reminder':
          result = await this.emailService.sendDailyChallengeTaskReminder(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.tasksCompleted,
            data.totalTasks,
          );
          break;

        case 'challenge_completed':
          result = await this.emailService.sendChallengeCompletedNotification(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.completionRate,
            data.rank,
            data.totalParticipants,
          );
          break;

        case 'daily_checkin':
          result = await this.emailService.sendDailyCheckInReminder(
            queueItem.recipient,
            data.name,
          );
          break;

        case 'weekly_checkin':
          result = await this.emailService.sendWeeklyCheckInReminder(
            queueItem.recipient,
            data.name,
          );
          break;

        case 'meal_reminder':
          result = await this.emailService.sendMealReminder(
            queueItem.recipient,
            data.name,
            data.mealType,
          );
          break;

        case 'achievement_unlocked':
          result = await this.emailService.sendAchievementUnlocked(
            queueItem.recipient,
            data.name,
            data.achievementName,
            data.achievementDescription,
          );
          break;

        case 'daily_task_created':
          result = await this.emailService.sendDailyTaskCreatedNotification(
            queueItem.recipient,
            data.name,
            data.challengeName,
            data.taskTitle,
            data.taskDescription,
            data.taskType,
            data.points,
            data.taskDate,
          );
          break;

        default:
          throw new Error(`Unknown email type: ${queueItem.emailType}`);
      }

      // Mark as sent
      await this.drizzle.db
        .update(emailQueue)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(emailQueue.id, queueItem.id));

      // Log success
      await this.drizzle.db.insert(emailLogs).values({
        queueId: queueItem.id,
        recipient: queueItem.recipient,
        subject: queueItem.subject,
        emailType: queueItem.emailType,
        status: 'sent',
        provider: 'resend',
        providerId: result?.data?.id,
        metadata: { result },
        sentAt: new Date(),
      });

      this.logger.log(`✅ Sent ${queueItem.emailType} to ${queueItem.recipient}`);
    } catch (error) {
      this.logger.error(`❌ Failed to send email ${queueItem.id}:`, error);

      // Update retry count
      const newRetryCount = queueItem.retryCount + 1;
      const maxRetries = 3;

      if (newRetryCount >= maxRetries) {
        // Mark as failed after max retries
        await this.drizzle.db
          .update(emailQueue)
          .set({
            status: 'failed',
            failedAt: new Date(),
            error: error.message,
            retryCount: newRetryCount,
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, queueItem.id));

        // Log failure
        await this.drizzle.db.insert(emailLogs).values({
          queueId: queueItem.id,
          recipient: queueItem.recipient,
          subject: queueItem.subject,
          emailType: queueItem.emailType,
          status: 'failed',
          provider: 'resend',
          metadata: { error: error.message },
          sentAt: new Date(),
        });
      } else {
        // Increment retry count and reschedule
        await this.drizzle.db
          .update(emailQueue)
          .set({
            retryCount: newRetryCount,
            scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Retry in 5 minutes
            updatedAt: new Date(),
          })
          .where(eq(emailQueue.id, queueItem.id));
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [stats] = await this.drizzle.db
      .select({
        pending: sql<number>`COUNT(*) FILTER (WHERE status = 'pending')`,
        sent: sql<number>`COUNT(*) FILTER (WHERE status = 'sent')`,
        failed: sql<number>`COUNT(*) FILTER (WHERE status = 'failed')`,
        total: sql<number>`COUNT(*)`,
      })
      .from(emailQueue);

    return stats;
  }

  /**
   * Get recent email logs
   */
  async getRecentLogs(limit = 50) {
    return this.drizzle.db
      .select()
      .from(emailLogs)
      .orderBy(sql`${emailLogs.sentAt} DESC`)
      .limit(limit);
  }

  /**
   * Get queue items with pagination
   */
  async getQueueItems(status?: string, limit = 50, offset = 0) {
    const query = this.drizzle.db.select().from(emailQueue);

    if (status) {
      query.where(eq(emailQueue.status, status));
    }

    return query
      .orderBy(sql`${emailQueue.createdAt} DESC`)
      .limit(limit)
      .offset(offset);
  }
}
