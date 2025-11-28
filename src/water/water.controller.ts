import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WaterService } from './water.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LogWaterDto, QueryWaterDto } from './dto';

@Controller('water')
@UseGuards(FirebaseAuthGuard)
export class WaterController {
  constructor(private waterService: WaterService) {}

  @Post()
  async logWater(@CurrentUser() user: any, @Body() dto: LogWaterDto) {
    return this.waterService.logWater(user.uid, dto);
  }

  @Get()
  async getWaterLogs(@CurrentUser() user: any, @Query() query: QueryWaterDto) {
    return this.waterService.getWaterLogs(user.uid, query);
  }
}
