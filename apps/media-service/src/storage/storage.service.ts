import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  /** Used for internal server-side operations (get, put, delete objects). */
  private readonly s3: S3Client
  /**
   * Used exclusively for generating presigned URLs returned to clients.
   * Its endpoint must be the address that mobile/web clients can reach
   * (S3_PUBLIC_URL), NOT the internal localhost address.  The HMAC
   * signature in a presigned URL is bound to the exact host that was used
   * to create it — swapping the host after signing breaks the signature.
   */
  private readonly presignS3: S3Client
  private readonly bucket: string

  constructor(private readonly config: ConfigService) {
    const region = config.get('S3_REGION', 'us-east-1')
    const credentials = {
      accessKeyId: config.getOrThrow('S3_ACCESS_KEY'),
      secretAccessKey: config.getOrThrow('S3_SECRET_KEY'),
    }

    this.s3 = new S3Client({
      endpoint: config.getOrThrow('S3_ENDPOINT'),
      region,
      credentials,
      forcePathStyle: true,
    })

    // Presign client uses the client-accessible URL so signatures match
    this.presignS3 = new S3Client({
      endpoint: config.getOrThrow('S3_PUBLIC_URL'),
      region,
      credentials,
      forcePathStyle: true,
    })

    this.bucket = config.getOrThrow('S3_BUCKET')
  }

  /** Returns a presigned PUT URL so the client can upload directly to S3 */
  async getPresignedUploadUrl(dto: {
    uploaderId: string
    type: string
    mimeType: string
    fileName?: string
  }) {
    const ext = dto.fileName?.split('.').pop() ?? 'bin'
    const storageKey = `${dto.type}/${dto.uploaderId}/${randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: dto.mimeType,
    })

    // Signed with presignS3 → URL host already equals S3_PUBLIC_URL
    const uploadUrl = await getSignedUrl(this.presignS3, command, { expiresIn: 300 })
    const publicUrl = `${this.config.getOrThrow('S3_PUBLIC_URL')}/${this.bucket}/${storageKey}`

    return { storageKey, uploadUrl, publicUrl }
  }

  /** Returns a presigned GET URL for private files */
  async getPresignedDownloadUrl(storageKey: string) {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey })
    const url = await getSignedUrl(this.presignS3, command, { expiresIn: 3600 })
    return { url }
  }

  /** Downloads object body from S3 as a Buffer */
  async getObject(storageKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: storageKey })
    const response = await this.s3.send(command)
    const stream = response.Body as Readable
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }

  /** Uploads a buffer directly to S3 */
  async putObject(storageKey: string, body: Buffer, contentType: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  /** Returns the public URL for a given storage key */
  getPublicUrl(storageKey: string): string {
    return `${this.config.getOrThrow('S3_PUBLIC_URL')}/${this.bucket}/${storageKey}`
  }

  async deleteObject(storageKey: string) {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }))
  }
}
