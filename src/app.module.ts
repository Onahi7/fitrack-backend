import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { MealsModule } from './meals/meals.module';
import { StreaksModule } from './streaks/streaks.module';
import { JournalModule } from './journal/journal.module';
import { WaterModule } from './water/water.module';
import { BuddiesModule } from './buddies/buddies.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AchievementsModule } from './achievements/achievements.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PostsModule } from './posts/posts.module';
import { ChallengesModule } from './challenges/challenges.module';
import { GroupsModule } from './groups/groups.module';
import { EmailModule } from './email/email.module';
import { PhotosModule } from './photos/photos.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UsersModule,
    MealsModule,
    StreaksModule,
    JournalModule,
    WaterModule,
    BuddiesModule,
    NotificationsModule,
    AchievementsModule,
    SubscriptionsModule,
    PostsModule,
    ChallengesModule,
    GroupsModule,
    EmailModule,
    PhotosModule,
  ],
})
export class AppModule {}
