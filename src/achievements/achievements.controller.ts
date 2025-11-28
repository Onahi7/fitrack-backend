import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AchievementsService } from './achievements.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProgressDto } from './dto';

@Controller('achievements')
@UseGuards(FirebaseAuthGuard)
export class AchievementsController {
  constructor(private achievementsService: AchievementsService) {}

  /**
   * Get all available achievements
   */
  @Get()
  async getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  /**
   * Get user's achievements with progress
   */
  @Get('me')
  async getUserAchievements(@CurrentUser() user: any) {
    return this.achievementsService.getUserAchievements(user.uid);
  }

  /**
   * Update achievement progress
   */
  @Put(':id/progress')
  async updateProgress(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.achievementsService.updateProgress(user.uid, id, dto.progress);
  }

  /**
   * Check and update all streak achievements
   */
  @Post('check-streaks')
  async checkStreakAchievements(@CurrentUser() user: any) {
    await this.achievementsService.checkStreakAchievements(user.uid);
    return { message: 'Streak achievements checked and updated' };
  }

  /**
   * Check and update all consistency achievements
   */
  @Post('check-consistency')
  async checkConsistencyAchievements(@CurrentUser() user: any) {
    await this.achievementsService.checkConsistencyAchievements(user.uid);
    return { message: 'Consistency achievements checked and updated' };
  }

  /**
   * Seed default achievements (admin only - for now public for testing)
   */
  @Post('seed')
  async seedAchievements() {
    await this.achievementsService.seedAchievements();
    return { message: 'Default achievements seeded successfully' };
  }
}
