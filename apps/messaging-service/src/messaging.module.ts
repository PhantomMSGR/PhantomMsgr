import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { MessagingController } from './messaging.controller'
import { MessagingService } from './messaging.service'
import { ReactionsService } from './reactions/reactions.service'
import { ReadsService } from './reads/reads.service'
import { PollsService } from './polls/polls.service'
import { PinsService } from './pins/pins.service'
import { TtlService } from './ttl/ttl.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
      }),
    }),
    BullModule.registerQueue({ name: 'message-ttl' }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService, ReactionsService, ReadsService, PollsService, PinsService, TtlService],
})
export class MessagingModule {}
