export * from './types'
export * from './client'

export { createAuthApi } from './api/auth'
export { createChatsApi } from './api/chats'
export { createMessagesApi } from './api/messages'
export { createUsersApi } from './api/users'
export { createMediaApi } from './api/media'
export { createStoriesApi } from './api/stories'
export { createKeysApi } from './api/keys'

export type { RegisterDto, RecoverDto } from './api/auth'
export type { CreateChatDto, UpdateChatDto, UpdateMemberSettingsDto } from './api/chats'
export type { SendMessageDto } from './api/messages'
export type { UpdateProfileDto, UpdateSettingsDto, UserSearchResult } from './api/users'
export type { FinalizeDto } from './api/media'
export type { StoryViewer } from './api/stories'

// ─── Convenience factory ──────────────────────────────────────────────────────
// Creates all API modules bound to a single configured client.

import { createApiClient, type ApiClientOptions } from './client'
import { createAuthApi } from './api/auth'
import { createChatsApi } from './api/chats'
import { createMessagesApi } from './api/messages'
import { createUsersApi } from './api/users'
import { createMediaApi } from './api/media'
import { createStoriesApi } from './api/stories'
import { createKeysApi } from './api/keys'

export function createPhantomSdk(options: ApiClientOptions) {
  const client = createApiClient(options)

  return {
    ...client,
    auth: createAuthApi(client.instance),
    chats: createChatsApi(client.instance),
    messages: createMessagesApi(client.instance),
    users: createUsersApi(client.instance),
    media: createMediaApi(client.instance),
    stories: createStoriesApi(client.instance),
    keys: createKeysApi(client.instance),
  }
}

export type PhantomSdk = ReturnType<typeof createPhantomSdk>
