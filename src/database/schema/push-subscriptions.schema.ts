import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  keys: jsonb('keys').notNull(), // { p256dh: string, auth: string }
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  
  // Notification channels
  pushEnabled: text('push_enabled').default('true'),
  emailEnabled: text('email_enabled').default('true'),
  
  // Reminder preferences
  waterReminders: text('water_reminders').default('true'),
  mealReminders: text('meal_reminders').default('true'),
  workoutReminders: text('workout_reminders').default('false'),
  streakReminders: text('streak_reminders').default('true'),
  
  // Reminder times (stored as JSON array of HH:MM strings)
  waterReminderTimes: jsonb('water_reminder_times').default(['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']),
  mealReminderTimes: jsonb('meal_reminder_times').default(['08:00', '12:00', '18:00']),
  
  // Timezone
  timezone: text('timezone').default('America/New_York'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
