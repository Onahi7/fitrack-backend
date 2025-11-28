import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const journalEntries = pgTable('journal_entries', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  mood: text('mood'),
  encrypted: boolean('encrypted').default(false),
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
