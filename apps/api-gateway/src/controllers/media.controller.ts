import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { MEDIA_PATTERNS } from '@phantom/contracts'
import { CurrentUser, JwtPayload } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'

const GetUploadUrlSchema = z.object({
  type: z.enum(['photo', 'video', 'audio', 'voice', 'video_note', 'document', 'sticker', 'gif', 'avatar', 'story']),
  mimeType: z.string(),
  fileName: z.string().max(255).optional(),
})

const FinalizeUploadSchema = z.object({
  storageKey: z.string(),
  url: z.string().url(),
  type: z.string(),
  mimeType: z.string(),
  fileSize: z.number().int().nonnegative(),
  fileName: z.string().optional(),
  duration: z.number().nonnegative().optional(),
})

@Controller('media')
export class MediaController {
  constructor(
    @Inject('MEDIA_SERVICE') private readonly mediaClient: ClientProxy,
  ) {}

  /** Step 1: Get presigned upload URL to upload directly to S3 from client */
  @Post('upload-url')
  getUploadUrl(
    @Body(new ZodValidationPipe(GetUploadUrlSchema)) dto: z.infer<typeof GetUploadUrlSchema>,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.mediaClient.send(MEDIA_PATTERNS.GET_UPLOAD_URL, { ...dto, uploaderId: user.sub }),
    )
  }

  /** Step 2: Notify backend that upload is complete (after client PUT to S3) */
  @Post('finalize')
  finalize(
    @Body(new ZodValidationPipe(FinalizeUploadSchema)) dto: z.infer<typeof FinalizeUploadSchema>,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.mediaClient.send(MEDIA_PATTERNS.UPLOAD, { ...dto, uploaderId: user.sub }),
    )
  }

  @Get(':mediaId')
  getById(@Param('mediaId') mediaId: string) {
    return firstValueFrom(this.mediaClient.send(MEDIA_PATTERNS.GET_BY_ID, { mediaId }))
  }

  @Get(':mediaId/download')
  async getDownloadUrl(@Param('mediaId') mediaId: string, @CurrentUser() _user: JwtPayload) {
    const media = await firstValueFrom(
      this.mediaClient.send<{ storageKey: string }>(MEDIA_PATTERNS.GET_BY_ID, { mediaId }),
    )
    return firstValueFrom(
      this.mediaClient.send(MEDIA_PATTERNS.GET_DOWNLOAD_URL, { storageKey: media.storageKey }),
    )
  }
}
