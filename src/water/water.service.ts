import { Injectable } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { waterLogs } from '../database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { LogWaterDto, QueryWaterDto } from './dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class WaterService {
  constructor(private drizzle: DrizzleService) {}

  async logWater(userId: string, dto: LogWaterDto) {
    const date = new Date(dto.date);
    const start = startOfDay(date);
    const end = endOfDay(date);

    // Check if log exists for today
    const [existing] = await this.drizzle.db
      .select()
      .from(waterLogs)
      .where(
        and(
          eq(waterLogs.userId, userId),
          gte(waterLogs.date, start),
          lte(waterLogs.date, end),
        ),
      )
      .limit(1);

    if (existing) {
      // Update existing
      const [updated] = await this.drizzle.db
        .update(waterLogs)
        .set({ glasses: dto.glasses })
        .where(eq(waterLogs.id, existing.id))
        .returning();
      return updated;
    }

    // Create new
    const [log] = await this.drizzle.db
      .insert(waterLogs)
      .values({
        userId,
        glasses: dto.glasses,
        date,
      })
      .returning();

    return log;
  }

  async getWaterLogs(userId: string, query: QueryWaterDto) {
    if (query.date) {
      const date = new Date(query.date);
      const start = startOfDay(date);
      const end = endOfDay(date);

      return this.drizzle.db
        .select()
        .from(waterLogs)
        .where(
          and(
            eq(waterLogs.userId, userId),
            gte(waterLogs.date, start),
            lte(waterLogs.date, end),
          ),
        )
        .orderBy(waterLogs.date);
    }

    return this.drizzle.db
      .select()
      .from(waterLogs)
      .where(eq(waterLogs.userId, userId))
      .orderBy(waterLogs.date);
  }
}
