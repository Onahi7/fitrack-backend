import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UserId } from '../common/decorators/user-id.decorator';

@Controller('challenges')
@UseGuards(FirebaseAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  create(
    @UserId() userId: string,
    @Body() createChallengeDto: CreateChallengeDto,
  ) {
    return this.challengesService.create(userId, createChallengeDto);
  }

  @Get()
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.challengesService.findAll(
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );
  }

  @Get('my-challenges')
  getUserChallenges(@UserId() userId: string) {
    return this.challengesService.getUserChallenges(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.challengesService.findOne(+id);
  }

  @Post(':id/join')
  join(@Param('id') id: string, @UserId() userId: string) {
    return this.challengesService.join(+id, userId);
  }

  @Put(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @UserId() userId: string,
    @Body('progress') progress: number,
  ) {
    return this.challengesService.updateProgress(+id, userId, progress);
  }

  @Get(':id/leaderboard')
  getLeaderboard(@Param('id') id: string) {
    return this.challengesService.getLeaderboard(+id);
  }
}
