import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import { messagesApi } from '@/api/messages'
import { QUERY_KEYS } from '@/config'
import { useSocketStore } from '@/store/socket.store'
import type {
  Message,
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  ReactionEvent,
} from '@/types'

export function useInfiniteMessages(chatId: string) {
  const queryClient = useQueryClient()

  // ── Fetch pages ───────────────────────────────────────────────────────────

  const query = useInfiniteQuery({
    queryKey: QUERY_KEYS.MESSAGES(chatId),
    queryFn: ({ pageParam }) =>
      messagesApi.list(chatId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
  })

  // Flat list of messages (newest first from API, we reverse for display)
  const messages: Message[] = (query.data?.pages ?? [])
    .flatMap((p) => p.items)
    .reverse()

  // ── Helpers to mutate cache ───────────────────────────────────────────────

  const prependMessage = useCallback(
    (msg: Message) => {
      queryClient.setQueryData(
        QUERY_KEYS.MESSAGES(chatId),
        (old: typeof query.data) => {
          if (!old) return old
          const [first, ...rest] = old.pages
          // Dedup: skip if message with this ID is already in cache
          if (first.items.some((m) => m.id === msg.id)) return old
          return {
            ...old,
            pages: [{ ...first, items: [msg, ...first.items] }, ...rest],
          }
        },
      )
    },
    [chatId, queryClient],
  )

  const updateMessage = useCallback(
    (messageId: string, patch: Partial<Message>) => {
      queryClient.setQueryData(
        QUERY_KEYS.MESSAGES(chatId),
        (old: typeof query.data) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
            })),
          }
        },
      )
    },
    [chatId, queryClient],
  )

  // Replace a temp optimistic message (by tempId) with the real server message
  const replaceMessage = useCallback(
    (tempId: string, realMsg: Message) => {
      queryClient.setQueryData(
        QUERY_KEYS.MESSAGES(chatId),
        (old: typeof query.data) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              items: page.items.map((m) => (m.id === tempId ? realMsg : m)),
            })),
          }
        },
      )
    },
    [chatId, queryClient],
  )

  // ── Socket event handlers ─────────────────────────────────────────────────

  const handleNewMessage = useCallback(
    (event: MessageCreatedEvent) => {
      if (event.chatId !== chatId) return
      prependMessage({
        id: event.messageId,
        chatId: event.chatId,
        senderId: event.senderId,
        type: event.type,
        text: event.text,
        mediaId: event.mediaId,
        replyToMessageId: event.replyToMessageId,
        forwardFromMessageId: null,
        forwardFromChatId: null,
        forwardSenderName: null,
        isEdited: false,
        editedAt: null,
        isDeleted: false,
        deletedAt: null,
        deleteForEveryone: false,
        ttlSeconds: null,
        ttlExpiresAt: null,
        viewsCount: 0,
        forwardsCount: 0,
        repliesCount: 0,
        reactions: {},
        entities: [],
        isEncrypted: false,
        createdAt: event.createdAt,
        updatedAt: event.createdAt,
      })
    },
    [chatId, prependMessage],
  )

  const handleMessageEdited = useCallback(
    (event: MessageEditedEvent) => {
      if (event.chatId !== chatId) return
      updateMessage(event.messageId, {
        text: event.text,
        entities: event.entities,
        isEdited: true,
        editedAt: event.editedAt,
      })
    },
    [chatId, updateMessage],
  )

  const handleMessageDeleted = useCallback(
    (event: MessageDeletedEvent) => {
      if (event.chatId !== chatId) return
      updateMessage(event.messageId, {
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deleteForEveryone: event.deleteForEveryone,
      })
    },
    [chatId, updateMessage],
  )

  const handleReaction = useCallback(
    (event: ReactionEvent) => {
      if (event.chatId !== chatId) return
      updateMessage(event.messageId, { reactions: event.reactions })
    },
    [chatId, updateMessage],
  )

  // ── Register socket listeners ─────────────────────────────────────────────

  const {
    joinChat, leaveChat,
    setOnMessage, setOnMessageEdited, setOnMessageDeleted, setOnReaction,
  } = useSocketStore()

  useEffect(() => {
    joinChat(chatId)
    setOnMessage(handleNewMessage)
    setOnMessageEdited(handleMessageEdited)
    setOnMessageDeleted(handleMessageDeleted)
    setOnReaction(handleReaction)

    return () => {
      leaveChat(chatId)
      setOnMessage(null)
      setOnMessageEdited(null)
      setOnMessageDeleted(null)
      setOnReaction(null)
    }
  }, [
    chatId,
    joinChat, leaveChat,
    setOnMessage, setOnMessageEdited, setOnMessageDeleted, setOnReaction,
    handleNewMessage, handleMessageEdited, handleMessageDeleted, handleReaction,
  ])

  return {
    messages,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    prependMessage,
    updateMessage,
    replaceMessage,
  }
}
