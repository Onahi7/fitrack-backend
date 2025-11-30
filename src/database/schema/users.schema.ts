import { pgTable, text, timestamp, numeric, boolean, serial } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase UID
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  startingWeight: numeric('starting_weight', { precision: 5, scale: 2 }),
  currentWeight: numeric('current_weight', { precision: 5, scale: 2 }),
  goalWeight: numeric('goal_weight', { precision: 5, scale: 2 }),
  height: numeric('height', { precision: 5, scale: 2 }),
  dailyCalorieGoal: numeric('daily_calorie_goal', { precision: 6, scale: 2 }),
  dailyWaterGoal: numeric('daily_water_goal', { precision: 3, scale: 1 }).default('8'),
  setupCompleted: boolean('setup_completed').default(false),
  
  // User preferences and settings
  tutorialCompleted: boolean('tutorial_completed').default(false),
  fastingProtocol: text('fasting_protocol').default('16:8'),
  fastingStartTime: timestamp('fasting_start_time'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
