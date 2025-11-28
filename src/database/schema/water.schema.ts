import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const waterLogs = pgTable('water_logs', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  glasses: integer('glasses').notNull(),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
