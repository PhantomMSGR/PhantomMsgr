import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { StoryController } from './story.controller'
import { StoryService } from './story.service'
import { StoryPrivacyService } from './privacy/story-privacy.service'
import { StoryExpiryService } from './expiry/story-expiry.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
      }),
    }),
    BullModule.registerQueue({ name: 'story-expiry' }),
  ],
  controllers: [StoryController],
  providers: [StoryService, StoryPrivacyService, StoryExpiryService],
})
export class StoryModule {}
