import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { MealsService } from './meals.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMealDto, QueryMealsDto } from './dto';

@Controller('meals')
@UseGuards(FirebaseAuthGuard)
export class MealsController {
  constructor(private mealsService: MealsService) {}

  @Post()
  async createMeal(@CurrentUser() user: any, @Body() dto: CreateMealDto) {
    return this.mealsService.createMeal(user.uid, dto);
  }

  @Get()
  async getMeals(@CurrentUser() user: any, @Query() query: QueryMealsDto) {
    return this.mealsService.getMealsByDate(user.uid, query);
  }

  @Get('stats/daily')
  async getDailyStats(@CurrentUser() user: any, @Query('date') date: string) {
    return this.mealsService.getDailyStats(user.uid, date);
  }

  @Get(':id')
  async getMealById(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.getMealById(user.uid, id);
  }

  @Delete(':id')
  async deleteMeal(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.mealsService.deleteMeal(user.uid, id);
  }
}
