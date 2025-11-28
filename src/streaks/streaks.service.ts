import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { streaks } from '../database/schema';
import { eq, and } from 'drizzle-orm';
import { differenceInDays } from 'date-fns';

@Injectable()
export class StreaksService {
  constructor(private drizzle: DrizzleService) {}

  async getAllStreaks(userId: string) {
    return this.drizzle.db
      .select()
      .from(streaks)
      .where(eq(streaks.userId, userId));
  }

  async getStreakByType(userId: string, type: string) {
    const [streak] = await this.drizzle.db
      .select()
      .from(streaks)
      .where(and(eq(streaks.userId, userId), eq(streaks.type, type)))
      .limit(1);

    if (!streak) {
      // Create new streak
      const [newStreak] = await this.drizzle.db
        .insert(streaks)
        .values({
          userId,
          type,
          currentStreak: 0,
          longestStreak: 0,
        })
        .returning();
      return newStreak;
    }

    return streak;
  }

  async checkIn(userId: string, type: string) {
    const streak = await this.getStreakByType(userId, type);
    const now = new Date();
    const lastCheckIn = streak.lastCheckIn ? new Date(streak.lastCheckIn) : null;

    let newCurrentStreak = streak.currentStreak || 0;

    if (!lastCheckIn) {
      // First check-in
      newCurrentStreak = 1;
    } else {
      const daysDifference = differenceInDays(now, lastCheckIn);

      if (daysDifference === 0) {
        // Already checked in today
        return streak;
      } else if (daysDifference === 1) {
        // Consecutive day
        newCurrentStreak += 1;
      } else {
        // Streak broken
        newCurrentStreak = 1;
      }
    }

    const newLongestStreak = Math.max(
      newCurrentStreak,
      streak.longestStreak || 0,
    );

    const [updatedStreak] = await this.drizzle.db
      .update(streaks)
      .set({
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastCheckIn: now,
        updatedAt: now,
      })
      .where(eq(streaks.id, streak.id))
      .returning();

    return updatedStreak;
  }
}
