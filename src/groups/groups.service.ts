import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { groups, groupMembers } from '../database/schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { eq, desc, and, sql } from 'drizzle-orm';

@Injectable()
export class GroupsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async create(userId: string, createGroupDto: CreateGroupDto) {
    const [group] = await this.drizzle.db
      .insert(groups)
      .values({
        ...createGroupDto,
        creatorId: userId,
      })
      .returning();

    // Auto-join creator as admin
    await this.drizzle.db.insert(groupMembers).values({
      groupId: group.id,
      userId,
      role: 'admin',
    });

    await this.drizzle.db
      .update(groups)
      .set({ memberCount: 1 })
      .where(eq(groups.id, group.id));

    return group;
  }

  async findAll(limit = 50, offset = 0) {
    return this.drizzle.db
      .select()
      .from(groups)
      .where(eq(groups.isPrivate, false))
      .orderBy(desc(groups.memberCount))
      .limit(limit)
      .offset(offset);
  }

  async findOne(id: number) {
    const [group] = await this.drizzle.db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async join(groupId: number, userId: string) {
    // Check if already a member
    const existing = await this.drizzle.db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .limit(1);

    if (existing.length > 0) {
      return { message: 'Already a member' };
    }

    await this.drizzle.db.insert(groupMembers).values({
      groupId,
      userId,
    });

    await this.drizzle.db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} + 1` })
      .where(eq(groups.id, groupId));

    return { message: 'Joined successfully' };
  }

  async leave(groupId: number, userId: string) {
    const [member] = await this.drizzle.db
      .select()
      .from(groupMembers)
      .where(
        and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)),
      )
      .limit(1);

    if (!member) {
      throw new NotFoundException('Not a member');
    }

    await this.drizzle.db
      .delete(groupMembers)
      .where(eq(groupMembers.id, member.id));

    await this.drizzle.db
      .update(groups)
      .set({ memberCount: sql`${groups.memberCount} - 1` })
      .where(eq(groups.id, groupId));

    return { message: 'Left successfully' };
  }

  async getMembers(groupId: number) {
    return this.drizzle.db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId))
      .orderBy(desc(groupMembers.joinedAt));
  }

  async getUserGroups(userId: string) {
    return this.drizzle.db
      .select({
        group: groups,
        membership: groupMembers,
      })
      .from(groupMembers)
      .innerJoin(groups, eq(groupMembers.groupId, groups.id))
      .where(eq(groupMembers.userId, userId))
      .orderBy(desc(groups.createdAt));
  }
}
