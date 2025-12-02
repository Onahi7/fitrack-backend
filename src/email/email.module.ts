import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { EmailAdminController, EmailTestController } from './email-admin.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [EmailAdminController, EmailTestController],
  providers: [EmailService, EmailQueueService],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
