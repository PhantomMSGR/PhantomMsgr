import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { NotificationController } from './notification.controller'
import { FcmService } from './fcm/fcm.service'
import { PreferenceService } from './preference/preference.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
  ],
  controllers: [NotificationController],
  providers: [FcmService, PreferenceService],
})
export class NotificationModule {}
