import { pgTable, serial, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const weeklyReports = pgTable('weekly_reports', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  weekStart: timestamp('week_start').notNull(),
  weekEnd: timestamp('week_end').notNull(),
  metrics: jsonb('metrics').$type<any>(),
  insights: jsonb('insights').$type<string[]>(),
  comparisonToPrevious: jsonb('comparison_to_previous').$type<any>(),
  emailSent: boolean('email_sent').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});
