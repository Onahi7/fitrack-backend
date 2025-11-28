import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CheckInDto } from './dto';

@Controller('streaks')
@UseGuards(FirebaseAuthGuard)
export class StreaksController {
  constructor(private streaksService: StreaksService) {}

  @Get()
  async getAllStreaks(@CurrentUser() user: any) {
    return this.streaksService.getAllStreaks(user.uid);
  }

  @Post('checkin')
  async checkIn(@CurrentUser() user: any, @Body() dto: CheckInDto) {
    return this.streaksService.checkIn(user.uid, dto.type);
  }
}
