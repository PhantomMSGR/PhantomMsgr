import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Animated, { FadeIn } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { chatsApi } from '@/api/chats'
import { QUERY_KEYS } from '@/config'
import { SwipeableChatListItem } from '@/components/chat/SwipeableChatListItem'
import { SearchBar } from '@/components/chat/SearchBar'
import { SkeletonChatList } from '@/components/ui/SkeletonChatListItem'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { useLocalSavedStore, type LocalSavedChat } from '@/store/localSaved.store'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Chat } from '@/types'

function localToChat(local: LocalSavedChat): Chat {
  const lastMsg = local.messages.at(-1)
  return {
    id: local.id,
    type: 'saved',
    savedType: 'local',
    title: local.name,
    description: null,
    avatarMediaId: null,
    avatarEmoji: '📱',
    avatarColor: null,
    createdBy: null,
    username: null,
    isPublic: false,
    inviteHash: null,
    memberCount: 1,
    messageCount: local.messages.length,
    lastMessageId: lastMsg?.id ?? null,
    lastMessageText: lastMsg?.text ?? null,
    lastMessageType: 'text',
    lastMessageAt: lastMsg?.createdAt ?? null,
    isVerified: false,
    slowModeDelay: null,
    linkedChatId: null,
    createdAt: local.createdAt,
    updatedAt: lastMsg?.createdAt ?? local.createdAt,
  }
}

export default function ChatsScreen() {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const localChats = useLocalSavedStore((s) => s.chats)
  const deleteLocalChat = useLocalSavedStore((s) => s.deleteChat)

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: QUERY_KEYS.CHATS,
      queryFn: ({ pageParam }) => chatsApi.list(pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    })

  const deleteMutation = useMutation({
    mutationFn: chatsApi.delete,
    onMutate: async (chatId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CHATS })
      const prev = queryClient.getQueryData(QUERY_KEYS.CHATS)
      queryClient.setQueryData(QUERY_KEYS.CHATS, (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.filter((c: Chat) => c.id !== chatId),
          })),
        }
      })
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.CHATS, ctx.prev)
      toast.error('Could not delete chat')
    },
    onSuccess: () => toast.success('Chat deleted'),
  })

  const archiveMutation = useMutation({
    mutationFn: ({ chatId, isArchived }: { chatId: string; isArchived: boolean }) =>
      chatsApi.updateMemberSettings(chatId, { isArchived }),
    onMutate: async ({ chatId, isArchived }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.CHATS })
      const prev = queryClient.getQueryData(QUERY_KEYS.CHATS)
      queryClient.setQueryData(QUERY_KEYS.CHATS, (old: any) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((c: Chat) =>
              c.id === chatId ? { ...c, isArchived } : c,
            ),
          })),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(QUERY_KEYS.CHATS, ctx.prev)
      toast.error('Could not archive chat')
    },
    onSuccess: (_data, { isArchived }) => {
      toast.success(isArchived ? 'Chat archived' : 'Chat unarchived')
    },
  })

  const remoteChats: Chat[] = useMemo(
    () =>
      (data?.pages ?? []).flatMap((p) =>
        p.items.map((c: Chat) =>
          c.type === 'saved' ? { ...c, savedType: 'remote' as const } : c,
        ),
      ),
    [data],
  )

  const virtualLocalChats = useMemo(() => localChats.map(localToChat), [localChats])

  const allChats: Chat[] = useMemo(() => {
    const combined = [...remoteChats, ...virtualLocalChats]
    return combined.sort((a, b) => {
      const ta = a.lastMessageAt ?? a.createdAt
      const tb = b.lastMessageAt ?? b.createdAt
      return tb.localeCompare(ta)
    })
  }, [remoteChats, virtualLocalChats])

  const activeChats = allChats.filter((c) => !c.isArchived)
  const archivedChats = allChats.filter((c) => c.isArchived)

  const displayChats = showArchived ? archivedChats : activeChats

  const filteredChats = searchQuery.trim()
    ? displayChats.filter((c) => {
        const q = searchQuery.toLowerCase()
        let title: string
        if (c.type === 'saved') title = c.title ?? 'Saved Messages'
        else if (c.type === 'direct') title = c.peerName ?? c.title ?? ''
        else title = c.title ?? ''
        return title.toLowerCase().includes(q)
      })
    : displayChats

  const handleChatPress = useCallback(
    (chatId: string) => {
      if (virtualLocalChats.some((c) => c.id === chatId)) {
        router.push(`/(app)/local-chat/${chatId}`)
      } else {
        router.push(`/(app)/(tabs)/chats/${chatId}`)
      }
    },
    [virtualLocalChats],
  )

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        {!isSearchExpanded && (
          <Text style={styles.title}>
            {showArchived ? 'Archived' : 'Chats'}
          </Text>
        )}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          isExpanded={isSearchExpanded}
          onExpand={() => setIsSearchExpanded(true)}
          onCancel={() => { setIsSearchExpanded(false); setSearchQuery('') }}
        />
        {!isSearchExpanded && (
          <Pressable
            onPress={() => router.push('/(app)/new-chat' as any)}
            style={styles.iconBtn}
          >
            <Ionicons name="create-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {/* Archived folder button */}
      {!showArchived && !searchQuery && archivedChats.length > 0 && !isLoading && (
        <Pressable
          onPress={() => setShowArchived(true)}
          style={({ pressed }) => [styles.archivedFolder, pressed && styles.archivedFolderPressed]}
        >
          <View style={styles.archivedIcon}>
            <Ionicons name="archive-outline" size={20} color={colors.primary} />
          </View>
          <Text style={styles.archivedLabel}>Archived</Text>
          <View style={styles.archivedRight}>
            <Text style={styles.archivedCount}>{archivedChats.length}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      )}

      {/* Back to chats button when showing archived */}
      {showArchived && (
        <Pressable
          onPress={() => setShowArchived(false)}
          style={({ pressed }) => [styles.backRow, pressed && styles.archivedFolderPressed]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={styles.backLabel}>Back to Chats</Text>
        </Pressable>
      )}

      {/* List */}
      {isLoading ? (
        <SkeletonChatList count={9} />
      ) : filteredChats.length === 0 ? (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.emptyState}
        >
          <Ionicons
            name={searchQuery ? 'search-outline' : showArchived ? 'archive-outline' : 'chatbubbles-outline'}
            size={40}
            color="rgba(255,255,255,0.15)"
          />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No chats found' : showArchived ? 'No archived chats' : 'No chats yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : showArchived
              ? 'Archived chats will appear here'
              : 'Start a conversation or create a group'}
          </Text>
        </Animated.View>
      ) : (
        <FlashList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.delay(Math.min(index * 20, 200)).duration(200)}>
              <SwipeableChatListItem
                chat={item}
                currentUserId={currentUser?.id ?? ''}
                onPress={handleChatPress}
                onDelete={(id) => {
                  if (id.startsWith('local-')) {
                    deleteLocalChat(id)
                  } else {
                    deleteMutation.mutate(id)
                  }
                }}
                onArchive={item.savedType === 'local' ? undefined : (id) => archiveMutation.mutate({ chatId: id, isArchived: !item.isArchived })}
                unreadCount={item.unreadCount ?? 0}
              />
            </Animated.View>
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  archivedFolder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 12,
  },
  archivedFolderPressed: {
    backgroundColor: colors.bgElevated,
  },
  archivedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archivedLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  archivedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  archivedCount: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  backLabel: {
    color: colors.primary,
    fontSize: fontSize.base,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
