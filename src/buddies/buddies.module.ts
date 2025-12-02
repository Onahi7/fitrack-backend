import { Module } from '@nestjs/common';
import { BuddiesController } from './buddies.controller';
import { BuddiesService } from './buddies.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [BuddiesController],
  providers: [BuddiesService],
  exports: [BuddiesService],
})
export class BuddiesModule {}
