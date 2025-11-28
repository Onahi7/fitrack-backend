import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BuddiesService } from './buddies.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateBuddyRequestDto, UpdateBuddyDto } from './dto';

@Controller('buddies')
@UseGuards(FirebaseAuthGuard)
export class BuddiesController {
  constructor(private buddiesService: BuddiesService) {}

  /**
   * Send a buddy request
   */
  @Post('request')
  async sendRequest(
    @CurrentUser() user: any,
    @Body() dto: CreateBuddyRequestDto,
  ) {
    return this.buddiesService.sendBuddyRequest(user.uid, dto);
  }

  /**
   * Get pending buddy requests
   */
  @Get('requests/pending')
  async getPendingRequests(@CurrentUser() user: any) {
    return this.buddiesService.getPendingRequests(user.uid);
  }

  /**
   * Accept a buddy request
   */
  @Post('requests/:id/accept')
  async acceptRequest(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.buddiesService.acceptBuddyRequest(user.uid, id);
  }

  /**
   * Reject a buddy request
   */
  @Delete('requests/:id')
  async rejectRequest(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.buddiesService.rejectBuddyRequest(user.uid, id);
  }

  /**
   * Get active buddies
   */
  @Get('active')
  async getActiveBuddies(@CurrentUser() user: any) {
    return this.buddiesService.getActiveBuddies(user.uid);
  }

  /**
   * Update buddy pair settings
   */
  @Put(':id')
  async updateBuddyPair(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBuddyDto,
  ) {
    return this.buddiesService.updateBuddyPair(user.uid, id, dto);
  }

  /**
   * Get suggested buddies
   */
  @Get('suggested')
  async getSuggestedBuddies(@CurrentUser() user: any) {
    return this.buddiesService.getSuggestedBuddies(user.uid);
  }

  /**
   * Remove a buddy (end buddy relationship)
   */
  @Delete(':id')
  async removeBuddy(
    @CurrentUser() user: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.buddiesService.rejectBuddyRequest(user.uid, id);
  }
}
