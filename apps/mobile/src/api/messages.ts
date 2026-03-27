import { apiClient } from './client'
import type { Message, MessageEntity, MessageType, PaginatedResponse } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

interface SendMessageDto {
  type?: MessageType
  text?: string
  mediaId?: string
  replyToMessageId?: string
  forwardFromMessageId?: string
  forwardFromChatId?: string
  ttlSeconds?: number
  entities?: MessageEntity[]
}

interface EditMessageDto {
  text: string
  entities?: MessageEntity[]
}

export const messagesApi = {
  list: async (
    chatId: string,
    cursor?: string,
    limit = 30,
  ): Promise<PaginatedResponse<Message>> => {
    const params: Record<string, unknown> = { limit }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get(`/chats/${chatId}/messages`, { params })
    return unwrap(res)
  },

  send: async (chatId: string, dto: SendMessageDto): Promise<Message> => {
    const res = await apiClient.post(`/chats/${chatId}/messages`, {
      type: 'text',
      ...dto,
    })
    return unwrap(res)
  },

  edit: async (chatId: string, messageId: string, dto: EditMessageDto): Promise<Message> => {
    const res = await apiClient.patch(`/chats/${chatId}/messages/${messageId}`, dto)
    return unwrap(res)
  },

  delete: async (chatId: string, messageId: string, forEveryone = false): Promise<void> => {
    await apiClient.delete(`/chats/${chatId}/messages/${messageId}`, {
      params: { forEveryone: String(forEveryone) },
    })
  },

  react: async (
    chatId: string,
    messageId: string,
    emoji: string,
  ): Promise<{ reactions: Record<string, number> }> => {
    const res = await apiClient.post(`/chats/${chatId}/messages/${messageId}/react`, { emoji })
    return unwrap(res)
  },

  removeReaction: async (
    chatId: string,
    messageId: string,
  ): Promise<{ reactions: Record<string, number> }> => {
    const res = await apiClient.delete(`/chats/${chatId}/messages/${messageId}/react`)
    return unwrap(res)
  },

  markRead: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/messages/${messageId}/read`)
  },

  pin: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.post(`/chats/${chatId}/messages/${messageId}/pin`)
  },

  unpin: async (chatId: string, messageId: string): Promise<void> => {
    await apiClient.delete(`/chats/${chatId}/messages/${messageId}/pin`)
  },

  getPinned: async (chatId: string): Promise<Message[]> => {
    const res = await apiClient.get(`/chats/${chatId}/messages/pinned`)
    return unwrap(res)
  },
}
