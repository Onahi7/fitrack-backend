import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const streaks = pgTable('streaks', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'meal' | 'water' | 'journal' | 'overall'
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastCheckIn: timestamp('last_check_in'),
  freezeAvailable: boolean('freeze_available').default(true),
  lastFreezeUsed: timestamp('last_freeze_used'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
