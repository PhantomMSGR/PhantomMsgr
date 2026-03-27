import type { AxiosInstance } from 'axios'
import type { Chat, ChatMember, ChatType, Media, PaginatedResponse } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface CreateChatDto {
  type: ChatType
  title?: string
  description?: string
  memberIds?: string[]
  avatarEmoji?: string | null
  avatarColor?: string | null
}

export interface UpdateChatDto {
  title?: string
  description?: string
  isPublic?: boolean
  slowModeDelay?: number | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  avatarMediaId?: string | null
}

export interface UpdateMemberSettingsDto {
  isArchived?: boolean
  isMuted?: boolean
  muteUntil?: string | null
  isPinned?: boolean
}

export function createChatsApi(client: AxiosInstance) {
  return {
    list: async (cursor?: string, limit = 30): Promise<PaginatedResponse<Chat>> => {
      const params: Record<string, unknown> = { limit }
      if (cursor) params.cursor = cursor
      return unwrap(await client.get('/chats', { params }))
    },

    get: async (chatId: string): Promise<Chat> =>
      unwrap(await client.get(`/chats/${chatId}`)),

    create: async (dto: CreateChatDto): Promise<Chat> =>
      unwrap(await client.post('/chats', dto)),

    update: async (chatId: string, dto: UpdateChatDto): Promise<Chat> =>
      unwrap(await client.patch(`/chats/${chatId}`, dto)),

    delete: async (chatId: string): Promise<void> => {
      await client.delete(`/chats/${chatId}`)
    },

    updateMemberSettings: async (
      chatId: string,
      dto: UpdateMemberSettingsDto,
    ): Promise<{ ok: boolean }> =>
      unwrap(await client.patch(`/chats/${chatId}/members/me`, dto)),

    getMembers: async (chatId: string): Promise<ChatMember[]> =>
      unwrap(await client.get(`/chats/${chatId}/members`)),

    addMember: async (chatId: string, userId: string): Promise<void> => {
      await client.post(`/chats/${chatId}/members/${userId}`)
    },

    removeMember: async (chatId: string, userId: string): Promise<void> => {
      await client.delete(`/chats/${chatId}/members/${userId}`)
    },

    changeRole: async (
      chatId: string,
      userId: string,
      role: 'admin' | 'member',
    ): Promise<void> => {
      await client.patch(`/chats/${chatId}/members/${userId}/role`, { role })
    },

    banMember: async (
      chatId: string,
      userId: string,
      bannedUntil?: string,
    ): Promise<void> => {
      await client.post(`/chats/${chatId}/members/${userId}/ban`, { bannedUntil })
    },

    createInvite: async (chatId: string, opts: { maxUses?: number; expiresAt?: string } = {}) =>
      unwrap(await client.post('/chats/invites', { chatId, ...opts })),

    joinByInvite: async (inviteHash: string): Promise<{ chatId: string; ok: boolean }> =>
      unwrap(await client.post(`/chats/join/${inviteHash}`)),

    getMedia: async (
      chatId: string,
      cursor?: string,
      limit = 30,
    ): Promise<PaginatedResponse<Media>> => {
      const params: Record<string, unknown> = { limit }
      if (cursor) params.cursor = cursor
      return unwrap(await client.get(`/chats/${chatId}/media`, { params }))
    },
  }
}
