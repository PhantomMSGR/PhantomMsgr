export const MEDIA_EVENTS = {
  PROCESS:   'media.process',
  PROCESSED: 'media.processed',
} as const

export interface MediaProcessEvent {
  mediaId: string
  storageKey: string
  type: string
  mimeType: string
}

export interface MediaProcessedEvent {
  mediaId: string
  thumbnailKey: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  duration: number | null
  waveform: number[] | null
}
