import type { AxiosInstance } from 'axios'
import type { Message, MessageEntity, MessageType, PaginatedResponse } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface SendMessageDto {
  type?: MessageType
  text?: string
  mediaId?: string
  replyToMessageId?: string
  forwardFromMessageId?: string
  forwardFromChatId?: string
  ttlSeconds?: number
  entities?: MessageEntity[]
}

export function createMessagesApi(client: AxiosInstance) {
  return {
    list: async (
      chatId: string,
      cursor?: string,
      limit = 30,
    ): Promise<PaginatedResponse<Message>> => {
      const params: Record<string, unknown> = { limit }
      if (cursor) params.cursor = cursor
      return unwrap(await client.get(`/chats/${chatId}/messages`, { params }))
    },

    send: async (chatId: string, dto: SendMessageDto): Promise<Message> =>
      unwrap(await client.post(`/chats/${chatId}/messages`, { type: 'text', ...dto })),

    edit: async (
      chatId: string,
      messageId: string,
      dto: { text: string; entities?: MessageEntity[] },
    ): Promise<Message> =>
      unwrap(await client.patch(`/chats/${chatId}/messages/${messageId}`, dto)),

    delete: async (
      chatId: string,
      messageId: string,
      forEveryone = false,
    ): Promise<void> => {
      await client.delete(`/chats/${chatId}/messages/${messageId}`, {
        params: { forEveryone: String(forEveryone) },
      })
    },

    react: async (
      chatId: string,
      messageId: string,
      emoji: string,
    ): Promise<{ reactions: Record<string, number> }> =>
      unwrap(await client.post(`/chats/${chatId}/messages/${messageId}/react`, { emoji })),

    removeReaction: async (
      chatId: string,
      messageId: string,
    ): Promise<{ reactions: Record<string, number> }> =>
      unwrap(await client.delete(`/chats/${chatId}/messages/${messageId}/react`)),

    markRead: async (chatId: string, messageId: string): Promise<void> => {
      await client.post(`/chats/${chatId}/messages/${messageId}/read`)
    },

    pin: async (chatId: string, messageId: string): Promise<void> => {
      await client.post(`/chats/${chatId}/messages/${messageId}/pin`)
    },

    unpin: async (chatId: string, messageId: string): Promise<void> => {
      await client.delete(`/chats/${chatId}/messages/${messageId}/pin`)
    },

    getPinned: async (chatId: string): Promise<Message[]> =>
      unwrap(await client.get(`/chats/${chatId}/messages/pinned`)),
  }
}
