import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { DrizzleService } from '../database/drizzle.service';
import { pushSubscriptions, notificationPreferences } from '../database/schema';
import { eq } from 'drizzle-orm';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);

  constructor(private drizzle: DrizzleService) {
    this.initializeVapid();
  }

  /**
   * Initialize VAPID keys for web push
   */
  private initializeVapid() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@intentional.app';

    if (!vapidPublicKey || !vapidPrivateKey) {
      this.logger.warn('⚠️  VAPID keys not configured. Run: npm run generate:vapid');
      this.logger.warn('   Then add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env');
      return;
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey,
    );

    this.logger.log('✅ Web Push service initialized');
  }

  /**
   * Check if web push is configured
   */
  isConfigured(): boolean {
    return !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY;
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(
    userId: string,
    subscription: PushSubscription,
    userAgent?: string,
  ): Promise<void> {
    try {
      // Check if subscription already exists
      const existing = await this.drizzle.db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
        .limit(1);

      if (existing.length > 0) {
        this.logger.log(`Subscription already exists for user ${userId}`);
        return;
      }

      // Save new subscription
      await this.drizzle.db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
      });

      this.logger.log(`✅ User ${userId} subscribed to push notifications`);
    } catch (error) {
      this.logger.error(`Failed to save subscription for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from push notifications
   */
  async unsubscribe(userId: string, endpoint?: string): Promise<void> {
    try {
      if (endpoint) {
        // Unsubscribe specific endpoint
        await this.drizzle.db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, endpoint));
      } else {
        // Unsubscribe all endpoints for user
        await this.drizzle.db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, userId));
      }

      this.logger.log(`✅ User ${userId} unsubscribed from push notifications`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Send push notification to user
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      icon?: string;
      badge?: string;
      data?: any;
      actions?: Array<{ action: string; title: string }>;
    },
  ): Promise<number> {
    if (!this.isConfigured()) {
      this.logger.warn('Web Push not configured. Skipping notification.');
      return 0;
    }

    try {
      // Get all subscriptions for user
      const subs = await this.drizzle.db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

      if (subs.length === 0) {
        // Only log in debug mode to reduce spam
        // this.logger.log(`No push subscriptions found for user ${userId}`);
        return 0;
      }

      // Send to all user's devices
      const promises = subs.map(async (sub) => {
        try {
          const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/icon-192.png',
            badge: notification.badge || '/badge-72.png',
            data: notification.data || {},
            actions: notification.actions || [],
          });

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys as any,
            },
            payload,
          );

          return true;
        } catch (error) {
          // Handle expired/invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            this.logger.warn(`Removing expired subscription: ${sub.endpoint}`);
            await this.drizzle.db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.id, sub.id));
          } else {
            this.logger.error(`Failed to send push to ${sub.endpoint}:`, error);
          }
          return false;
        }
      });

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r).length;

      this.logger.log(`✅ Sent push notification to ${successCount}/${subs.length} devices for user ${userId}`);
      return successCount;
    } catch (error) {
      this.logger.error(`Error sending push notification to user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Send water reminder
   */
  async sendWaterReminder(userId: string, userName: string): Promise<number> {
    return this.sendToUser(userId, {
      title: '💧 Time to Hydrate!',
      body: `Hey ${userName}! Drink a glass of water and log it in the app.`,
      icon: '/icons/water.png',
      data: { type: 'water_reminder', url: '/water' },
      actions: [
        { action: 'log', title: 'Log Water' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send meal reminder
   */
  async sendMealReminder(userId: string, userName: string, mealType: string): Promise<number> {
    return this.sendToUser(userId, {
      title: `🍽️ Time for ${mealType}!`,
      body: `${userName}, don't forget to log your ${mealType}.`,
      icon: '/icons/meal.png',
      data: { type: 'meal_reminder', mealType, url: '/log-meal' },
      actions: [
        { action: 'log', title: 'Log Meal' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send workout reminder
   */
  async sendWorkoutReminder(userId: string, userName: string): Promise<number> {
    return this.sendToUser(userId, {
      title: '💪 Time to Move!',
      body: `${userName}, get your workout in and keep your streak alive!`,
      icon: '/icons/workout.png',
      data: { type: 'workout_reminder', url: '/workouts' },
      actions: [
        { action: 'log', title: 'Log Workout' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Send streak reminder
   */
  async sendStreakReminder(userId: string, userName: string, streakDays: number): Promise<number> {
    return this.sendToUser(userId, {
      title: `🔥 ${streakDays}-Day Streak!`,
      body: `${userName}, you're on fire! Don't break your streak today.`,
      icon: '/icons/streak.png',
      data: { type: 'streak_reminder', streakDays, url: '/' },
      actions: [
        { action: 'checkin', title: 'Check In' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<any> {
    const [prefs] = await this.drizzle.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    return prefs || this.getDefaultPreferences();
  }

  /**
   * Get default notification preferences
   */
  private getDefaultPreferences() {
    return {
      pushEnabled: true,
      emailEnabled: true,
      waterReminders: true,
      mealReminders: true,
      workoutReminders: false,
      streakReminders: true,
      waterReminderTimes: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
      mealReminderTimes: ['08:00', '12:00', '18:00'],
      timezone: 'America/New_York',
    };
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, preferences: any): Promise<void> {
    const [existing] = await this.drizzle.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (existing) {
      await this.drizzle.db
        .update(notificationPreferences)
        .set(preferences)
        .where(eq(notificationPreferences.userId, userId));
    } else {
      await this.drizzle.db.insert(notificationPreferences).values({
        userId,
        ...preferences,
      });
    }

    this.logger.log(`✅ Updated notification preferences for user ${userId}`);
  }
}
