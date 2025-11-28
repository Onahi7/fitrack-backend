import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // 'streak' | 'weight' | 'consistency' | 'community' | 'special'
  icon: text('icon').notNull(),
  requirement: integer('requirement').notNull(),
});

export const userAchievements = pgTable('user_achievements', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  achievementId: integer('achievement_id').references(() => achievements.id).notNull(),
  progress: integer('progress').default(0),
  unlockedAt: timestamp('unlocked_at'),
  createdAt: timestamp('created_at').defaultNow(),
});
