import { Injectable, Logger } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { achievements, userAchievements, streaks } from '../database/schema';
import { eq, and, count, gte } from 'drizzle-orm';
import { CreateAchievementDto } from './dto';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private drizzle: DrizzleService) {}

  /**
   * Initialize default achievements
   */
  async seedAchievements() {
    const defaultAchievements = [
      {
        name: 'Quick Start',
        description: 'Complete your first week',
        category: 'streak',
        icon: 'Zap',
        requirement: 7,
      },
      {
        name: '14-Day Streak',
        description: 'Check in for 14 consecutive days',
        category: 'streak',
        icon: 'Flame',
        requirement: 14,
      },
      {
        name: '30-Day Challenge',
        description: 'Maintain a 30-day streak',
        category: 'streak',
        icon: 'Trophy',
        requirement: 30,
      },
      {
        name: '100 Day Journey',
        description: 'Check in for 100 days',
        category: 'streak',
        icon: 'CheckCircle',
        requirement: 100,
      },
      {
        name: 'First Milestone',
        description: 'Lose your first 5 pounds',
        category: 'weight',
        icon: 'Target',
        requirement: 5,
      },
      {
        name: 'Goal Crusher',
        description: 'Reach your target weight',
        category: 'weight',
        icon: 'Trophy',
        requirement: 20,
      },
      {
        name: 'Consistency King',
        description: 'Log meals 7 days in a row',
        category: 'consistency',
        icon: 'Award',
        requirement: 7,
      },
      {
        name: 'Photo Logger',
        description: 'Upload 50 meal photos',
        category: 'consistency',
        icon: 'Star',
        requirement: 50,
      },
      {
        name: 'Health Champion',
        description: 'Complete 10 weekly check-ins',
        category: 'consistency',
        icon: 'Heart',
        requirement: 10,
      },
      {
        name: 'Community Helper',
        description: 'Support 5 accountability buddies',
        category: 'community',
        icon: 'Users',
        requirement: 5,
      },
    ];

    for (const achievement of defaultAchievements) {
      const [existing] = await this.drizzle.db
        .select()
        .from(achievements)
        .where(eq(achievements.name, achievement.name))
        .limit(1);

      if (!existing) {
        await this.drizzle.db.insert(achievements).values(achievement);
      }
    }

    this.logger.log('Default achievements seeded');
  }

  /**
   * Get all achievements
   */
  async getAllAchievements() {
    return this.drizzle.db.select().from(achievements);
  }

  /**
   * Get user's achievements with progress
   */
  async getUserAchievements(userId: string) {
    const allAchievements = await this.getAllAchievements();
    
    const userAchievementRecords = await this.drizzle.db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.userId, userId));

    return allAchievements.map(achievement => {
      const userRecord = userAchievementRecords.find(
        ua => ua.achievementId === achievement.id
      );

      return {
        ...achievement,
        progress: userRecord?.progress || 0,
        unlocked: !!userRecord?.unlockedAt,
        unlockedAt: userRecord?.unlockedAt,
      };
    });
  }

  /**
   * Update achievement progress
   */
  async updateProgress(userId: string, achievementId: number, progress: number) {
    const [achievement] = await this.drizzle.db
      .select()
      .from(achievements)
      .where(eq(achievements.id, achievementId))
      .limit(1);

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const [existing] = await this.drizzle.db
      .select()
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievementId)
        )
      )
      .limit(1);

    // Check if achievement is now unlocked
    const unlocked = progress >= achievement.requirement;
    const wasUnlocked = !!existing?.unlockedAt;

    if (existing) {
      // Update existing record
      await this.drizzle.db
        .update(userAchievements)
        .set({
          progress,
          unlockedAt: unlocked && !wasUnlocked ? new Date() : existing.unlockedAt,
        })
        .where(eq(userAchievements.id, existing.id));
    } else {
      // Create new record
      await this.drizzle.db.insert(userAchievements).values({
        userId,
        achievementId,
        progress,
        unlockedAt: unlocked ? new Date() : null,
      });
    }

    // If newly unlocked, log it
    if (unlocked && !wasUnlocked) {
      this.logger.log(`🏆 User ${userId} unlocked achievement: ${achievement.name}`);
      return { unlocked: true, achievement };
    }

    return { unlocked: false, achievement, progress };
  }

  /**
   * Check and update streak-based achievements
   */
  async checkStreakAchievements(userId: string) {
    // Get user's current streak count
    const streakRecords = await this.drizzle.db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));

    const currentStreak = streakRecords.length;

    // Get all streak achievements
    const streakAchievements = await this.drizzle.db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'streak'));

    // Update progress for each streak achievement
    for (const achievement of streakAchievements) {
      await this.updateProgress(userId, achievement.id, currentStreak);
    }
  }

  /**
   * Check and update consistency-based achievements
   */
  async checkConsistencyAchievements(userId: string) {
    // Count total meal logs by checking current streak for meal type
    const [mealStreak] = await this.drizzle.db
      .select()
      .from(streaks)
      .where(
        and(
          eq(streaks.userId, userId),
          eq(streaks.type, 'meal')
        )
      )
      .limit(1);

    const mealCount = mealStreak?.currentStreak || 0;

    // Get consistency achievements
    const consistencyAchievements = await this.drizzle.db
      .select()
      .from(achievements)
      .where(eq(achievements.category, 'consistency'));

    for (const achievement of consistencyAchievements) {
      if (achievement.name === 'Consistency King') {
        await this.updateProgress(userId, achievement.id, mealCount);
      }
    }
  }
}
