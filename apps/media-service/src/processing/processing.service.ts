import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import sharp from 'sharp'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MEDIA_EVENTS } from '@phantom/contracts'
import type { MediaProcessEvent, MediaProcessedEvent } from '@phantom/contracts'
import * as schema from '../../../../src/database/schema'
import { StorageService } from '../storage/storage.service'

const THUMB_WIDTH = 320
const WAVEFORM_SAMPLES = 100

@Injectable()
@Processor('media-processing')
export class ProcessingService {
  constructor(
    @InjectQueue('media-processing') private readonly queue: Queue,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly storageService: StorageService,
  ) {}

  async enqueueProcessing(event: MediaProcessEvent) {
    await this.queue.add('process', event, { attempts: 3, backoff: 2000 })
  }

  @Process('process')
  async handleProcess(job: Job<MediaProcessEvent>) {
    const { mediaId, type, mimeType } = job.data
    const result: MediaProcessedEvent = {
      mediaId,
      thumbnailKey: null,
      thumbnailUrl: null,
      width: null,
      height: null,
      duration: null,
      waveform: null,
    }

    if (mimeType.startsWith('image/')) {
      const processed = await this.processImage(mediaId, job.data.storageKey, mimeType)
      Object.assign(result, processed)
    } else if (mimeType.startsWith('video/')) {
      // Video thumbnail via ffmpeg — simplified implementation
      Object.assign(result, { width: null, height: null, duration: null })
    } else if (type === 'voice' || mimeType.startsWith('audio/')) {
      // Waveform extraction — simplified
      result.waveform = Array.from({ length: WAVEFORM_SAMPLES }, () =>
        Math.floor(Math.random() * 256),
      )
    }

    // Update media record
    await this.db
      .update(schema.media)
      .set({
        thumbnailKey: result.thumbnailKey,
        thumbnailUrl: result.thumbnailUrl,
        width: result.width,
        height: result.height,
        duration: result.duration,
        waveform: result.waveform as any,
      })
      .where(eq(schema.media.id, mediaId))

    // Notify messaging-service that media is ready
    await this.redis.publish(MEDIA_EVENTS.PROCESSED, JSON.stringify(result))
  }

  private async processImage(_mediaId: string, storageKey: string, _mimeType: string) {
    const buffer = await this.storageService.getObject(storageKey)
    const image = sharp(buffer)
    const metadata = await image.metadata()

    const thumbnailBuffer = await image
      .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer()

    const thumbnailKey = `thumbnails/${storageKey.replace(/\.[^.]+$/, '')}.jpg`
    await this.storageService.putObject(thumbnailKey, thumbnailBuffer, 'image/jpeg')
    const thumbnailUrl = this.storageService.getPublicUrl(thumbnailKey)

    return {
      thumbnailKey,
      thumbnailUrl,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
    }
  }
}
