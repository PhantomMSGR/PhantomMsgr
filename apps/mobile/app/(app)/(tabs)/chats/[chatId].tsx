import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Ionicons } from '@expo/vector-icons'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { NativeViewGestureHandler } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { chatsApi } from '@/api/chats'
import { messagesApi } from '@/api/messages'
import { mediaApi } from '@/api/media'
import { QUERY_KEYS } from '@/config'
import { MessageBubble, CHAT_BG } from '@/components/chat/MessageBubble'
import { MessageInput } from '@/components/chat/MessageInput'
import { SwipeableMessage } from '@/components/chat/SwipeableMessage'
import { DateSeparator } from '@/components/chat/DateSeparator'
import { TypingIndicator } from '@/components/chat/TypingIndicator'
import { JumpToBottomFAB } from '@/components/chat/JumpToBottomFAB'
import { PinnedMessageBanner } from '@/components/chat/PinnedMessageBanner'
import { MessageContextMenu, type ContextMenuAction } from '@/components/chat/MessageContextMenu'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarConstructorModal, type AvatarResult } from '@/components/ui/AvatarConstructorModal'
import { useAuthStore } from '@/store/auth.store'
import { useSocketStore } from '@/store/socket.store'
import { toast } from '@/store/toast.store'
import { useInfiniteMessages } from '@/hooks/useInfiniteMessages'
import { useMessageGroups } from '@/hooks/useMessageGroups'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Chat, Media, Message, MessageListItem, MessageStatus, ReadUpdatedEvent } from '@/types'

// Must match FlashList's estimatedItemSize — used for scroll-driven pin selection.
const ESTIMATED_ITEM_HEIGHT = 72
// Conservative estimate of items visible on screen at once (header + input ~120 px, typical phone).
// Used to detect when a pin is inside the viewport so the banner skips it.
const APPROX_VIEWPORT_ITEMS = 10

// ─── Forward sheet ────────────────────────────────────────────────────────────

function ForwardSheet({
  message,
  currentChatId,
  onClose,
}: {
  message: Message | null
  currentChatId: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { data: chatsPage } = useQuery({
    queryKey: ['chats-forward-list'],
    queryFn: () => chatsApi.list(undefined, 50),
    enabled: !!message,
    staleTime: 30_000,
  })

  const chats: Chat[] = chatsPage?.items ?? []

  const forwardMutation = useMutation({
    mutationFn: async (targetChatId: string) => {
      await messagesApi.send(targetChatId, {
        type: message!.type,
        text: message!.text ?? undefined,
        mediaId: message!.mediaId ?? undefined,
        forwardFromMessageId: message!.id,
        forwardFromChatId: currentChatId,
      })
    },
    onSuccess: () => {
      toast.success('Forwarded')
      onClose()
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS })
    },
    onError: () => toast.error('Could not forward'),
  })

  if (!message) return null

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={forwardStyles.overlay} onPress={onClose}>
        <Pressable style={[forwardStyles.sheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24 }]} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700' }}>Forward to…</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {chats
              .map((c) => {
                const title =
                  c.type === 'saved' ? 'Saved Messages'
                  : c.type === 'direct' ? (c.peerName ?? c.title ?? 'User')
                  : c.title ?? 'Chat'
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => forwardMutation.mutate(c.id)}
                    disabled={forwardMutation.isPending}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 12,
                      padding: 12, borderRadius: 12,
                      backgroundColor: pressed ? colors.bgElevated : 'transparent',
                    })}
                  >
                    <Avatar name={title} emoji={c.avatarEmoji} color={c.avatarColor} size={40} />
                    <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }} numberOfLines={1}>{title}</Text>
                    {forwardMutation.isPending && <ActivityIndicator size="small" color={colors.primary} />}
                  </Pressable>
                )
              })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const forwardStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
  },
})

