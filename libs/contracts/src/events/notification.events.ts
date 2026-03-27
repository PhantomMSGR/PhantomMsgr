export const NOTIFICATION_EVENTS = {
  SEND_PUSH: 'notification.push.send',
} as const

export interface SendPushEvent {
  recipientUserIds: string[]
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}
