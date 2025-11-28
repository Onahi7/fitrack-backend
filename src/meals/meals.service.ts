import { Injectable, NotFoundException } from '@nestjs/common';
import { DrizzleService } from '../database/drizzle.service';
import { meals } from '../database/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { CreateMealDto, QueryMealsDto } from './dto';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class MealsService {
  constructor(private drizzle: DrizzleService) {}

  async createMeal(userId: string, dto: CreateMealDto) {
    // Convert numeric fields to strings for Drizzle
    const { calories, protein, carbs, fats, ...rest } = dto;
    const [meal] = await this.drizzle.db
      .insert(meals)
      .values({
        userId,
        ...rest,
        calories: calories !== undefined ? String(calories) : undefined,
        protein: protein !== undefined ? String(protein) : undefined,
        carbs: carbs !== undefined ? String(carbs) : undefined,
        fats: fats !== undefined ? String(fats) : undefined,
        date: new Date(dto.date),
      })
      .returning();

    return meal;
  }

  async getMealsByDate(userId: string, query: QueryMealsDto) {
    if (query.date) {
      const date = new Date(query.date);
      const start = startOfDay(date);
      const end = endOfDay(date);

      return this.drizzle.db
        .select()
        .from(meals)
        .where(
          and(
            eq(meals.userId, userId),
            gte(meals.date, start),
            lte(meals.date, end),
          ),
        )
        .orderBy(meals.date);
    }

    return this.drizzle.db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
      .orderBy(meals.date);
  }

  async getMealById(userId: string, mealId: number) {
    const [meal] = await this.drizzle.db
      .select()
      .from(meals)
      .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
      .limit(1);

    if (!meal) {
      throw new NotFoundException('Meal not found');
    }

    return meal;
  }

  async deleteMeal(userId: string, mealId: number) {
    await this.drizzle.db
      .delete(meals)
      .where(and(eq(meals.id, mealId), eq(meals.userId, userId)));

    return { success: true };
  }

  async getDailyStats(userId: string, date: string) {
    const targetDate = new Date(date);
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const result = await this.drizzle.db
      .select({
        totalCalories: sql<number>`COALESCE(SUM(${meals.calories}::numeric), 0)`,
        totalProtein: sql<number>`COALESCE(SUM(${meals.protein}::numeric), 0)`,
        totalCarbs: sql<number>`COALESCE(SUM(${meals.carbs}::numeric), 0)`,
        totalFats: sql<number>`COALESCE(SUM(${meals.fats}::numeric), 0)`,
        mealCount: sql<number>`COUNT(*)`,
      })
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.date, start),
          lte(meals.date, end),
        ),
      );

    return result[0];
  }
}
