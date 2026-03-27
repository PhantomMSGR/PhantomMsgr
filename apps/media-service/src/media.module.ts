import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { BullModule } from '@nestjs/bull'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { MediaController } from './media.controller'
import { StorageService } from './storage/storage.service'
import { UploadService } from './upload/upload.service'
import { ProcessingService } from './processing/processing.service'

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
    BullModule.registerQueue({ name: 'media-processing' }),
  ],
  controllers: [MediaController],
  providers: [StorageService, UploadService, ProcessingService],
})
export class MediaModule {}
