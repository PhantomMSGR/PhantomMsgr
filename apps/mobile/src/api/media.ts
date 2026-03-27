import axios from 'axios'
import * as FileSystem from 'expo-file-system/legacy'
import { apiClient } from './client'
import type { Media, MediaType } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

interface UploadUrlDto {
  type: MediaType
  mimeType: string
  fileName?: string
}

interface FinalizeDto {
  storageKey: string
  url: string
  type: MediaType
  mimeType: string
  fileSize: number
  fileName?: string
  duration?: number
}

export const mediaApi = {
  getUploadUrl: async (dto: UploadUrlDto) => {
    const res = await apiClient.post('/media/upload-url', dto)
    return unwrap(res) as { storageKey: string; uploadUrl: string; publicUrl: string }
  },

  /**
   * Upload a local file URI directly to S3 using the presigned URL.
   * Uses FileSystem.uploadAsync for native streaming (no base64 overhead).
   */
  uploadToS3: async (
    uploadUrl: string,
    localUri: string,
    mimeType: string,
    onProgress?: (progress: number) => void,
  ): Promise<void> => {
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      localUri,
      {
        httpMethod: 'PUT',
        headers: { 'Content-Type': mimeType },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      },
      (uploadProgress) => {
        if (onProgress) {
          const progress =
            uploadProgress.totalBytesSent / uploadProgress.totalBytesExpectedToSend
          onProgress(progress)
        }
      },
    )

    const result = await uploadTask.uploadAsync()
    if (!result || result.status >= 400) {
      throw new Error(`S3 upload failed with status ${result?.status}`)
    }
  },

  finalize: async (dto: FinalizeDto): Promise<Media> => {
    const res = await apiClient.post('/media/finalize', dto)
    return unwrap(res)
  },

  get: async (mediaId: string): Promise<Media> => {
    const res = await apiClient.get(`/media/${mediaId}`)
    return unwrap(res)
  },

  getDownloadUrl: async (mediaId: string): Promise<string> => {
    const res = await apiClient.get(`/media/${mediaId}/download`)
    return (unwrap(res) as { url: string }).url
  },

  /**
   * Convenience: full upload flow in one call.
   * Returns the finalized Media record.
   */
  upload: async (
    localUri: string,
    type: MediaType,
    mimeType: string,
    fileName?: string,
    onProgress?: (progress: number) => void,
    durationMs?: number,
  ): Promise<Media> => {
    // Get file size
    const info = await FileSystem.getInfoAsync(localUri)
    const fileSize = info.exists && 'size' in info ? info.size : 0

    // Step 1 — get presigned URL
    const { storageKey, uploadUrl, publicUrl } = await mediaApi.getUploadUrl({
      type,
      mimeType,
      fileName,
    })

    // Step 2 — upload to S3
    await mediaApi.uploadToS3(uploadUrl, localUri, mimeType, onProgress)

    // Step 3 — finalize
    return mediaApi.finalize({
      storageKey,
      url: publicUrl,
      type,
      mimeType,
      fileSize,
      fileName,
      duration: durationMs != null ? Math.round(durationMs / 1000) : undefined,
    })
  },
}
