import { pgTable, serial, text, timestamp, numeric } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const meals = pgTable('meals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  calories: numeric('calories', { precision: 6, scale: 2 }).notNull(),
  protein: numeric('protein', { precision: 5, scale: 2 }),
  carbs: numeric('carbs', { precision: 5, scale: 2 }),
  fats: numeric('fats', { precision: 5, scale: 2 }),
  imageUrl: text('image_url'),
  cloudinaryPublicId: text('cloudinary_public_id'),
  mealType: text('meal_type').notNull(), // 'breakfast' | 'lunch' | 'dinner' | 'snack'
  date: timestamp('date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
