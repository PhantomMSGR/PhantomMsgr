import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import { WS_URL } from '@/config'
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  ReactionEvent,
  ReadUpdatedEvent,
  TypingEvent,
  UserStatusEvent,
} from '@/types'

// ─── Typing state per chat ───────────────────────────────────────────────────

export interface TypingState {
  userId: string
  displayName: string
  timestamp: number
}

// ─── State shape ──────────────────────────────────────────────────────────────

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  typingByChat: Record<string, TypingState[]>     // chatId → list of who's typing
  presenceById: Record<string, UserStatusEvent>   // userId → online status

  // Actions
  connect: (accessToken: string) => void
  disconnect: () => void
  joinChat: (chatId: string) => void
  leaveChat: (chatId: string) => void
  sendTypingStart: (chatId: string, displayName: string) => void
  sendTypingStop: (chatId: string) => void

  // Listeners (set by features/screens that need real-time data)
  onMessage: ((event: MessageCreatedEvent) => void) | null
  onMessageEdited: ((event: MessageEditedEvent) => void) | null
  onMessageDeleted: ((event: MessageDeletedEvent) => void) | null
  onReaction: ((event: ReactionEvent) => void) | null
  onReadUpdated: ((event: ReadUpdatedEvent) => void) | null

  setOnMessage: (fn: ((event: MessageCreatedEvent) => void) | null) => void
  setOnMessageEdited: (fn: ((event: MessageEditedEvent) => void) | null) => void
  setOnMessageDeleted: (fn: ((event: MessageDeletedEvent) => void) | null) => void
  setOnReaction: (fn: ((event: ReactionEvent) => void) | null) => void
  setOnReadUpdated: (fn: ((event: ReadUpdatedEvent) => void) | null) => void
}

// ─── Typing cleanup interval ──────────────────────────────────────────────────
const TYPING_TIMEOUT_MS = 4_000

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  typingByChat: {},
  presenceById: {},

  onMessage: null,
  onMessageEdited: null,
  onMessageDeleted: null,
  onReaction: null,
  onReadUpdated: null,

  setOnMessage: (fn) => set({ onMessage: fn }),
  setOnMessageEdited: (fn) => set({ onMessageEdited: fn }),
  setOnMessageDeleted: (fn) => set({ onMessageDeleted: fn }),
  setOnReaction: (fn) => set({ onReaction: fn }),
  setOnReadUpdated: (fn) => set({ onReadUpdated: fn }),

  // ── connect ──────────────────────────────────────────────────────────────

  connect: (accessToken: string) => {
    const existing = get().socket
    if (existing?.connected) return

    const socket = io(WS_URL + '/ws', {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      transports: ['websocket'],
    })

    socket.on('connect', () => {
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    // ── Message events ────────────────────────────────────────────────────

    socket.on('message:new', (event: MessageCreatedEvent) => {
      get().onMessage?.(event)
    })

    socket.on('message:edited', (event: MessageEditedEvent) => {
      get().onMessageEdited?.(event)
    })

    socket.on('message:deleted', (event: MessageDeletedEvent) => {
      get().onMessageDeleted?.(event)
    })

    socket.on('message:reaction', (event: ReactionEvent) => {
      get().onReaction?.(event)
    })

    socket.on('message:read', (event: ReadUpdatedEvent) => {
      get().onReadUpdated?.(event)
    })

    // ── Typing events ─────────────────────────────────────────────────────

    socket.on('message:typing', (event: TypingEvent) => {
      set((state) => {
        const existing = (state.typingByChat[event.chatId] ?? []).filter(
          (t) => t.userId !== event.userId,
        )
        return {
          typingByChat: {
            ...state.typingByChat,
            [event.chatId]: [
              ...existing,
              { userId: event.userId, displayName: event.displayName, timestamp: Date.now() },
            ],
          },
        }
      })

      // Auto-clear after timeout
      setTimeout(() => {
        set((state) => {
          const now = Date.now()
          const list = (state.typingByChat[event.chatId] ?? []).filter(
            (t) => now - t.timestamp < TYPING_TIMEOUT_MS,
          )
          return {
            typingByChat: { ...state.typingByChat, [event.chatId]: list },
          }
        })
      }, TYPING_TIMEOUT_MS)
    })

    socket.on('typing:stop', ({ chatId, userId }: { chatId: string; userId: string }) => {
      set((state) => ({
        typingByChat: {
          ...state.typingByChat,
          [chatId]: (state.typingByChat[chatId] ?? []).filter((t) => t.userId !== userId),
        },
      }))
    })

    // ── Presence events ───────────────────────────────────────────────────

    socket.on('user:status', (event: UserStatusEvent) => {
      set((state) => ({
        presenceById: { ...state.presenceById, [event.userId]: event },
      }))
    })

    set({ socket })
  },

  // ── disconnect ───────────────────────────────────────────────────────────

  disconnect: () => {
    get().socket?.disconnect()
    set({ socket: null, isConnected: false, typingByChat: {}, presenceById: {} })
  },

  // ── chat room management ──────────────────────────────────────────────────

  joinChat: (chatId: string) => {
    get().socket?.emit('chat:join', { chatId })
  },

  leaveChat: (chatId: string) => {
    get().socket?.emit('chat:leave', { chatId })
  },

  // ── typing ────────────────────────────────────────────────────────────────

  sendTypingStart: (chatId: string, displayName: string) => {
    get().socket?.emit('typing:start', { chatId, displayName })
  },

  sendTypingStop: (chatId: string) => {
    get().socket?.emit('typing:stop', { chatId })
  },
}))
