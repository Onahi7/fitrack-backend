import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Put,
  Delete,
  ParseIntPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('challenges')
@UseGuards(FirebaseAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  private parseIntParam(value: string, paramName: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException(`Invalid ${paramName}: ${value}`);
    }
    return parsed;
  }

  @Post()
  create(
    @UserId() userId: string,
    @Body() createChallengeDto: CreateChallengeDto,
  ) {
    return this.challengesService.create(userId, createChallengeDto);
  }

  @Post('admin')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createAdminChallenge(
    @UserId() userId: string,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    // When using FormData, parse the body fields
    const createChallengeDto: CreateChallengeDto = {
      name: body.name,
      description: body.description,
      type: body.type,
      goal: parseInt(body.goal),
      duration: parseInt(body.duration),
      startDate: body.startDate,
      imageUrl: body.imageUrl,
      isPremiumChallenge: body.isPremiumChallenge === 'true',
      requiresSubscription: body.requiresSubscription === 'true',
      subscriptionTier: body.subscriptionTier,
      gift30Days: body.gift30Days === 'true',
    };

    // Parse dailyTasks if present
    let dailyTasks;
    if (body.dailyTasks) {
      try {
        dailyTasks = JSON.parse(body.dailyTasks);
      } catch (e) {
        // If parsing fails, ignore
      }
    }

    return this.challengesService.createAdminChallenge(
      userId,
      createChallengeDto,
      file,
      dailyTasks,
    );
  }

  @Get()
  findAll(
    @UserId() userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.challengesService.findAll(
      userId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('my-challenges')
  getUserChallenges(@UserId() userId: string) {
    return this.challengesService.getUserChallenges(userId);
  }

  @Get('premium-banners')
  getPremiumBanners(@UserId() userId: string) {
    return this.challengesService.getPremiumBanners(userId);
  }

  @Post('track-session')
  trackSession(@UserId() userId: string) {
    return this.challengesService.trackUserSession(userId);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.challengesService.getLeaderboard(this.parseIntParam(id, 'challenge ID'));
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.challengesService.findOne(this.parseIntParam(id, 'challenge ID'));
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateChallenge(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() file?: any,
  ) {
    const challengeId = this.parseIntParam(id, 'challenge ID');
    
    // When using FormData, parse the body fields
    const updateData: Partial<CreateChallengeDto> = {};
    
    if (body.name) updateData.name = body.name;
    if (body.description) updateData.description = body.description;
    if (body.type) updateData.type = body.type;
    if (body.goal) updateData.goal = parseInt(body.goal);
    if (body.duration) updateData.duration = parseInt(body.duration);
    if (body.startDate) updateData.startDate = body.startDate;
    if (body.imageUrl) updateData.imageUrl = body.imageUrl;
    if (body.isPremiumChallenge !== undefined) updateData.isPremiumChallenge = body.isPremiumChallenge === 'true';
    if (body.requiresSubscription !== undefined) updateData.requiresSubscription = body.requiresSubscription === 'true';
    if (body.subscriptionTier) updateData.subscriptionTier = body.subscriptionTier;

    return this.challengesService.updateChallenge(challengeId, updateData, file);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @UserId() userId: string) {
    return this.challengesService.join(this.parseIntParam(id, 'challenge ID'), userId);
  }

  @Put(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('progress') progress: number,
  ) {
    return this.challengesService.updateProgress(this.parseIntParam(id, 'challenge ID'), userId, progress);
  }

  @Post(':id/sync')
  syncProgress(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('date') date?: string,
  ) {
    const syncDate = date ? new Date(date) : new Date();
    return this.challengesService.syncChallengeProgress(this.parseIntParam(id, 'challenge ID'), userId, syncDate);
  }

  @Get(':id/progress')
  getChallengeProgress(@Param('id') id: string, @UserId() userId: string) {
    return this.challengesService.getChallengeProgress(this.parseIntParam(id, 'challenge ID'), userId);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  delete(@Param('id') id: string) {
    return this.challengesService.delete(this.parseIntParam(id, 'challenge ID'));
  }

  @Get('admin/stats')
  @UseGuards(AdminGuard)
  getAdminStats() {
    return this.challengesService.getAdminStats();
  }

  @Get('admin/all')
  @UseGuards(AdminGuard)
  getAllChallengesForAdmin() {
    return this.challengesService.findAllForAdmin();
  }

  @Post(':id/dismiss-banner')
  dismissBanner(@Param('id') id: string, @UserId() userId: string) {
    return this.challengesService.dismissBanner(this.parseIntParam(id, 'challenge ID'), userId);
  }

  @Get(':id/tasks')
  getChallengeTasks(
    @Param('id') id: string,
    @Query('day') day?: string,
  ) {
    const dayOfChallenge = day ? this.parseIntParam(day, 'day') : undefined;
    return this.challengesService.getChallengeTasks(this.parseIntParam(id, 'challenge ID'), dayOfChallenge);
  }

  @Post(':id/tasks/:taskId/complete')
  completeTask(
    @Param('id') challengeId: string,
    @Param('taskId') taskId: string,
    @UserId() userId: string,
    @Body() body: { actualValue?: number; notes?: string },
  ) {
    return this.challengesService.completeTask(
      this.parseIntParam(challengeId, 'challenge ID'),
      this.parseIntParam(taskId, 'task ID'),
      userId,
      body.actualValue,
      body.notes,
    );
  }

  @Get(':id/my-completions')
  getUserTaskCompletions(
    @Param('id') id: string,
    @UserId() userId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : undefined;
    return this.challengesService.getUserTaskCompletions(this.parseIntParam(id, 'challenge ID'), userId, targetDate);
  }

  @Post(':id/activate-fasting')
  activateFastingTimer(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('fastingType') fastingType: string,
  ) {
    return this.challengesService.activateFastingTimer(this.parseIntParam(id, 'challenge ID'), userId, fastingType);
  }

  @Post(':id/daily-task')
  @UseGuards(AdminGuard)
  createDailyTask(
    @Param('id') id: string,
    @Body() taskData: {
      taskType: string;
      title: string;
      description?: string;
      targetValue?: number;
      targetUnit?: string;
      exerciseType?: string;
      mealType?: string;
      fastingType?: string;
      isRequired?: boolean;
      points?: number;
      taskDate?: string;
      dayOfChallenge?: number;
    },
  ) {
    const taskDateParsed = taskData.taskDate ? new Date(taskData.taskDate) : undefined;
    return this.challengesService.createDailyTask(this.parseIntParam(id, 'challenge ID'), {
      ...taskData,
      taskDate: taskDateParsed,
    });
  }

  @Get(':id/engagement')
  @UseGuards(AdminGuard)
  getDailyTaskEngagement(
    @Param('id') id: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : undefined;
    return this.challengesService.getDailyTaskEngagement(this.parseIntParam(id, 'challenge ID'), targetDate);
  }

  @Get('task/:taskId/details')
  @UseGuards(AdminGuard)
  getTaskCompletionDetails(@Param('taskId') taskId: string) {
    return this.challengesService.getTaskCompletionDetails(this.parseIntParam(taskId, 'task ID'));
  }

  @Put('task/:taskId/engagement')
  @UseGuards(AdminGuard)
  updateTaskEngagement(@Param('taskId') taskId: string) {
    return this.challengesService.updateTaskEngagement(this.parseIntParam(taskId, 'task ID'));
  }
}
