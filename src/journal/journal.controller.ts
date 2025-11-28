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
import { JournalService } from './journal.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateJournalDto, QueryJournalDto } from './dto';

@Controller('journal')
@UseGuards(FirebaseAuthGuard)
export class JournalController {
  constructor(private journalService: JournalService) {}

  @Post()
  async createEntry(@CurrentUser() user: any, @Body() dto: CreateJournalDto) {
    return this.journalService.createEntry(user.uid, dto);
  }

  @Get()
  async getEntries(@CurrentUser() user: any, @Query() query: QueryJournalDto) {
    return this.journalService.getEntries(user.uid, query);
  }

  @Get(':id')
  async getEntryById(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalService.getEntryById(user.uid, id);
  }

  @Delete(':id')
  async deleteEntry(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalService.deleteEntry(user.uid, id);
  }
}
