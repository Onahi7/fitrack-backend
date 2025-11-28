import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users, userProfiles } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateUserDto, UpdateProfileDto } from './dto';

@Injectable()
export class UsersService {
  constructor(private drizzle: DrizzleService) {}

  async createUser(dto: CreateUserDto) {
    // Check if user already exists
    const [existingUser] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, dto.id))
      .limit(1);

    if (existingUser) {
      // User already exists, return the existing user
      return existingUser;
    }

    // Create new user
    const [user] = await this.drizzle.db
      .insert(users)
      .values({
        id: dto.id,
        email: dto.email,
        displayName: dto.displayName,
        photoURL: dto.photoURL,
      })
      .returning();

    // Create empty profile
    await this.drizzle.db.insert(userProfiles).values({
      userId: user.id,
    });

    return user;
  }

  async findOrCreateUser(dto: CreateUserDto) {
    const [existingUser] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, dto.id))
      .limit(1);

    if (existingUser) {
      return existingUser;
    }

    return this.createUser(dto);
  }

  async findById(userId: string) {
    const [user] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async getUserProfile(userId: string) {
    const [profile] = await this.drizzle.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Convert numeric fields to strings for Drizzle
    const {
      startingWeight,
      currentWeight,
      goalWeight,
      height,
      dailyCalorieGoal,
      dailyWaterGoal,
      ...rest
    } = dto;
    const [profile] = await this.drizzle.db
      .update(userProfiles)
      .set({
        ...rest,
        startingWeight: startingWeight !== undefined ? String(startingWeight) : undefined,
        currentWeight: currentWeight !== undefined ? String(currentWeight) : undefined,
        goalWeight: goalWeight !== undefined ? String(goalWeight) : undefined,
        height: height !== undefined ? String(height) : undefined,
        dailyCalorieGoal: dailyCalorieGoal !== undefined ? String(dailyCalorieGoal) : undefined,
        dailyWaterGoal: dailyWaterGoal !== undefined ? String(dailyWaterGoal) : undefined,
        setupCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, userId))
      .returning();

    return profile;
  }

  async exportUserData(userId: string) {
    const user = await this.findById(userId);
    const profile = await this.getUserProfile(userId);
    
    return {
      user: {
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
      profile: {
        startingWeight: profile.startingWeight,
        currentWeight: profile.currentWeight,
        goalWeight: profile.goalWeight,
        height: profile.height,
        dailyCalorieGoal: profile.dailyCalorieGoal,
        dailyWaterGoal: profile.dailyWaterGoal,
      },
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteUser(userId: string) {
    await this.drizzle.db.delete(users).where(eq(users.id, userId));
    return { success: true, message: 'Account deleted successfully' };
  }
}
