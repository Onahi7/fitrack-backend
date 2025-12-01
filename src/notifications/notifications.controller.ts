import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WebPushService } from './web-push.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(FirebaseAuthGuard)
export class NotificationsController {
  constructor(private webPushService: WebPushService) {}

  /**
   * Subscribe to push notifications
   */
  @Post('subscribe')
  async subscribe(
    @CurrentUser() user: any,
    @Body() body: {
      subscription: {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
    },
    @Req() req: any,
  ) {
    const userAgent = req.headers['user-agent'];
    await this.webPushService.subscribe(
      user.uid,
      body.subscription,
      userAgent,
    );
    return { success: true };
  }

  /**
   * Unsubscribe from push notifications
   */
  @Delete('unsubscribe')
  async unsubscribe(
    @CurrentUser() user: any,
    @Body() body?: { endpoint?: string },
  ) {
    await this.webPushService.unsubscribe(user.uid, body?.endpoint);
    return { success: true };
  }

  /**
   * Get notification preferences
   */
  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    const prefs = await this.webPushService.getPreferences(user.uid);
    return prefs;
  }

  /**
   * Update notification preferences
   */
  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() preferences: any,
  ) {
    await this.webPushService.updatePreferences(user.uid, preferences);
    return { success: true };
  }

  /**
   * Test notification (for debugging)
   */
  @Post('test')
  async testNotification(@CurrentUser() user: any) {
    const sent = await this.webPushService.sendToUser(user.uid, {
      title: '🎉 Test Notification',
      body: 'If you see this, push notifications are working!',
      data: { type: 'test' },
    });
    return { success: sent > 0, devicesSent: sent };
  }
}
