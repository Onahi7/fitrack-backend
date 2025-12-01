import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { DrizzleService } from '../database/drizzle.service';
import {
  challenges,
  challengeParticipants,
  challengeCheckIns,
  challengeBannerDismissals,
  userSessions,
  challengeDailyTasks,
  challengeTaskCompletions,
  waterLogs,
  meals,
  streaks,
  users,
  subscriptions,
} from '../database/schema';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { eq, desc, and, sql, gte, lte, between, or, isNull } from 'drizzle-orm';

@Injectable()
export class ChallengesService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly configService: ConfigService,
  ) {
    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async create(userId: string, createChallengeDto: CreateChallengeDto) {
    const startDate = new Date(createChallengeDto.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + createChallengeDto.duration);

    const [challenge] = await this.drizzle.db
      .insert(challenges)
      .values({
        ...createChallengeDto,
        startDate,
        endDate,
        creatorId: userId,
        isPublic: false, // Private by default
        inviteOnly: true, // Invite only by default
      })
      .returning();

    // Auto-join creator
    await this.join(challenge.id, userId);

    return challenge;
  }

  async createAdminChallenge(
    userId: string,
    createChallengeDto: CreateChallengeDto,
    file?: Express.Multer.File,
  ) {
    const startDate = new Date(createChallengeDto.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + createChallengeDto.duration);

    let imageUrl = createChallengeDto.imageUrl;

    // Upload image to Cloudinary if file is provided
    if (file) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'challenges',
            transformation: [
              { width: 800, height: 600, crop: 'fill' },
              { quality: 'auto' },
            ],
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        uploadStream.end(file.buffer);
      });
      imageUrl = uploadResult.secure_url;
    }

    const [challenge] = await this.drizzle.db
      .insert(challenges)
      .values({
        name: createChallengeDto.name,
        description: createChallengeDto.description,
        type: createChallengeDto.type,
        goal: createChallengeDto.goal,
        duration: createChallengeDto.duration,
        startDate,
        endDate,
        creatorId: userId,
        imageUrl,
        isPublic: true, // Admin challenges are public
        inviteOnly: false, // Anyone can join
        isPremiumChallenge: createChallengeDto.isPremiumChallenge || false,
        requiresSubscription: createChallengeDto.requiresSubscription || false,
        subscriptionTier: createChallengeDto.subscriptionTier,
        gift30Days: createChallengeDto.gift30Days || false,
        hasDynamicTasks: createChallengeDto.hasDynamicTasks || false,
      })
      .returning();

    // Create daily tasks if provided
    if (createChallengeDto.dailyTasks && createChallengeDto.dailyTasks.length > 0) {
      const tasksToInsert = createChallengeDto.dailyTasks.map(task => ({
        challengeId: challenge.id,
        taskType: task.taskType,
        title: task.title,
        description: task.description,
        targetValue: task.targetValue,
        targetUnit: task.targetUnit,
        exerciseType: task.exerciseType,
        mealType: task.mealType,
        fastingType: task.fastingType,
        isRequired: task.isRequired ?? true,
        points: task.points ?? 1,
        dayOfChallenge: task.dayOfChallenge,
      }));

      await this.drizzle.db.insert(challengeDailyTasks).values(tasksToInsert);
    }

    return challenge;
  }

  async findAll(userId: string, limit = 50, offset = 0) {
    // Only show:
    // 1. Challenges created by the user
    // 2. Challenges the user is participating in
    // 3. Public challenges (if we add that feature later)
    const userChallenges = await this.drizzle.db
      .select({
        id: challenges.id,
        name: challenges.name,
        description: challenges.description,
        type: challenges.type,
        goal: challenges.goal,
        duration: challenges.duration,
        startDate: challenges.startDate,
        endDate: challenges.endDate,
        participantCount: challenges.participantCount,
        creatorId: challenges.creatorId,
        imageUrl: challenges.imageUrl,
        isPublic: challenges.isPublic,
        inviteOnly: challenges.inviteOnly,
        createdAt: challenges.createdAt,
        isParticipant: sql<boolean>`EXISTS (
          SELECT 1 FROM ${challengeParticipants}
          WHERE ${challengeParticipants.challengeId} = ${challenges.id}
          AND ${challengeParticipants.userId} = ${userId}
        )`,
        isCreator: sql<boolean>`${challenges.creatorId} = ${userId}`,
      })
      .from(challenges)
      .where(
        sql`${challenges.creatorId} = ${userId} OR EXISTS (
          SELECT 1 FROM ${challengeParticipants}
          WHERE ${challengeParticipants.challengeId} = ${challenges.id}
          AND ${challengeParticipants.userId} = ${userId}
        )`
      )
      .orderBy(desc(challenges.createdAt))
      .limit(limit)
      .offset(offset);

    return userChallenges;
  }

  async findOne(id: number) {
    const [challenge] = await this.drizzle.db
      .select()
      .from(challenges)
      .where(eq(challenges.id, id))
      .limit(1);

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    return challenge;
  }

  async join(challengeId: number, userId: string) {
    // Check if already joined
    const existing = await this.drizzle.db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return { message: 'Already joined' };
    }

    // Get challenge and user details
    const challenge = await this.findOne(challengeId);
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Check subscription requirements
    if (challenge.requiresSubscription) {
      const hasRequiredSubscription = this.checkSubscriptionAccess(user, challenge.subscriptionTier || 'basic');
      if (!hasRequiredSubscription) {
        throw new Error(`This challenge requires ${challenge.subscriptionTier || 'basic'} subscription`);
      }
    }

    await this.drizzle.db.insert(challengeParticipants).values({
      challengeId,
      userId,
    });

    await this.drizzle.db
      .update(challenges)
      .set({ participantCount: sql`${challenges.participantCount} + 1` })
      .where(eq(challenges.id, challengeId));

    let message = 'Joined successfully';

    // Handle different types of access granting
    if (challenge.isPremiumChallenge) {
      // Grant premium subscription via subscriptions table
      await this.drizzle.db
        .insert(subscriptions)
        .values({
          userId: userId,
          tier: 'premium' as const,
          status: 'active' as const,
          startDate: new Date(),
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            tier: 'premium' as const,
            status: 'active' as const,
            startDate: new Date(),
            updatedAt: new Date(),
          },
        });
      
      message = 'Joined successfully and premium access granted!';
    } else if (challenge.gift30Days) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
      
      // Ensure valid tier value from enum
      const validTier = ['free', 'premium', 'pro'].includes(challenge.subscriptionTier) 
        ? challenge.subscriptionTier as 'free' | 'premium' | 'pro'
        : 'premium' as const;
      
      // Grant 30-day subscription via subscriptions table
      await this.drizzle.db
        .insert(subscriptions)
        .values({
          userId: userId,
          tier: validTier,
          status: 'active' as const,
          startDate: new Date(),
          endDate: expiryDate,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            tier: validTier,
            status: 'active' as const,
            startDate: new Date(),
            endDate: expiryDate,
            updatedAt: new Date(),
          },
        });
      
      message = 'Joined successfully and received 30 days premium access!';
    }

    return { message };
  }

  private checkSubscriptionAccess(user: any, requiredTier: string): boolean {
    if (!user.subscriptionStatus || user.subscriptionStatus !== 'active') {
      return false;
    }

    const tierHierarchy = { 'basic': 1, 'premium': 2, 'pro': 3 };
    const userTierLevel = tierHierarchy[user.subscriptionTier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 1;

    return userTierLevel >= requiredTierLevel;
  }

  async updateProgress(challengeId: number, userId: string, progress: number) {
    const [participant] = await this.drizzle.db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId),
        ),
      )
      .limit(1);

    if (!participant) {
      throw new NotFoundException('Not a participant');
    }

    const challenge = await this.findOne(challengeId);
    const completed = progress >= challenge.goal;

    await this.drizzle.db
      .update(challengeParticipants)
      .set({ progress, completed })
      .where(eq(challengeParticipants.id, participant.id));

    return { progress, completed };
  }

  // Auto-calculate progress based on actual fitness data
  async syncChallengeProgress(challengeId: number, userId: string, date: Date) {
    const challenge = await this.findOne(challengeId);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let value = 0;
    let goalMet = false;

    switch (challenge.type) {
      case 'water': {
        // Sum glasses of water for the day
        const logs = await this.drizzle.db
          .select()
          .from(waterLogs)
          .where(
            and(
              eq(waterLogs.userId, userId),
              between(waterLogs.date, startOfDay, endOfDay),
            ),
          );
        value = logs.reduce((sum, log) => sum + log.glasses, 0);
        goalMet = value >= challenge.goal;
        break;
      }
      case 'meals': {
        // Count meals logged for the day
        const mealLogs = await this.drizzle.db
          .select()
          .from(meals)
          .where(
            and(
              eq(meals.userId, userId),
              between(meals.date, startOfDay, endOfDay),
            ),
          );
        value = mealLogs.length;
        goalMet = value >= challenge.goal;
        break;
      }
      case 'streak': {
        // Check current streak
        const [userStreak] = await this.drizzle.db
          .select()
          .from(streaks)
          .where(
            and(
              eq(streaks.userId, userId),
              eq(streaks.type, 'overall'),
            ),
          )
          .limit(1);
        value = userStreak?.currentStreak || 0;
        goalMet = value >= challenge.goal;
        break;
      }
      default:
        // Custom challenges still use manual progress
        return;
    }

    // Record the check-in
    await this.drizzle.db.insert(challengeCheckIns).values({
      challengeId,
      userId,
      date: startOfDay,
      goalMet,
      value,
    });

    // Update overall progress (days goal was met)
    const checkIns = await this.drizzle.db
      .select()
      .from(challengeCheckIns)
      .where(
        and(
          eq(challengeCheckIns.challengeId, challengeId),
          eq(challengeCheckIns.userId, userId),
          eq(challengeCheckIns.goalMet, true),
        ),
      );

    const progress = checkIns.length;
    const completed = progress >= challenge.duration;

    await this.drizzle.db
      .update(challengeParticipants)
      .set({ progress, completed })
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId),
        ),
      );

    return { progress, value, goalMet, completed };
  }

  // Get detailed progress history for a user in a challenge
  async getChallengeProgress(challengeId: number, userId: string) {
    const challenge = await this.findOne(challengeId);
    const checkIns = await this.drizzle.db
      .select()
      .from(challengeCheckIns)
      .where(
        and(
          eq(challengeCheckIns.challengeId, challengeId),
          eq(challengeCheckIns.userId, userId),
        ),
      )
      .orderBy(desc(challengeCheckIns.date));

    return {
      challenge,
      checkIns,
      daysCompleted: checkIns.filter((c) => c.goalMet).length,
      totalDays: challenge.duration,
    };
  }

  async getLeaderboard(challengeId: number) {
    return this.drizzle.db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId))
      .orderBy(desc(challengeParticipants.progress));
  }

  async getUserChallenges(userId: string) {
    return this.drizzle.db
      .select({
        challenge: challenges,
        participation: challengeParticipants,
      })
      .from(challengeParticipants)
      .innerJoin(
        challenges,
        eq(challengeParticipants.challengeId, challenges.id),
      )
      .where(eq(challengeParticipants.userId, userId))
      .orderBy(desc(challenges.createdAt));
  }

  async delete(id: number) {
    // Delete related records first
    await this.drizzle.db
      .delete(challengeCheckIns)
      .where(eq(challengeCheckIns.challengeId, id));
    
    await this.drizzle.db
      .delete(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, id));
    
    await this.drizzle.db
      .delete(challenges)
      .where(eq(challenges.id, id));

    return { message: 'Challenge deleted successfully' };
  }

  async getAdminStats() {
    const totalChallenges = await this.drizzle.db
      .select({ count: sql`count(*)` })
      .from(challenges);

    const activeChallenges = await this.drizzle.db
      .select({ count: sql`count(*)` })
      .from(challenges)
      .where(
        and(
          lte(challenges.startDate, new Date()),
          gte(challenges.endDate, new Date())
        )
      );

    const totalParticipants = await this.drizzle.db
      .select({ count: sql`count(*)` })
      .from(challengeParticipants);

    const completionRate = await this.drizzle.db
      .select({
        completed: sql`count(*) filter (where completed = true)`,
        total: sql`count(*)`,
      })
      .from(challengeParticipants);

    return {
      totalChallenges: Number(totalChallenges[0]?.count || 0),
      activeChallenges: Number(activeChallenges[0]?.count || 0),
      totalParticipants: Number(totalParticipants[0]?.count || 0),
      completionRate: completionRate[0] ? 
        Number(completionRate[0].completed) / Number(completionRate[0].total) * 100 : 0,
    };
  }

  async getPremiumBanners(userId: string) {
    // Get active premium challenges that user hasn't joined
    const premiumChallenges = await this.drizzle.db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.isPremiumChallenge, true),
          eq(challenges.isPublic, true),
          lte(challenges.startDate, new Date()),
          gte(challenges.endDate, new Date()),
          sql`NOT EXISTS (
            SELECT 1 FROM ${challengeParticipants}
            WHERE ${challengeParticipants.challengeId} = ${challenges.id}
            AND ${challengeParticipants.userId} = ${userId}
          )`,
          sql`NOT EXISTS (
            SELECT 1 FROM ${challengeBannerDismissals}
            WHERE ${challengeBannerDismissals.challengeId} = ${challenges.id}
            AND ${challengeBannerDismissals.userId} = ${userId}
          )`
        )
      );

    return premiumChallenges;
  }

  async dismissBanner(challengeId: number, userId: string) {
    await this.drizzle.db.insert(challengeBannerDismissals).values({
      challengeId,
      userId,
    });

    return { message: 'Banner dismissed' };
  }

  async trackUserSession(userId: string) {
    // Update or create user session
    const now = new Date();
    
    // Try to update existing session (within last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    
    const existingSession = await this.drizzle.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          gte(userSessions.lastActivity, thirtyMinutesAgo)
        )
      )
      .limit(1);

    if (existingSession.length > 0) {
      // Update existing session
      await this.drizzle.db
        .update(userSessions)
        .set({ lastActivity: now })
        .where(eq(userSessions.id, existingSession[0].id));
    } else {
      // Create new session
      await this.drizzle.db.insert(userSessions).values({
        userId,
        startTime: now,
        lastActivity: now,
      });
    }

    return { message: 'Session tracked' };
  }

  async getChallengeTasks(challengeId: number, dayOfChallenge?: number) {
    const whereClause = dayOfChallenge 
      ? and(
          eq(challengeDailyTasks.challengeId, challengeId),
          eq(challengeDailyTasks.isActive, true),
          or(
            eq(challengeDailyTasks.dayOfChallenge, dayOfChallenge),
            sql`${challengeDailyTasks.dayOfChallenge} IS NULL`
          )
        )
      : and(
          eq(challengeDailyTasks.challengeId, challengeId),
          eq(challengeDailyTasks.isActive, true)
        );

    return this.drizzle.db
      .select()
      .from(challengeDailyTasks)
      .where(whereClause)
      .orderBy(challengeDailyTasks.taskType, challengeDailyTasks.id);
  }

  async completeTask(challengeId: number, taskId: number, userId: string, actualValue?: number, notes?: string) {
    // Check if user is participant
    const participant = await this.drizzle.db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      throw new Error('Not a participant of this challenge');
    }

    // Get task details
    const [task] = await this.drizzle.db
      .select()
      .from(challengeDailyTasks)
      .where(eq(challengeDailyTasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new Error('Task not found');
    }

    // Check if already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await this.drizzle.db
      .select()
      .from(challengeTaskCompletions)
      .where(
        and(
          eq(challengeTaskCompletions.challengeId, challengeId),
          eq(challengeTaskCompletions.userId, userId),
          eq(challengeTaskCompletions.taskId, taskId),
          gte(challengeTaskCompletions.completedDate, today),
          sql`${challengeTaskCompletions.completedDate} < ${tomorrow}`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing completion
      const [updated] = await this.drizzle.db
        .update(challengeTaskCompletions)
        .set({
          actualValue,
          notes,
          completedDate: new Date(),
        })
        .where(eq(challengeTaskCompletions.id, existing[0].id))
        .returning();

      return updated;
    } else {
      // Create new completion
      const [completion] = await this.drizzle.db
        .insert(challengeTaskCompletions)
        .values({
          challengeId,
          userId,
          taskId,
          completedDate: new Date(),
          actualValue,
          notes,
          points: task.points,
        })
        .returning();

      return completion;
    }
  }

  async getUserTaskCompletions(challengeId: number, userId: string, date?: Date) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    return this.drizzle.db
      .select({
        completion: challengeTaskCompletions,
        task: challengeDailyTasks,
      })
      .from(challengeTaskCompletions)
      .innerJoin(
        challengeDailyTasks,
        eq(challengeTaskCompletions.taskId, challengeDailyTasks.id)
      )
      .where(
        and(
          eq(challengeTaskCompletions.challengeId, challengeId),
          eq(challengeTaskCompletions.userId, userId),
          gte(challengeTaskCompletions.completedDate, targetDate),
          sql`${challengeTaskCompletions.completedDate} < ${nextDay}`
        )
      );
  }

  async activateFastingTimer(challengeId: number, userId: string, fastingType: string) {
    // This would integrate with your existing fasting timer system
    // For now, we'll create a fasting task completion
    const fastingTask = await this.drizzle.db
      .select()
      .from(challengeDailyTasks)
      .where(
        and(
          eq(challengeDailyTasks.challengeId, challengeId),
          eq(challengeDailyTasks.taskType, 'fasting'),
          eq(challengeDailyTasks.fastingType, fastingType)
        )
      )
      .limit(1);

    if (fastingTask.length === 0) {
      throw new Error('Fasting task not found for this challenge');
    }

    // Start fasting timer (integrate with your fasting service)
    return {
      message: 'Fasting timer activated',
      taskId: fastingTask[0].id,
      fastingType,
    };
  }

  async createDailyTask(challengeId: number, taskData: {
    taskType: string;
    title: string;
    description?: string;
    targetValue?: number;
    targetUnit?: string;
    exerciseType?: string;
    mealType?: string;
    fastingType?: string;
    isRequired?: boolean;
    points?: number;
    taskDate?: Date;
    dayOfChallenge?: number;
  }) {
    // Get challenge participants count for engagement tracking
    const participantsResult = await this.drizzle.db
      .select({ count: sql<number>`count(*)::int` })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));

    const totalParticipants = participantsResult[0]?.count || 0;

    const [task] = await this.drizzle.db
      .insert(challengeDailyTasks)
      .values({
        challengeId,
        taskType: taskData.taskType,
        title: taskData.title,
        description: taskData.description,
        targetValue: taskData.targetValue,
        targetUnit: taskData.targetUnit,
        exerciseType: taskData.exerciseType,
        mealType: taskData.mealType,
        fastingType: taskData.fastingType,
        isRequired: taskData.isRequired ?? true,
        points: taskData.points ?? 10,
        taskDate: taskData.taskDate ? sql`${taskData.taskDate}::date` : null,
        dayOfChallenge: taskData.dayOfChallenge,
        totalParticipants,
        completedCount: 0,
        engagementRate: 0,
      })
      .returning();

    return task;
  }

  async getDailyTaskEngagement(challengeId: number, date?: Date) {
    const targetDate = date || new Date();
    const dateString = targetDate.toISOString().split('T')[0];

    const tasks = await this.drizzle.db
      .select({
        id: challengeDailyTasks.id,
        title: challengeDailyTasks.title,
        taskType: challengeDailyTasks.taskType,
        isRequired: challengeDailyTasks.isRequired,
        totalParticipants: challengeDailyTasks.totalParticipants,
        completedCount: challengeDailyTasks.completedCount,
        engagementRate: challengeDailyTasks.engagementRate,
        points: challengeDailyTasks.points,
        createdAt: challengeDailyTasks.createdAt,
        targetValue: challengeDailyTasks.targetValue,
        targetUnit: challengeDailyTasks.targetUnit,
        exerciseType: challengeDailyTasks.exerciseType,
        mealType: challengeDailyTasks.mealType,
        fastingType: challengeDailyTasks.fastingType,
      })
      .from(challengeDailyTasks)
      .where(
        and(
          eq(challengeDailyTasks.challengeId, challengeId),
          eq(challengeDailyTasks.isActive, true),
          or(
            sql`DATE(${challengeDailyTasks.taskDate}) = ${dateString}`,
            isNull(challengeDailyTasks.taskDate)
          )
        )
      )
      .orderBy(desc(challengeDailyTasks.createdAt));

    return tasks;
  }

  async updateTaskEngagement(taskId: number) {
    // Get completion stats for this task
    const completionStats = await this.drizzle.db
      .select({
        completedCount: sql<number>`count(*)::int`,
      })
      .from(challengeTaskCompletions)
      .where(
        and(
          eq(challengeTaskCompletions.taskId, taskId),
          eq(challengeTaskCompletions.isCompleted, true)
        )
      );

    const completedCount = completionStats[0]?.completedCount || 0;

    // Get total participants for this task's challenge
    const taskInfo = await this.drizzle.db
      .select({
        challengeId: challengeDailyTasks.challengeId,
        totalParticipants: challengeDailyTasks.totalParticipants,
      })
      .from(challengeDailyTasks)
      .where(eq(challengeDailyTasks.id, taskId))
      .limit(1);

    if (taskInfo.length === 0) {
      throw new Error('Task not found');
    }

    const { totalParticipants } = taskInfo[0];
    const engagementRate = totalParticipants > 0 
      ? Math.round((completedCount / totalParticipants) * 100)
      : 0;

    // Update task engagement stats
    await this.drizzle.db
      .update(challengeDailyTasks)
      .set({
        completedCount,
        engagementRate,
        updatedAt: new Date(),
      })
      .where(eq(challengeDailyTasks.id, taskId));

    return {
      taskId,
      completedCount,
      totalParticipants,
      engagementRate,
    };
  }

  async getTaskCompletionDetails(taskId: number) {
    const completions = await this.drizzle.db
      .select({
        id: challengeTaskCompletions.id,
        userId: challengeTaskCompletions.userId,
        actualValue: challengeTaskCompletions.actualValue,
        notes: challengeTaskCompletions.notes,
        points: challengeTaskCompletions.points,
        completedDate: challengeTaskCompletions.completedDate,
        completionTime: challengeTaskCompletions.completionTime,
        timeSpent: challengeTaskCompletions.timeSpent,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(challengeTaskCompletions)
      .leftJoin(users, eq(challengeTaskCompletions.userId, users.id))
      .where(
        and(
          eq(challengeTaskCompletions.taskId, taskId),
          eq(challengeTaskCompletions.isCompleted, true)
        )
      )
      .orderBy(desc(challengeTaskCompletions.completedDate));

    return completions;
  }

}
