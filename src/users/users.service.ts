import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { users, userProfiles } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateUserDto, UpdateProfileDto } from './dto';
import * as admin from 'firebase-admin';

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
    try {
      await this.drizzle.db.insert(userProfiles).values({
        userId: user.id,
      });
    } catch (error) {
      // Profile creation failed, but user was created - log the error but continue
      console.error('Failed to create user profile for user', user.id, error);
    }

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
    let [profile] = await this.drizzle.db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);

    if (!profile) {
      // Create profile if it doesn't exist
      try {
        [profile] = await this.drizzle.db
          .insert(userProfiles)
          .values({
            userId: userId,
          })
          .returning();
      } catch (error) {
        // If there's a race condition and another process created the profile, try to get it
        [profile] = await this.drizzle.db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId))
          .limit(1);
        
        if (!profile) {
          throw new NotFoundException('Profile not found and could not be created');
        }
      }
    }

    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Extract all fields that need type conversion
    const {
      startingWeight,
      currentWeight,
      goalWeight,
      height,
      dailyCalorieGoal,
      dailyWaterGoal,
      fastingStartTime,
      tutorialCompleted,
      fastingProtocol,
    } = dto;
    
    // Build update object with proper type conversions
    const updateData: any = {
      setupCompleted: true,
      updatedAt: new Date(),
    };

    // Handle numeric fields (convert to strings for database)
    if (startingWeight !== undefined) updateData.startingWeight = String(startingWeight);
    if (currentWeight !== undefined) updateData.currentWeight = String(currentWeight);
    if (goalWeight !== undefined) updateData.goalWeight = String(goalWeight);
    if (height !== undefined) updateData.height = String(height);
    if (dailyCalorieGoal !== undefined) updateData.dailyCalorieGoal = String(dailyCalorieGoal);
    if (dailyWaterGoal !== undefined) updateData.dailyWaterGoal = String(dailyWaterGoal);
    
    // Handle Date fields (convert string to Date)
    if (fastingStartTime !== undefined) updateData.fastingStartTime = new Date(fastingStartTime);
    
    // Handle other fields directly
    if (tutorialCompleted !== undefined) updateData.tutorialCompleted = tutorialCompleted;
    if (fastingProtocol !== undefined) updateData.fastingProtocol = fastingProtocol;
    
    const [profile] = await this.drizzle.db
      .update(userProfiles)
      .set(updateData)
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

  async createAdmin(email: string, password: string) {
    const [existingAdmin] = await this.drizzle.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingAdmin) {
      throw new ConflictException('Admin user with this email already exists');
    }

    try {
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName: 'Admin',
      });

      await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });

      const [user] = await this.drizzle.db
        .insert(users)
        .values({
          id: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          role: 'admin',
        })
        .returning();

      await this.drizzle.db.insert(userProfiles).values({
        userId: user.id,
        setupCompleted: true,
      });

      return {
        message: 'Admin user created successfully',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Error creating admin user:', error);
      throw new Error(`Failed to create admin user: ${error.message}`);
    }
  }

  async adminLogin(idToken: string) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      const [user] = await this.drizzle.db
        .select()
        .from(users)
        .where(eq(users.id, decodedToken.uid))
        .limit(1);

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.role !== 'admin') {
        throw new ConflictException('User is not an admin');
      }

      return {
        token: idToken,
        admin: {
          id: user.id,
          email: user.email,
          name: user.displayName || 'Admin',
          role: user.role,
        },
      };
    } catch (error) {
      console.error('Admin login error:', error);
      throw error;
    }
  }
}
