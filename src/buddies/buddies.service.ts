import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { buddyPairs, users } from '../database/schema';
import { eq, or, and } from 'drizzle-orm';
import { CreateBuddyRequestDto, UpdateBuddyDto } from './dto';

@Injectable()
export class BuddiesService {
  constructor(private drizzle: DrizzleService) {}

  /**
   * Send a buddy request
   */
  async sendBuddyRequest(userId: string, dto: CreateBuddyRequestDto) {
    // Check if target user exists
    const [targetUser] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, dto.targetUserId))
      .limit(1);

    if (!targetUser) {
      throw new NotFoundException('Target user not found');
    }

    // Check if buddy pair already exists
    const [existingPair] = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(
        or(
          and(
            eq(buddyPairs.user1Id, userId),
            eq(buddyPairs.user2Id, dto.targetUserId)
          ),
          and(
            eq(buddyPairs.user1Id, dto.targetUserId),
            eq(buddyPairs.user2Id, userId)
          )
        )
      )
      .limit(1);

    if (existingPair) {
      throw new BadRequestException('Buddy request already exists');
    }

    // Create buddy pair
    const [buddyPair] = await this.drizzle.db
      .insert(buddyPairs)
      .values({
        user1Id: userId,
        user2Id: dto.targetUserId,
        status: 'pending',
        sharedGoals: dto.sharedGoals || [],
        privacySettings: {},
      })
      .returning();

    return buddyPair;
  }

  /**
   * Accept a buddy request
   */
  async acceptBuddyRequest(userId: string, buddyPairId: number) {
    const [buddyPair] = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(eq(buddyPairs.id, buddyPairId))
      .limit(1);

    if (!buddyPair) {
      throw new NotFoundException('Buddy request not found');
    }

    // Ensure the user is the receiver of the request
    if (buddyPair.user2Id !== userId) {
      throw new BadRequestException('You can only accept requests sent to you');
    }

    // Update status to active
    const [updated] = await this.drizzle.db
      .update(buddyPairs)
      .set({
        status: 'active',
        acceptedAt: new Date(),
      })
      .where(eq(buddyPairs.id, buddyPairId))
      .returning();

    return updated;
  }

  /**
   * Reject or remove a buddy request/pair
   */
  async rejectBuddyRequest(userId: string, buddyPairId: number) {
    const [buddyPair] = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(eq(buddyPairs.id, buddyPairId))
      .limit(1);

    if (!buddyPair) {
      throw new NotFoundException('Buddy request not found');
    }

    // Ensure the user is involved in this pair
    if (buddyPair.user1Id !== userId && buddyPair.user2Id !== userId) {
      throw new BadRequestException('You are not part of this buddy pair');
    }

    // Delete the buddy pair
    await this.drizzle.db
      .delete(buddyPairs)
      .where(eq(buddyPairs.id, buddyPairId));

    return { message: 'Buddy request removed successfully' };
  }

  /**
   * Get all buddy requests (pending)
   */
  async getPendingRequests(userId: string) {
    console.log('[BuddiesService] Getting pending requests for user:', userId);
    
    const requests = await this.drizzle.db
      .select({
        id: buddyPairs.id,
        user: users,
        sharedGoals: buddyPairs.sharedGoals,
        createdAt: buddyPairs.createdAt,
      })
      .from(buddyPairs)
      .innerJoin(users, eq(users.id, buddyPairs.user1Id))
      .where(
        and(
          eq(buddyPairs.user2Id, userId),
          eq(buddyPairs.status, 'pending')
        )
      );

    console.log('[BuddiesService] Found', requests.length, 'pending requests');
    return requests;
  }

  /**
   * Get all active buddies
   */
  async getActiveBuddies(userId: string) {
    // Get buddy pairs where user is involved
    const pairs = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(
        and(
          or(
            eq(buddyPairs.user1Id, userId),
            eq(buddyPairs.user2Id, userId)
          ),
          eq(buddyPairs.status, 'active')
        )
      );

    // For each pair, fetch the buddy user (not the current user)
    const buddiesWithDetails = await Promise.all(
      pairs.map(async (pair) => {
        const buddyId = pair.user1Id === userId ? pair.user2Id : pair.user1Id;
        const [buddy] = await this.drizzle.db
          .select()
          .from(users)
          .where(eq(users.id, buddyId))
          .limit(1);

        return {
          id: pair.id,
          buddy,
          sharedGoals: pair.sharedGoals,
          privacySettings: pair.privacySettings,
          createdAt: pair.createdAt,
          acceptedAt: pair.acceptedAt,
        };
      })
    );

    return buddiesWithDetails;
  }

  /**
   * Update buddy pair settings
   */
  async updateBuddyPair(userId: string, buddyPairId: number, dto: UpdateBuddyDto) {
    const [buddyPair] = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(eq(buddyPairs.id, buddyPairId))
      .limit(1);

    if (!buddyPair) {
      throw new NotFoundException('Buddy pair not found');
    }

    // Ensure the user is part of this pair
    if (buddyPair.user1Id !== userId && buddyPair.user2Id !== userId) {
      throw new BadRequestException('You are not part of this buddy pair');
    }

    const [updated] = await this.drizzle.db
      .update(buddyPairs)
      .set({
        ...dto,
      })
      .where(eq(buddyPairs.id, buddyPairId))
      .returning();

    return updated;
  }

  /**
   * Find suggested buddies based on goals and activity
   */
  async getSuggestedBuddies(userId: string) {
    // Get all users except the current user and existing buddies
    const allUsers = await this.drizzle.db
      .select()
      .from(users)
      .limit(10);

    // Filter out current user and existing buddies
    const existingBuddyPairs = await this.drizzle.db
      .select()
      .from(buddyPairs)
      .where(
        or(
          eq(buddyPairs.user1Id, userId),
          eq(buddyPairs.user2Id, userId)
        )
      );

    const existingBuddyIds = existingBuddyPairs.flatMap(pair => [
      pair.user1Id,
      pair.user2Id,
    ]);

    const suggested = allUsers.filter(
      user => user.id !== userId && !existingBuddyIds.includes(user.id)
    );

    return suggested;
  }
}
