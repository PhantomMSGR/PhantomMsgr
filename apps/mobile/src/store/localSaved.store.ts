import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { randomUUID } from 'expo-crypto'

export interface LocalMessage {
  id: string
  text: string
  createdAt: string
}

export interface LocalSavedChat {
  id: string   // always 'local-<uuid>'
  name: string
  createdAt: string
  messages: LocalMessage[]
}

interface LocalSavedState {
  chats: LocalSavedChat[]
  createChat: (name: string) => LocalSavedChat
  deleteChat: (id: string) => void
  renameChat: (id: string, name: string) => void
  addMessage: (chatId: string, text: string) => LocalMessage
  deleteMessage: (chatId: string, messageId: string) => void
}

export const useLocalSavedStore = create<LocalSavedState>()(
  persist(
    (set) => ({
      chats: [],

      createChat: (name) => {
        const chat: LocalSavedChat = {
          id: `local-${randomUUID()}`,
          name: name.trim() || 'Notes',
          createdAt: new Date().toISOString(),
          messages: [],
        }
        set((s) => ({ chats: [...s.chats, chat] }))
        return chat
      },

      deleteChat: (id) =>
        set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),

      renameChat: (id, name) =>
        set((s) => ({
          chats: s.chats.map((c) => (c.id === id ? { ...c, name } : c)),
        })),

      addMessage: (chatId, text) => {
        const msg: LocalMessage = {
          id: randomUUID(),
          text,
          createdAt: new Date().toISOString(),
        }
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId ? { ...c, messages: [...c.messages, msg] } : c,
          ),
        }))
        return msg
      },

      deleteMessage: (chatId, messageId) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? { ...c, messages: c.messages.filter((m) => m.id !== messageId) }
              : c,
          ),
        })),
    }),
    {
      name: 'phantom-local-saved',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