// ─── Chat screen ──────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const listRef = useRef<FlashListRef<MessageListItem>>(null)
  const scrollRef = useRef<NativeViewGestureHandler>(null)
  // Ref to avoid calling setShowFAB on every scroll event when value hasn't changed
  const showFABRef = useRef(false)

  const [replyTo, setReplyTo] = useState<{ id: string; text: string | null; senderName?: string | null } | null>(null)
  const [showFAB, setShowFAB] = useState(false)
  const [unreadBelow, setUnreadBelow] = useState(0)
  const [contextMenu, setContextMenu] = useState<{
    message: Message
    messageY: number
  } | null>(null)
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [showCallSheet, setShowCallSheet] = useState(false)
  const [showChatInfo, setShowChatInfo] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [statusMap, setStatusMap] = useState<Record<string, MessageStatus>>({})
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [pinnedBannerDismissed, setPinnedBannerDismissed] = useState(false)
  const [pinnedIndex, setPinnedIndex] = useState(0)
  // Mirrors pinnedIndex state so handleScroll can read it without a stale closure
  const pinnedIndexRef = useRef(0)
  const prevPinnedCountRef = useRef(0)
  // Pins sorted by their position in listItems (ascending = bottom→top of chat).
  // Stored in a ref so handleScroll can read it without re-creating the callback.
  const sortedPinsRef = useRef<Array<{ pinnedIdx: number; listIdx: number }>>([])
  // Current scroll offset — stored in a ref so the sortedPins effect can read it
  // when it rebuilds the sorted list (no scroll event fires at that moment).
  const scrollOffsetRef = useRef(0)
  // After a tap-to-navigate we suppress scroll-driven updates for a short window
  // so the cycling isn't immediately overridden by the programmatic scroll.
  const suppressScrollPinRef = useRef(false)
  const suppressScrollPinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Helper: set pinnedIndex state AND keep ref in sync
  const setActivePinnedIndex = useCallback((idx: number) => {
    pinnedIndexRef.current = idx
    setPinnedIndex(idx)
  }, [])

  const { data: chat } = useQuery({
    queryKey: QUERY_KEYS.CHAT(chatId),
    queryFn: () => chatsApi.get(chatId),
  })

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: QUERY_KEYS.PINNED_MESSAGES(chatId),
    queryFn: () => messagesApi.getPinned(chatId),
  })

  const {
    messages,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    prependMessage,
    replaceMessage,
    updateMessage,
  } = useInfiniteMessages(chatId)

  const listItems = useMessageGroups(messages, currentUser?.id)

  // Fast lookup: messageId → Message
  const messageMap = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages],
  )

  // Fast lookup: messageId → index in listItems (for scrollToIndex)
  const indexMap = useMemo(() => {
    const map = new Map<string, number>()
    listItems.forEach((item, i) => {
      if (item.type === 'message') map.set(item.message.id, i)
    })
    return map
  }, [listItems])

  // Set of pinned message IDs
  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages.map((m) => m.id)),
    [pinnedMessages],
  )

  // Rebuild the sorted-pins lookup whenever the pinned list or loaded messages change.
  // Pins not yet in indexMap (not yet loaded) are excluded; they'll appear once loaded.
  // After rebuilding, immediately recalculate the active pin based on the current scroll
  // offset (no scroll event fires at this moment, so we must do it here).
  useEffect(() => {
    const sorted = pinnedMessages
      .map((msg, pinnedIdx) => ({ pinnedIdx, listIdx: indexMap.get(msg.id) ?? -1 }))
      .filter(({ listIdx }) => listIdx >= 0)
      .sort((a, b) => a.listIdx - b.listIdx)
    sortedPinsRef.current = sorted

    if (sorted.length >= 1 && !suppressScrollPinRef.current) {
      const bottomVisible = Math.floor(scrollOffsetRef.current / ESTIMATED_ITEM_HEIGHT)
      const topVisible    = bottomVisible + APPROX_VIEWPORT_ITEMS
      let newPinIdx: number | null = null
      for (const pin of sorted) {
        if (pin.listIdx > topVisible) { newPinIdx = pin.pinnedIdx; break }
      }
      if (newPinIdx !== null && newPinIdx !== pinnedIndexRef.current) {
        setActivePinnedIndex(newPinIdx)
      }
    }
  }, [pinnedMessages, indexMap, setActivePinnedIndex])

  // React to pins being added or removed
  useEffect(() => {
    const prev = prevPinnedCountRef.current
    const curr = pinnedMessages.length
    if (curr > prev) {
      // New pin: re-show the banner and display the newest pin (index 0) immediately
      setPinnedBannerDismissed(false)
      setActivePinnedIndex(0)
    } else if (curr < prev && curr > 0) {
      // A pin was removed: clamp so the index stays in bounds
      const clamped = Math.min(pinnedIndexRef.current, curr - 1)
      setActivePinnedIndex(clamped)
    }
    prevPinnedCountRef.current = curr
  }, [pinnedMessages.length, setActivePinnedIndex])

  const { typingByChat, sendTypingStart, sendTypingStop, setOnReadUpdated } = useSocketStore()
  const typingUsers = typingByChat[chatId] ?? []

  const handleTypingStart = useCallback(() => {
    if (currentUser) sendTypingStart(chatId, currentUser.displayName)
  }, [chatId, currentUser, sendTypingStart])

  const handleTypingStop = useCallback(() => {
    sendTypingStop(chatId)
  }, [chatId, sendTypingStop])

  // ── Read status ────────────────────────────────────────────────────────────

  const handleReadUpdated = useCallback(
    (event: ReadUpdatedEvent) => {
      if (event.chatId !== chatId) return
      // Mark all tracked own messages as read
      setStatusMap((prev) => {
        const next = { ...prev }
        let changed = false
        for (const id of Object.keys(next)) {
          if (next[id] === 'sent' || next[id] === 'delivered') {
            next[id] = 'read'
            changed = true
          }
        }
        return changed ? next : prev
      })
    },
    [chatId],
  )

  useEffect(() => {
    setOnReadUpdated(handleReadUpdated)
    return () => setOnReadUpdated(null)
  }, [setOnReadUpdated, handleReadUpdated])

  // Auto-mark read whenever the newest message changes (user is in the chat)
  const newestMessageId = listItems[0]?.type === 'message' ? listItems[0].message.id : null
  useEffect(() => {
    if (!newestMessageId) return
    messagesApi.markRead(chatId, newestMessageId).catch(() => {})
  }, [chatId, newestMessageId])

  // Scroll to a message and briefly flash-highlight it
  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = indexMap.get(messageId)
      if (index === undefined) {
        toast.info('Message not loaded')
        return
      }
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
      setHighlightedMessageId(messageId)
      setTimeout(() => setHighlightedMessageId(null), 2200)
    },
    [indexMap],
  )

  const handlePinnedBannerPress = useCallback(() => {
    const msg = pinnedMessages[pinnedIndex]
    if (!msg) return

    scrollToMessage(msg.id)

    // Advance to the next pin in positional order (bottom→top) so the user can
    // cycle through all pins with repeated taps regardless of scroll position.
    const sorted = sortedPinsRef.current
    if (sorted.length > 1) {
      const curSortedIdx = sorted.findIndex(p => p.pinnedIdx === pinnedIndexRef.current)
      const nextPinnedIdx = sorted[(curSortedIdx + 1) % sorted.length].pinnedIdx
      setActivePinnedIndex(nextPinnedIdx)

      // Suppress scroll-driven updates briefly: the programmatic scroll from
      // scrollToMessage would otherwise immediately override the cycling.
      suppressScrollPinRef.current = true
      if (suppressScrollPinTimerRef.current) clearTimeout(suppressScrollPinTimerRef.current)
      suppressScrollPinTimerRef.current = setTimeout(() => {
        suppressScrollPinRef.current = false
      }, 700)
    }
  }, [pinnedMessages, pinnedIndex, scrollToMessage, setActivePinnedIndex])

  const sendMutation = useMutation({
    mutationFn: async ({
      text,
      tempId,
      replyToId,
    }: {
      text: string
      tempId: string
      replyToId?: string
    }) => {
      const msg = await messagesApi.send(chatId, {
        type: 'text',
        text,
        replyToMessageId: replyToId,
      })
      return { msg, tempId }
    },
    onMutate: ({ text, tempId, replyToId }) => {
      // Optimistically add message to top of list immediately
      const optimistic: Message = {
        id: tempId,
        chatId,
        senderId: currentUser?.id ?? null,
        type: 'text',
        text,
        mediaId: null,
        media: null,
        replyToMessageId: replyToId ?? null,
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      prependMessage(optimistic)
      setStatusMap((prev) => ({ ...prev, [tempId]: 'sending' }))
      setTimeout(() => listRef.current?.scrollToIndex({ index: 0, animated: true }), 40)
    },
    onSuccess: ({ msg, tempId }) => {
      // Replace temp placeholder with real server message
      replaceMessage(tempId, msg)
      setStatusMap((prev) => {
        const { [tempId]: _, ...rest } = prev
        return { ...rest, [msg.id]: 'sent' }
      })
      setReplyTo(null)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS })
      // For Saved Messages: mark as read immediately (you're the only member)
      if (chat?.type === 'saved') {
        messagesApi.markRead(chatId, msg.id).catch(() => {})
      }
    },
    onError: (_, { tempId }) => {
      setStatusMap((prev) => ({ ...prev, [tempId]: 'failed' }))
      toast.error('Could not send message')
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1500 * 2 ** attempt, 15_000),
  })

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      })
      if (result.canceled || !result.assets[0]) return
      const asset = result.assets[0]
      const mimeType = asset.mimeType ?? 'image/jpeg'
      const media = await mediaApi.upload(asset.uri, 'photo', mimeType, asset.fileName ?? 'photo.jpg')
      await messagesApi.send(chatId, { type: 'photo', mediaId: media.id })
    },
    onError: () => toast.error('Upload failed'),
  })

  const handleContextAction = useCallback(
    async (action: ContextMenuAction, msg: Message) => {
      switch (action) {
        case 'reply': {
          const senderName = msg.senderId === currentUser?.id
            ? 'You'
            : undefined
          setReplyTo({ id: msg.id, text: msg.text, senderName })
          break
        }
        case 'copy':
          if (msg.text) {
            await Clipboard.setStringAsync(msg.text)
            toast.success('Copied to clipboard')
          }
          break
        case 'edit':
          if (msg.text !== null) {
            setEditingMessage({ id: msg.id, text: msg.text })
          }
          break
        case 'forward':
          setForwardMessage(msg)
          break
        case 'pin':
          try {
            if (pinnedMessageIds.has(msg.id)) {
              await messagesApi.unpin(chatId, msg.id)
              toast.success('Message unpinned')
            } else {
              await messagesApi.pin(chatId, msg.id)
              toast.success('Message pinned')
            }
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PINNED_MESSAGES(chatId) })
          } catch {
            toast.error('Could not update pin')
          }
          break
        case 'delete':
          Alert.alert('Delete message?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete for me',
              onPress: () => {
                updateMessage(msg.id, { isDeleted: true, deletedAt: new Date().toISOString(), deleteForEveryone: false })
                messagesApi.delete(chatId, msg.id, false).catch(() => {
                  updateMessage(msg.id, { isDeleted: false, deletedAt: null })
                  toast.error('Error')
                })
              },
            },
            {
              text: 'Delete for everyone',
              style: 'destructive',
              onPress: () => {
                updateMessage(msg.id, { isDeleted: true, deletedAt: new Date().toISOString(), deleteForEveryone: true })
                messagesApi.delete(chatId, msg.id, true).catch(() => {
                  updateMessage(msg.id, { isDeleted: false, deletedAt: null })
                  toast.error('Error')
                })
              },
            },
          ])
          break
      }
    },
    [chatId, currentUser?.id, pinnedMessageIds, queryClient],
  )

  const handleReact = useCallback(
    (emoji: string, msg: Message) => {
      // Optimistic update — increment the emoji count immediately
      const prev = msg.reactions ?? {}
      const optimistic = { ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }
      updateMessage(msg.id, { reactions: optimistic })

      messagesApi.react(chatId, msg.id, emoji).catch(() => {
        // Revert on failure
        updateMessage(msg.id, { reactions: prev })
        toast.error('Could not react')
      })
    },
    [chatId, updateMessage],
  )

  const handleLongPress = useCallback(
    (msg: Message, _pageX: number, pageY: number) => {
      setContextMenu({ message: msg, messageY: pageY })
    },
    [],
  )

  const handleSwipeReply = useCallback((msg: Message) => {
    const senderName = msg.senderId === currentUser?.id ? 'You' : undefined
    setReplyTo({ id: msg.id, text: msg.text, senderName })
  }, [currentUser?.id])

  const handleScroll = useCallback((event: any) => {
    const offset = event.nativeEvent.contentOffset.y
    scrollOffsetRef.current = offset

    // ── FAB visibility ──────────────────────────────────────────────────────
    const shouldShow = offset > 300
    if (shouldShow !== showFABRef.current) {
      showFABRef.current = shouldShow
      setShowFAB(shouldShow)
    }

    // ── Scroll-driven pinned banner ─────────────────────────────────────────
    // Inverted list (scaleY: -1): offset=0 → newest messages at bottom.
    // As offset increases the user scrolls up (higher listIdx = older messages).
    //
    // bottomVisibleIdx ≈ newest item currently on screen (visual bottom).
    // topVisibleIdx    ≈ oldest item currently on screen (visual top).
    //
    // Rule: show the first pin whose listIdx is STRICTLY ABOVE the viewport top
    // (the next pin the user will reach as they scroll up). If no such pin exists
    // (all pins are visible or already passed), we leave the banner unchanged —
    // let the user tap to cycle instead of jumping to an arbitrary fallback.
    const sorted = sortedPinsRef.current
    if (sorted.length >= 1 && !suppressScrollPinRef.current) {
      const bottomVisibleIdx = Math.floor(offset / ESTIMATED_ITEM_HEIGHT)
      const topVisibleIdx    = bottomVisibleIdx + APPROX_VIEWPORT_ITEMS

      let newPinIdx: number | null = null
      for (const pin of sorted) {
        if (pin.listIdx > topVisibleIdx) { newPinIdx = pin.pinnedIdx; break }
      }
      // Scrolled past all pins → show the topmost one (highest listIdx)
      if (newPinIdx === null) newPinIdx = sorted[sorted.length - 1].pinnedIdx

      if (newPinIdx !== pinnedIndexRef.current) {
        pinnedIndexRef.current = newPinIdx
        setPinnedIndex(newPinIdx)
      }
    }
  }, [])

  const chatTitle =
    chat?.type === 'saved' ? 'Saved Messages'
    : chat?.type === 'direct' ? (chat.peerName ?? chat.title ?? 'User')
    : chat?.title ?? 'Chat'

  const chatSubtitle =
    chat?.type === 'saved' ? null
    : chat?.type === 'direct' ? null
    : chat?.memberCount ? `${chat.memberCount} members`
    : null

  const renderItem = useCallback(
    ({ item }: { item: MessageListItem }) => {
      if (item.type === 'date') {
        return (
          <View style={styles.invertedItem}>
            <DateSeparator date={item.date} />
          </View>
        )
      }
      const { message, isFirst, isLast, showAvatar } = item
      const isOwn = message.senderId === currentUser?.id
      const status = isOwn ? (statusMap[message.id] ?? 'sent') : undefined
      const replyToMessage = message.replyToMessageId
        ? (messageMap.get(message.replyToMessageId) ?? null)
        : null
      const replyToSenderName = replyToMessage?.senderId === currentUser?.id
        ? 'You'
        : undefined

      return (
        <View style={styles.invertedItem}>
          <SwipeableMessage message={message} isOwn={isOwn} onSwipeReply={handleSwipeReply} scrollRef={scrollRef}>
            <MessageBubble
              message={message}
              isOwn={isOwn}
              isFirst={isFirst}
              isLast={isLast}
              showAvatar={showAvatar}
              status={status}
              onLongPress={handleLongPress}
              onReplyPress={scrollToMessage}
              replyToMessage={replyToMessage}
              replyToSenderName={replyToSenderName}
              highlighted={highlightedMessageId === message.id}
            />
          </SwipeableMessage>
        </View>
      )
    },
    [currentUser?.id, statusMap, handleSwipeReply, handleLongPress, messageMap, scrollToMessage, highlightedMessageId, scrollRef],
  )

  const showPinnedBanner = pinnedMessages.length > 0 && !pinnedBannerDismissed

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>

          <Pressable style={styles.headerCenter} hitSlop={6}>
            <View style={styles.avatarWrap}>
              <Avatar name={chatTitle} emoji={chat?.avatarEmoji} color={chat?.avatarColor} size={36} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.chatTitle} numberOfLines={1}>{chatTitle}</Text>
              {typingUsers.length > 0 ? (
                <View style={styles.typingRow}>
                  <TypingIndicator visible />
                  <Text style={styles.typingText}>
                    {typingUsers.map((t) => t.displayName).join(', ')}
                    {typingUsers.length === 1 ? ' is typing…' : ' are typing…'}
                  </Text>
                </View>
              ) : chatSubtitle ? (
                <Text style={styles.memberCount}>{chatSubtitle}</Text>
              ) : null}
            </View>
          </Pressable>

          <View style={styles.headerActions}>
            {chat?.type !== 'saved' && (
              <Pressable hitSlop={10} style={styles.headerBtn} onPress={() => setShowCallSheet(true)}>
                <Ionicons name="call-outline" size={21} color={colors.textSecondary} />
              </Pressable>
            )}
            <Pressable hitSlop={10} style={styles.headerBtn} onPress={() => setShowChatInfo(true)}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Pinned message banner */}
        {showPinnedBanner && (
          <PinnedMessageBanner
            messages={pinnedMessages}
            currentIndex={pinnedIndex}
            onPress={handlePinnedBannerPress}
            onClose={() => setPinnedBannerDismissed(true)}
          />
        )}

        {/* Message list + FAB wrapper (FAB must be outside the scaleY:-1 listContainer) */}
        <View style={styles.listWrapper}>
        <View style={styles.listContainer}>
          {/* Subtle wallpaper gradient behind the messages */}
          <LinearGradient
            colors={['rgba(37,99,235,0.04)', 'transparent', 'rgba(37,99,235,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingBubbles}>
                {[70, 50, 85, 45, 65].map((w, i) => (
                  <View
                    key={i}
                    style={[
                      styles.loadingBubble,
                      i % 2 === 0 ? styles.loadingBubbleOwn : styles.loadingBubbleOther,
                      { width: `${w}%` as any },
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : (
            <NativeViewGestureHandler ref={scrollRef} disallowInterruption={false}>
              <FlashList
                ref={listRef}
                data={listItems}
                estimatedItemSize={72}
                keyExtractor={(item) =>
                  item.type === 'date' ? `date-${item.date}` : item.message.id
                }
                renderItem={renderItem}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage()
                }}
                onEndReachedThreshold={0.3}
                contentContainerStyle={{ paddingVertical: 8 }}
                ListEmptyComponent={
                  <View style={styles.emptyMessages}>
                    <View style={styles.invertedItem}>
                      <Text style={styles.emptyMessagesText}>No messages yet. Say hi! 👋</Text>
                    </View>
                  </View>
                }
              />
            </NativeViewGestureHandler>
          )}
        </View>
          <JumpToBottomFAB
            visible={showFAB}
            unreadCount={unreadBelow}
            onPress={() => {
              listRef.current?.scrollToIndex({ index: 0, animated: true })
              setUnreadBelow(0)
            }}
          />
        </View>

        <MessageInput
          chatId={chatId}
          onSend={(text) => {
            const tempId = `temp-${Date.now()}`
            return sendMutation.mutateAsync({ text, tempId, replyToId: replyTo?.id }).then(() => {})
          }}
          onEdit={async (messageId, text) => {
            updateMessage(messageId, { text, isEdited: true, editedAt: new Date().toISOString() })
            try {
              await messagesApi.edit(chatId, messageId, { text })
            } catch {
              toast.error('Could not edit message')
            }
          }}
          onSendVoice={async (uri, durationMs) => {
            const tempId = `temp-${Date.now()}`
            const durationSec = durationMs != null ? Math.round(durationMs / 1000) : undefined
            // Optimistic insert so the bubble appears immediately
            const optimisticMedia: Media = {
              id: tempId,
              type: 'voice',
              url: uri,
              mimeType: 'audio/m4a',
              fileSize: 0,
              fileName: 'voice.m4a',
              storageKey: '',
              uploaderId: currentUser?.id ?? null,
              duration: durationSec ?? null,
              width: null,
              height: null,
              thumbnailKey: null,
              thumbnailUrl: null,
              waveform: null,
              isAnimated: false,
              createdAt: new Date().toISOString(),
            }
            const optimistic: Message = {
              id: tempId,
              chatId,
              senderId: currentUser?.id ?? null,
              type: 'voice',
              text: null,
              mediaId: tempId,
              media: optimisticMedia,
              replyToMessageId: null,
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
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            prependMessage(optimistic)
            setStatusMap((prev) => ({ ...prev, [tempId]: 'sending' }))
            setTimeout(() => listRef.current?.scrollToIndex({ index: 0, animated: true }), 40)
            try {
              const media = await mediaApi.upload(uri, 'voice', 'audio/m4a', 'voice.m4a', undefined, durationMs)
              const msg = await messagesApi.send(chatId, { type: 'voice', mediaId: media.id })
              replaceMessage(tempId, msg)
              setStatusMap((prev) => {
                const { [tempId]: _, ...rest } = prev
                return { ...rest, [msg.id]: 'sent' }
              })
              queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS })
            } catch (err) {
              console.error('[voice] send failed:', err)
              setStatusMap((prev) => ({ ...prev, [tempId]: 'failed' }))
              toast.error('Could not send voice message')
            }
          }}
          onAttachImage={() => uploadMutation.mutate()}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </KeyboardAvoidingView>

      <MessageContextMenu
        message={contextMenu?.message ?? null}
        isOwn={contextMenu?.message?.senderId === currentUser?.id}
        isPinned={contextMenu?.message ? pinnedMessageIds.has(contextMenu.message.id) : false}
        messageY={contextMenu?.messageY ?? 0}
        onClose={() => setContextMenu(null)}
        onAction={handleContextAction}
        onReact={handleReact}
      />

      {/* Call coming soon sheet */}
      <Modal visible={showCallSheet} transparent animationType="fade" onRequestClose={() => setShowCallSheet(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCallSheet(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24, paddingTop: 28 }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="call-outline" size={30} color={colors.primary} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>{'Voice & Video Calls'}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
                Calls are coming soon. We're working hard to bring you secure, encrypted voice and video calls.
              </Text>
              <Pressable
                onPress={() => setShowCallSheet(false)}
                style={{ marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12 }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Got it</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Chat info / members sheet */}
      <Modal visible={showChatInfo} transparent animationType="slide" onRequestClose={() => setShowChatInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowChatInfo(false)}>
          <Pressable style={[styles.modalSheet, { paddingBottom: Platform.OS === 'ios' ? 40 : 24, minHeight: 200 }]} onPress={(e) => e.stopPropagation()}>
            {/* Avatar preview (tap to edit for group/channel owner) */}
            <Pressable
              style={{ alignItems: 'center', marginBottom: 12 }}
              onPress={() => {
                if (chat?.type === 'group' || chat?.type === 'channel') {
                  setShowChatInfo(false)
                  setShowAvatarPicker(true)
                }
              }}
              disabled={chat?.type !== 'group' && chat?.type !== 'channel'}
            >
              <View style={{ position: 'relative' }}>
                <Avatar name={chatTitle} emoji={chat?.avatarEmoji} color={chat?.avatarColor} size={64} />
                {(chat?.type === 'group' || chat?.type === 'channel') && (
                  <View style={{
                    position: 'absolute', bottom: 0, right: -2,
                    width: 22, height: 22, borderRadius: 11,
                    backgroundColor: colors.primary,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: 2, borderColor: colors.bgSurface,
                  }}>
                    <Ionicons name="camera" size={11} color="#fff" />
                  </View>
                )}
              </View>
            </Pressable>

            <Text style={styles.modalLabel}>{chatTitle}</Text>
            {chatSubtitle ? <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 16 }}>{chatSubtitle}</Text> : null}
            <View style={{ gap: 8 }}>
              {(chat?.type === 'group' || chat?.type === 'channel') && (
                <>
                  <Pressable
                    onPress={() => { setShowChatInfo(false); setShowAvatarPicker(true) }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.bgElevated, borderRadius: 12 }}
                  >
                    <Ionicons name="image-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Edit Avatar</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { setShowChatInfo(false); router.push({ pathname: '/(app)/new-chat', params: { addToChat: chatId } }) }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.bgElevated, borderRadius: 12 }}
                  >
                    <Ionicons name="person-add-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Add Members</Text>
                  </Pressable>
                </>
              )}
              <Pressable
                onPress={() => setShowChatInfo(false)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.bgElevated, borderRadius: 12 }}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Close</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Forward message sheet */}
      <ForwardSheet
        message={forwardMessage}
        currentChatId={chatId}
        onClose={() => setForwardMessage(null)}
      />

      {/* Avatar constructor for group/channel */}
      {showAvatarPicker && (
        <AvatarConstructorModal
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onConfirm={async (result) => {
            try {
              if (result.type === 'emoji') {
                await chatsApi.update(chatId, { avatarEmoji: result.emoji, avatarColor: result.color })
                queryClient.setQueryData<Chat>(QUERY_KEYS.CHAT(chatId), (old) =>
                  old ? { ...old, avatarEmoji: result.emoji, avatarColor: result.color, avatarMediaId: null } : old
                )
              } else if (result.type === 'photo') {
                const media = await mediaApi.upload(result.imageUri, 'photo', 'image/jpeg', 'avatar.jpg')
                await chatsApi.update(chatId, { avatarEmoji: null, avatarColor: null })
                queryClient.setQueryData<Chat>(QUERY_KEYS.CHAT(chatId), (old) =>
                  old ? { ...old, avatarMediaId: media.id, avatarEmoji: null, avatarColor: null } : old
                )
              }
              toast.success('Avatar updated')
            } catch {
              toast.error('Could not update avatar')
            }
            setShowAvatarPicker(false)
          }}
          currentEmoji={chat?.avatarEmoji}
          currentColor={chat?.avatarColor}
          name={chatTitle}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  flex: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bgSurface,
    gap: 4,
  },
  backBtn: {
    padding: 4,
    marginRight: 0,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.bgSurface,
  },
  headerInfo: {
    flex: 1,
  },
  chatTitle: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typingText: {
    color: colors.primary,
    fontSize: 11,
  },
  memberCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listWrapper: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
    transform: [{ scaleY: -1 }],
    backgroundColor: CHAT_BG,
  },
  invertedItem: {
    transform: [{ scaleY: -1 }],
  },
  loadingContainer: {
    flex: 1,
    transform: [{ scaleY: -1 }],
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingBubbles: {
    gap: 10,
  },
  loadingBubble: {
    height: 38,
    borderRadius: 16,
    opacity: 0.18,
    backgroundColor: colors.textPrimary,
  },
  loadingBubbleOwn: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 3,
  },
  loadingBubbleOther: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 3,
  },
  emptyMessages: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  emptyMessagesText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
  },
  modalLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
})
