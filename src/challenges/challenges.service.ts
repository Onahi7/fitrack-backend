import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { challenges, challengeParticipants } from '../database/schema';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { eq, desc, and, sql } from 'drizzle-orm';

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
      })
      .returning();

    // Auto-join creator
    await this.join(challenge.id, userId);

    return challenge;
  }

  async findAll(limit = 50, offset = 0) {
    return this.drizzle.db
      .select()
      .from(challenges)
      .orderBy(desc(challenges.createdAt))
      .limit(limit)
      .offset(offset);
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
}
