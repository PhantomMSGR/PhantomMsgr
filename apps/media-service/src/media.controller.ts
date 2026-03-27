import { Controller } from '@nestjs/common'
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices'
import { MEDIA_EVENTS, MEDIA_PATTERNS } from '@phantom/contracts'
import type { MediaProcessEvent } from '@phantom/contracts'
import { UploadService } from './upload/upload.service'
import { ProcessingService } from './processing/processing.service'
import { StorageService } from './storage/storage.service'

@Controller()
export class MediaController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly processingService: ProcessingService,
    private readonly storageService: StorageService,
  ) {}

  @MessagePattern(MEDIA_PATTERNS.GET_BY_ID)
  getById(@Payload() dto: { mediaId: string }) {
    return this.uploadService.getById(dto.mediaId)
  }

  @MessagePattern(MEDIA_PATTERNS.GET_UPLOAD_URL)
  getUploadUrl(@Payload() dto: { uploaderId: string; type: string; mimeType: string; fileName?: string }) {
    return this.storageService.getPresignedUploadUrl(dto)
  }

  @MessagePattern(MEDIA_PATTERNS.GET_DOWNLOAD_URL)
  getDownloadUrl(@Payload() dto: { storageKey: string }) {
    return this.storageService.getPresignedDownloadUrl(dto.storageKey)
  }

  @MessagePattern(MEDIA_PATTERNS.DELETE)
  delete(@Payload() dto: { mediaId: string; requestingUserId: string }) {
    return this.uploadService.deleteMedia(dto.mediaId, dto.requestingUserId)
  }

  // api-gateway calls this after receiving multipart upload
  @MessagePattern(MEDIA_PATTERNS.UPLOAD)
  finalize(@Payload() dto: {
    uploaderId: string
    storageKey: string
    url: string
    type: string
    mimeType: string
    fileSize: number
    fileName?: string
    duration?: number
  }) {
    return this.uploadService.finalizeUpload(dto)
  }

  // Trigger processing for an already-uploaded file
  @EventPattern(MEDIA_EVENTS.PROCESS)
  onProcess(@Payload() event: MediaProcessEvent) {
    return this.processingService.enqueueProcessing(event)
  }
}
