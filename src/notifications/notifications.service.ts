import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrizzleService } from '../database/drizzle.service';
import { users, streaks, userProfiles } from '../database/schema';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { Resend } from 'resend';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: Resend;
  private firebaseMessaging: admin.messaging.Messaging;

  constructor(private drizzle: DrizzleService) {
    // Initialize Resend for email notifications
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }

    // Initialize Firebase Messaging for push notifications
    if (admin.apps.length > 0) {
      this.firebaseMessaging = admin.messaging();
    }
  }

  /**
   * Check for missed check-ins daily at 8 PM
   */
  @Cron('0 20 * * *', {
    name: 'check-missed-checkins',
    timeZone: 'America/New_York',
  })
  async checkMissedCheckIns() {
    this.logger.log('Checking for missed check-ins...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find users who haven't logged anything today
      const allUsers = await this.drizzle.db
        .select({
          user: users,
          profile: userProfiles,
        })
        .from(users)
        .leftJoin(userProfiles, eq(userProfiles.userId, users.id));

      for (const { user, profile } of allUsers) {
        // Check if user has any activity today
        const hasActivityToday = await this.hasActivityToday(user.id, today);

        if (!hasActivityToday) {
          // Send reminder notification
          await this.sendMissedCheckInNotification(user);
          this.logger.log(`Sent missed check-in notification to ${user.email}`);
        }
      }

      this.logger.log('Finished checking missed check-ins');
    } catch (error) {
      this.logger.error('Error checking missed check-ins:', error);
    }
  }

  /**
   * Check if user has logged any activity today
   */
  private async hasActivityToday(userId: string, today: Date): Promise<boolean> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check streaks table for today's activity
    const userStreaks = await this.drizzle.db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));

    // Check if any streak has been checked in today
    const hasCheckedIn = userStreaks.some(streak => {
      if (!streak.lastCheckIn) return false;
      const lastCheckInDate = new Date(streak.lastCheckIn);
      return lastCheckInDate.toDateString() === today.toDateString();
    });

    return hasCheckedIn;
  }

  /**
   * Send missed check-in notification via email/push
   */
  private async sendMissedCheckInNotification(user: any) {
    const message = {
      to: user.email,
      subject: 'Don\'t break your streak! 🔥',
      body: `Hi ${user.displayName || 'there'},\n\nYou haven't logged your progress today. Keep your streak alive by checking in now!\n\nYour wellness journey matters. Let's make today count! 💪`,
    };

    // Send email via Resend
    await this.sendEmail({
      to: user.email,
      subject: message.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Don't break your streak! 🔥</h2>
          <p>Hi ${user.displayName || 'there'},</p>
          <p>You haven't logged your progress today. Keep your streak alive by checking in now!</p>
          <p>Your wellness journey matters. Let's make today count! 💪</p>
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
             style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
            Check In Now
          </a>
        </div>
      `,
    });

    // Send push notification if user has FCM token
    // Note: fcmToken field needs to be added to users table schema
    // if (user.fcmToken) {
    //   await this.sendPushNotification(user.fcmToken, {
    //     title: 'Don\'t break your streak! 🔥',
    //     body: 'You haven\'t logged your progress today. Check in now!',
    //     data: {
    //       type: 'missed_checkin',
    //       userId: user.id,
    //     },
    //   });
    // }
  }

  /**
   * Send email using Resend
   */
  private async sendEmail(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (!this.resend) {
      this.logger.warn('Resend not configured. Skipping email notification.');
      return;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: process.env.FROM_EMAIL || 'Intentional <noreply@intentional.app>',
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        this.logger.error(`Failed to send email to ${params.to}:`, error);
      } else {
        this.logger.log(`Email sent successfully to ${params.to}. ID: ${data?.id}`);
      }
    } catch (error) {
      this.logger.error(`Error sending email:`, error);
    }
  }

  /**
   * Send push notification using Firebase Cloud Messaging
   */
  private async sendPushNotification(
    token: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<void> {
    if (!this.firebaseMessaging) {
      this.logger.warn('Firebase Messaging not configured. Skipping push notification.');
      return;
    }

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.firebaseMessaging.send(message);
      this.logger.log(`Push notification sent successfully. Message ID: ${response}`);
    } catch (error) {
      this.logger.error(`Error sending push notification:`, error);
      // Token might be invalid, consider removing it
      if (error.code === 'messaging/registration-token-not-registered') {
        this.logger.warn(`Invalid FCM token: ${token}. Should be removed from database.`);
      }
    }
  }

  /**
   * Send motivational notification at 9 AM
   */
  @Cron('0 9 * * *', {
    name: 'morning-motivation',
    timeZone: 'America/New_York',
  })
  async sendMorningMotivation() {
    this.logger.log('Sending morning motivation...');

    const motivationalQuotes = [
      'Start your day strong! Log your breakfast and water intake 💧',
      'Your journey to wellness begins with today\'s choices 🌟',
      'Small steps today lead to big changes tomorrow 🎯',
      'You\'ve got this! Make today count 💪',
      'Consistency is key. Let\'s make today another win! 🏆',
    ];

    const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];

    try {
      // Get all active users
      const allUsers = await this.drizzle.db.select().from(users);

      for (const user of allUsers) {
        // Send email
        await this.sendEmail({
          to: user.email,
          subject: 'Good Morning! Start Your Day Right ☀️',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #6366f1;">Good Morning, ${user.displayName || 'there'}! ☀️</h2>
              <p style="font-size: 18px; color: #374151; margin: 20px 0;">${randomQuote}</p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
                 style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 16px;">
                Start Logging
              </a>
            </div>
          `,
        });

        // Send push notification if user has FCM token
        // Note: fcmToken field needs to be added to users table schema
        // await this.sendPushNotification(user.fcmToken, {
        //   title: 'Good Morning! ☀️',
        //   body: randomQuote,
        //   data: {
        //     type: 'morning_motivation',
        //   },
        // });
      }

      this.logger.log(`Sent morning motivation to ${allUsers.length} users`);
    } catch (error) {
      this.logger.error('Error sending morning motivation:', error);
    }
  }

  /**
   * Send weekly progress summary on Sundays at 6 PM
   */
  @Cron('0 18 * * 0', {
    name: 'weekly-summary',
    timeZone: 'America/New_York',
  })
  async sendWeeklySummary() {
    this.logger.log('Sending weekly summaries...');

    const allUsers = await this.drizzle.db
      .select()
      .from(users);

    for (const user of allUsers) {
      // Get user's weekly stats
      const weeklyStats = await this.getWeeklyStats(user.id);
      
      const message = {
        to: user.email,
        subject: 'Your Weekly Wellness Summary 📊',
        body: `Hi ${user.displayName || 'there'},\n\nHere's your week at a glance:\n${weeklyStats}\n\nKeep up the great work!`,
      };

      this.logger.log(`Would send weekly summary to ${user.email}`);
    }
  }

  /**
   * Get user's weekly statistics
   */
  private async getWeeklyStats(userId: string): Promise<string> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all user streaks
    const userStreaks = await this.drizzle.db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));

    // Calculate active days and completed tasks
    const activeDaysSet = new Set<string>();
    let completedTasks = 0;

    for (const streak of userStreaks) {
      if (streak.lastCheckIn) {
        const lastCheckInDate = new Date(streak.lastCheckIn);
        if (lastCheckInDate >= weekAgo) {
          // Add the date to the set to count unique active days
          activeDaysSet.add(lastCheckInDate.toDateString());
          // Count as a completed task if checked in this week
          completedTasks++;
        }
      }
    }

    const daysActive = activeDaysSet.size;
    return `- Active Days: ${daysActive}/7\n- Tasks Completed: ${completedTasks}\n- Consistency: ${((daysActive / 7) * 100).toFixed(0)}%`;
  }

  /**
   * Send buddy encouragement when buddy completes a milestone
   */
  async sendBuddyMilestone(userId: string, buddyName: string, milestone: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user) {
      const message = {
        to: user.email,
        subject: `Your buddy ${buddyName} just hit a milestone! 🎉`,
        body: `${buddyName} ${milestone}! Send them a message to celebrate their progress!`,
      };

      this.logger.log(`Would send buddy milestone notification: ${JSON.stringify(message)}`);
    }
  }
}
