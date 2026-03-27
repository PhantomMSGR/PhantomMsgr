export const MEDIA_PATTERNS = {
  UPLOAD:         { cmd: 'media.upload' },
  GET_BY_ID:      { cmd: 'media.getById' },
  DELETE:         { cmd: 'media.delete' },
  GET_UPLOAD_URL: { cmd: 'media.presignedUpload' },
  GET_DOWNLOAD_URL: { cmd: 'media.presignedDownload' },
} as const
