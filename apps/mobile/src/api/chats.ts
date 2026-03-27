import { apiClient } from './client'
import type { Chat, ChatMember, ChatType, Media, PaginatedResponse } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

interface CreateChatDto {
  type: ChatType
  title?: string
  description?: string
  memberIds?: string[]
  avatarEmoji?: string | null
  avatarColor?: string | null
}

interface UpdateChatDto {
  title?: string
  description?: string
  isPublic?: boolean
  slowModeDelay?: number | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  avatarMediaId?: string | null
}

interface UpdateMemberSettingsDto {
  isArchived?: boolean
  isMuted?: boolean
  muteUntil?: string | null
  isPinned?: boolean
}

interface CreateInviteDto {
  maxUses?: number
  expiresAt?: string
}

export const chatsApi = {
  list: async (cursor?: string, limit = 30): Promise<PaginatedResponse<Chat>> => {
    const params: Record<string, unknown> = { limit }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get('/chats', { params })
    return unwrap(res)
  },

  get: async (chatId: string): Promise<Chat> => {
    const res = await apiClient.get(`/chats/${chatId}`)
    return unwrap(res)
  },

  create: async (dto: CreateChatDto): Promise<Chat> => {
    const res = await apiClient.post('/chats', dto)
    return unwrap(res)
  },

  update: async (chatId: string, dto: UpdateChatDto): Promise<Chat> => {
    const res = await apiClient.patch(`/chats/${chatId}`, dto)
    return unwrap(res)
  },

  delete: async (chatId: string): Promise<void> => {
    await apiClient.delete(`/chats/${chatId}`)
  },

  updateMemberSettings: async (chatId: string, dto: UpdateMemberSettingsDto): Promise<{ ok: boolean }> => {
    const res = await apiClient.patch(`/chats/${chatId}/members/me`, dto)
    return unwrap(res)
  },

  getMembers: async (chatId: string): Promise<ChatMember[]> => {
    const res = await apiClient.get(`/chats/${chatId}/members`)
    return unwrap(res)
  },

  addMember: async (chatId: string, targetUserId: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/members/${targetUserId}`)
  },

  removeMember: async (chatId: string, targetUserId: string): Promise<void> => {
    await apiClient.delete(`/chats/${chatId}/members/${targetUserId}`)
  },

  changeRole: async (chatId: string, targetUserId: string, role: 'admin' | 'member'): Promise<void> => {
    await apiClient.patch(`/chats/${chatId}/members/${targetUserId}/role`, { role })
  },

  banMember: async (chatId: string, targetUserId: string, bannedUntil?: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/members/${targetUserId}/ban`, { bannedUntil })
  },

  createInvite: async (chatId: string, dto: CreateInviteDto = {}) => {
    const res = await apiClient.post('/chats/invites', { chatId, ...dto })
    return unwrap(res)
  },

  joinByInvite: async (inviteHash: string): Promise<{ chatId: string; ok: boolean }> => {
    const res = await apiClient.post(`/chats/join/${inviteHash}`)
    return unwrap(res)
  },

  getMedia: async (
    chatId: string,
    cursor?: string,
    limit = 30,
  ): Promise<PaginatedResponse<Media>> => {
    const params: Record<string, unknown> = { limit }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get(`/chats/${chatId}/media`, { params })
    return unwrap(res)
  },
}
