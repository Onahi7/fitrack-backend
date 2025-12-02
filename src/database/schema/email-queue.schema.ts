import { pgTable, serial, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';

export const emailQueue = pgTable('email_queue', {
  id: serial('id').primaryKey(),
  recipient: text('recipient').notNull(),
  recipientName: text('recipient_name'),
  recipientUserId: text('recipient_user_id'),
  subject: text('subject').notNull(),
  emailType: text('email_type').notNull(), // 'challenge_new', 'challenge_joined', 'daily_reminder', etc.
  templateData: jsonb('template_data'), // Store dynamic data for the email
  status: text('status').notNull().default('pending'), // 'pending', 'sent', 'failed'
  priority: integer('priority').default(5), // 1-10, higher = more urgent
  scheduledFor: timestamp('scheduled_for'),
  sentAt: timestamp('sent_at'),
  failedAt: timestamp('failed_at'),
  error: text('error'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailLogs = pgTable('email_logs', {
  id: serial('id').primaryKey(),
  queueId: integer('queue_id').references(() => emailQueue.id),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  emailType: text('email_type').notNull(),
  status: text('status').notNull(), // 'sent', 'failed', 'bounced'
  provider: text('provider').default('resend'), // Email service used
  providerId: text('provider_id'), // External ID from email provider
  metadata: jsonb('metadata'),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});
