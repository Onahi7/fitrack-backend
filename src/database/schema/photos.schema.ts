import { pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const progressPhotos = pgTable('progress_photos', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  url: text('url').notNull(),
  cloudinaryPublicId: text('cloudinary_public_id').notNull(),
  date: timestamp('date').notNull(),
  visibility: text('visibility').default('private'), // 'private' | 'buddy' | 'community'
  notes: text('notes'),
  weight: numeric('weight', { precision: 5, scale: 2 }),
  bodyFat: numeric('body_fat', { precision: 4, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
});
