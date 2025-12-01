import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WebPushService } from './web-push.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, WebPushService],
  exports: [NotificationsService, WebPushService],
})
export class NotificationsModule {}
