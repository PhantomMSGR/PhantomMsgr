import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MEDIA_EVENTS } from '@phantom/contracts'
import * as schema from '../../../../src/database/schema'
import { StorageService } from '../storage/storage.service'

@Injectable()
export class UploadService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly storageService: StorageService,
  ) {}

  async finalizeUpload(dto: {
    uploaderId: string
    storageKey: string
    url: string
    type: string
    mimeType: string
    fileSize: number
    fileName?: string
    duration?: number
  }) {
    const [media] = await this.db
      .insert(schema.media)
      .values({
        uploaderId: dto.uploaderId,
        type: dto.type as any,
        storageKey: dto.storageKey,
        url: dto.url,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        fileName: dto.fileName,
        duration: dto.duration != null ? Math.round(dto.duration) : undefined,
      })
      .returning()

    // Trigger async processing
    await this.redis.publish(
      MEDIA_EVENTS.PROCESS,
      JSON.stringify({
        mediaId: media.id,
        storageKey: media.storageKey,
        type: media.type,
        mimeType: media.mimeType,
      }),
    )

    return media
  }

  async getById(mediaId: string) {
    const [media] = await this.db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, mediaId))
      .limit(1)

    if (!media) throw new RpcException({ status: 404, message: 'Media not found' })
    return media
  }

  async deleteMedia(mediaId: string, requestingUserId: string) {
    const [media] = await this.db
      .select()
      .from(schema.media)
      .where(eq(schema.media.id, mediaId))
      .limit(1)

    if (!media) throw new RpcException({ status: 404, message: 'Media not found' })
    if (media.uploaderId !== requestingUserId) {
      throw new RpcException({ status: 403, message: 'Forbidden' })
    }

    await this.storageService.deleteObject(media.storageKey)
    if (media.thumbnailKey) await this.storageService.deleteObject(media.thumbnailKey)

    await this.db.delete(schema.media).where(eq(schema.media.id, mediaId))
    return { ok: true }
  }
}
