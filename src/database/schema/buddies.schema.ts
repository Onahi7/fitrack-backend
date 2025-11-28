import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const buddyPairs = pgTable('buddy_pairs', {
  id: serial('id').primaryKey(),
  user1Id: text('user1_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  user2Id: text('user2_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  status: text('status').default('pending'), // 'pending' | 'active' | 'inactive'
  sharedGoals: jsonb('shared_goals').$type<string[]>(),
  privacySettings: jsonb('privacy_settings').$type<any>(),
  createdAt: timestamp('created_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
});
