import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { journalEntries } from '../database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { CreateJournalDto, QueryJournalDto } from './dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class JournalService {
  constructor(private drizzle: DrizzleService) {}

  async createEntry(userId: string, dto: CreateJournalDto) {
    const [entry] = await this.drizzle.db
      .insert(journalEntries)
      .values({
        userId,
        ...dto,
        date: new Date(dto.date),
      })
      .returning();

    return entry;
  }

  async getEntries(userId: string, query: QueryJournalDto) {
    if (query.date) {
      const date = new Date(query.date);
      const start = startOfDay(date);
      const end = endOfDay(date);

      return this.drizzle.db
        .select()
        .from(journalEntries)
        .where(
          and(
            eq(journalEntries.userId, userId),
            gte(journalEntries.date, start),
            lte(journalEntries.date, end),
          ),
        )
        .orderBy(journalEntries.date);
    }

    return this.drizzle.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(journalEntries.date);
  }

  async getEntryById(userId: string, entryId: number) {
    const [entry] = await this.drizzle.db
      .select()
      .from(journalEntries)
      .where(
        and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)),
      )
      .limit(1);

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return entry;
  }

  async deleteEntry(userId: string, entryId: number) {
    await this.drizzle.db
      .delete(journalEntries)
      .where(
        and(eq(journalEntries.id, entryId), eq(journalEntries.userId, userId)),
      );

    return { success: true };
  }
}
