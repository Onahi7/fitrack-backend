import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'water', 'meals', 'streak', 'custom'
  goal: integer('goal').notNull(),
  duration: integer('duration').notNull(), // in days
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  participantCount: integer('participant_count').default(0).notNull(),
  creatorId: text('creator_id').references(() => users.id).notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengeParticipants = pgTable('challenge_participants', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  progress: integer('progress').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const groups = pgTable('groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  imageUrl: text('image_url'),
  memberCount: integer('member_count').default(0).notNull(),
  creatorId: text('creator_id').references(() => users.id).notNull(),
  isPrivate: boolean('is_private').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const groupMembers = pgTable('group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').references(() => groups.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  role: text('role').default('member').notNull(), // 'admin', 'moderator', 'member'
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});
