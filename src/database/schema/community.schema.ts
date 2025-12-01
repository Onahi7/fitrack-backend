import { pgTable, serial, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  type: text('type').notNull(), // 'dynamic', 'water', 'meals', 'streak', 'custom'
  goal: integer('goal').notNull(),
  duration: integer('duration').notNull(), // in days
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  participantCount: integer('participant_count').default(0).notNull(),
  creatorId: text('creator_id').references(() => users.id).notNull(),
  imageUrl: text('image_url'),
  isPublic: boolean('is_public').default(false).notNull(), // false = private to creator
  inviteOnly: boolean('invite_only').default(true).notNull(), // true = users need invite to join
  isPremiumChallenge: boolean('is_premium_challenge').default(false).notNull(), // grants premium on join
  requiresSubscription: boolean('requires_subscription').default(false).notNull(), // requires active subscription
  subscriptionTier: text('subscription_tier'), // 'basic', 'premium', 'pro' - required tier if requiresSubscription is true
  gift30Days: boolean('gift_30_days').default(false).notNull(), // gift 30 days subscription on join
  hasDynamicTasks: boolean('has_dynamic_tasks').default(false).notNull(), // has daily task assignments
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const challengeInvites = pgTable('challenge_invites', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  inviterId: text('inviter_id').references(() => users.id).notNull(),
  inviteeId: text('invitee_id').references(() => users.id).notNull(),
  status: text('status').default('pending').notNull(), // 'pending', 'accepted', 'declined'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
});

export const challengeParticipants = pgTable('challenge_participants', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  progress: integer('progress').default(0).notNull(),
  completed: boolean('completed').default(false).notNull(),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const challengeCheckIns = pgTable('challenge_check_ins', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  date: timestamp('date').notNull(),
  goalMet: boolean('goal_met').notNull(),
  value: integer('value').notNull(), // actual value achieved (glasses, meals, etc)
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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

export const challengeBannerDismissals = pgTable('challenge_banner_dismissals', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  dismissedAt: timestamp('dismissed_at').defaultNow().notNull(),
});

export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  startTime: timestamp('start_time').defaultNow().notNull(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
});

export const challengeDailyTasks = pgTable('challenge_daily_tasks', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  taskType: text('task_type').notNull(), // 'exercise', 'meal', 'fasting', 'sleep', 'water', 'custom'
  title: text('title').notNull(),
  description: text('description'),
  targetValue: integer('target_value'), // target minutes, reps, glasses, etc
  targetUnit: text('target_unit'), // 'minutes', 'reps', 'glasses', 'hours', 'calories'
  exerciseType: text('exercise_type'), // 'cardio', 'strength', 'yoga', 'running', 'walking'
  mealType: text('meal_type'), // 'breakfast', 'lunch', 'dinner', 'snack'
  fastingType: text('fasting_type'), // '16:8', '18:6', '24h', 'custom'
  isRequired: boolean('is_required').default(true).notNull(),
  points: integer('points').default(1).notNull(), // points awarded for completion
  dayOfChallenge: integer('day_of_challenge'), // specific day (1-30) or null for all days
  taskDate: timestamp('task_date'), // specific date for daily tasks
  isActive: boolean('is_active').default(true).notNull(),
  totalParticipants: integer('total_participants').default(0).notNull(),
  completedCount: integer('completed_count').default(0).notNull(),
  engagementRate: integer('engagement_rate').default(0).notNull(), // percentage (0-100)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const challengeTaskCompletions = pgTable('challenge_task_completions', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').references(() => challenges.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  taskId: integer('task_id').references(() => challengeDailyTasks.id).notNull(),
  completedDate: timestamp('completed_date').notNull(),
  actualValue: integer('actual_value'), // actual minutes, reps, glasses achieved
  notes: text('notes'),
  points: integer('points').default(0).notNull(),
  isCompleted: boolean('is_completed').default(true).notNull(),
  completionTime: timestamp('completion_time'), // when actually completed
  timeSpent: integer('time_spent'), // time spent on task in minutes
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
