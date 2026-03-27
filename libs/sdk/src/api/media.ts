import type { AxiosInstance } from 'axios'
import type { Media, MediaType } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface FinalizeDto {
  storageKey: string
  url: string
  type: MediaType
  mimeType: string
  fileSize: number
  fileName?: string
  duration?: number
}

export function createMediaApi(client: AxiosInstance) {
  return {
    getUploadUrl: async (dto: {
      type: MediaType
      mimeType: string
      fileName?: string
    }): Promise<{ storageKey: string; uploadUrl: string; publicUrl: string }> =>
      unwrap(await client.post('/media/upload-url', dto)),

    finalize: async (dto: FinalizeDto): Promise<Media> =>
      unwrap(await client.post('/media/finalize', dto)),

    get: async (mediaId: string): Promise<Media> =>
      unwrap(await client.get(`/media/${mediaId}`)),

    getDownloadUrl: async (mediaId: string): Promise<string> => {
      const res = unwrap(await client.get(`/media/${mediaId}/download`)) as { url: string }
      return res.url
    },

    /**
     * Full upload flow: get presigned URL → PUT to S3 → finalize.
     * The caller provides an `uploadToS3` adapter so this stays platform-agnostic
     * (mobile uses expo-file-system, web uses fetch/XHR).
     */
    upload: async (
      type: MediaType,
      mimeType: string,
      fileSize: number,
      uploadToS3: (uploadUrl: string) => Promise<void>,
      opts: { fileName?: string; publicUrl?: string; duration?: number } = {},
    ): Promise<Media> => {
      const { storageKey, uploadUrl, publicUrl } = await createMediaApi(client).getUploadUrl({
        type,
        mimeType,
        fileName: opts.fileName,
      })

      await uploadToS3(uploadUrl)

      return createMediaApi(client).finalize({
        storageKey,
        url: opts.publicUrl ?? publicUrl,
        type,
        mimeType,
        fileSize,
        fileName: opts.fileName,
        duration: opts.duration,
      })
    },
  }
}
