import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import {
  challenges,
  challengeParticipants,
  challengeCheckIns,
  waterLogs,
  meals,
  streaks,
} from '../database/schema';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { eq, desc, and, sql, gte, lte, between } from 'drizzle-orm';

@Injectable()
export class ChallengesService {
  constructor(private readonly drizzle: DrizzleService) {}

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

  async createAdminChallenge(userId: string, createChallengeDto: CreateChallengeDto) {
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
        isPublic: true, // Admin challenges are public
        inviteOnly: false, // Anyone can join
      })
      .returning();

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

    await this.drizzle.db.insert(challengeParticipants).values({
      challengeId,
      userId,
    });

    await this.drizzle.db
      .update(challenges)
      .set({ participantCount: sql`${challenges.participantCount} + 1` })
      .where(eq(challenges.id, challengeId));

    return { message: 'Joined successfully' };
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
}
