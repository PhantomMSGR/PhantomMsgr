export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1'

export const WS_URL =
  (process.env.EXPO_PUBLIC_WS_URL as string | undefined) ?? 'http://localhost:3000'

export const SECURE_STORE_KEYS = {
  ANONYMOUS_TOKEN: 'phantom_anonymous_token',
  REFRESH_TOKEN:   'phantom_refresh_token',
} as const

export const QUERY_KEYS = {
  ME:       ['me'] as const,
  SETTINGS: ['settings'] as const,
  SESSIONS: ['sessions'] as const,
  CHATS:    ['chats'] as const,
  CHAT:     (id: string) => ['chats', id] as const,
  MEMBERS:  (id: string) => ['chats', id, 'members'] as const,
  MESSAGES: (chatId: string) => ['messages', chatId] as const,
  MEDIA:    (id: string) => ['media', id] as const,
  STORIES:  ['stories'] as const,
  STORY:    (id: string) => ['stories', id] as const,
  PINNED_MESSAGES: (chatId: string) => ['pinned', chatId] as const,
} as const
