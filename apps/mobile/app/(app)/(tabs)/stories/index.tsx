import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { storiesApi } from '@/api/stories'
import { mediaApi } from '@/api/media'
import { QUERY_KEYS } from '@/config'
import { Avatar } from '@/components/ui/Avatar'
import { useAuthStore } from '@/store/auth.store'
import { toast } from '@/store/toast.store'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Story } from '@/types'

function StoryRing({
  name,
  seen = false,
  onPress,
}: {
  userId: string
  name: string
  seen?: boolean
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.storyRingWrapper}>
      <View style={[styles.storyRingBorder, seen ? styles.storyRingSeen : styles.storyRingUnseen]}>
        <Avatar name={name} size={52} />
      </View>
      <Text style={styles.storyRingName} numberOfLines={1}>{name}</Text>
    </Pressable>
  )
}

function StoryCard({ story, onPress }: { story: Story; onPress: (story: Story) => void }) {
  return (
    <Pressable onPress={() => onPress(story)} style={styles.card}>
      <Image
        source={{ uri: `https://picsum.photos/seed/${story.id}/400/300` }}
        style={styles.cardImage}
        contentFit="cover"
        placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
        transition={200}
      />
      <View style={styles.cardOverlay}>
        {story.caption ? (
          <Text style={styles.cardCaption} numberOfLines={2}>{story.caption}</Text>
        ) : null}
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaText}>
            {new Date(story.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <View style={styles.cardStats}>
            <View style={styles.cardStat}>
              <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.cardMetaText}>{story.viewsCount}</Text>
            </View>
            {story.reactionsCount > 0 && (
              <View style={styles.cardStat}>
                <Ionicons name="heart-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={styles.cardMetaText}>{story.reactionsCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  )
}

function PhantomStoryRing({ seen, onPress }: { seen: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.storyRingWrapper, { marginRight: 14 }]}>
      <LinearGradient
        colors={seen ? ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.15)'] : ['#6366f1', '#3b82f6', '#06b6d4']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.phantomGradientRing}
      >
        <View style={styles.phantomAvatarInner}>
          <Text style={styles.phantomEmoji}>👻</Text>
        </View>
      </LinearGradient>
      <Text style={styles.storyRingName}>Phantom</Text>
    </Pressable>
  )
}

export default function StoriesScreen() {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [phantomSeen, setPhantomSeen] = useState(false)

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useInfiniteQuery({
      queryKey: QUERY_KEYS.STORIES,
      queryFn: ({ pageParam }) => storiesApi.getFeed(pageParam as string | undefined),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => (last.hasMore ? (last.nextCursor ?? undefined) : undefined),
    })

  const stories: Story[] = (data?.pages ?? []).flatMap((p) => p.items)

  const createMutation = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: true,
        aspect: [9, 16],
      })
      if (result.canceled || !result.assets[0]) return false
      const asset = result.assets[0]
      const media = await mediaApi.upload(
        asset.uri, 'story', asset.mimeType ?? 'image/jpeg', asset.fileName ?? 'story.jpg',
      )
      await storiesApi.create({ mediaId: media.id })
      return true
    },
    onSuccess: (posted) => {
      if (!posted) return
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STORIES })
      toast.success('Story posted!')
    },
    onError: () => toast.error('Could not post story'),
  })

  const handleStoryPress = useCallback((story: Story) => {
    router.push({ pathname: '/(app)/story-viewer', params: { userId: story.userId } })
  }, [])

  const storyUsers = Array.from(new Map(stories.map((s) => [s.userId, s])).values())

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Stories</Text>
        <Pressable
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          style={styles.addBtn}
        >
          {createMutation.isPending ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="add" size={24} color={colors.primary} />
          )}
        </Pressable>
      </View>

      {/* Story rings strip */}
      <View style={styles.strip}>
        <FlashList
          data={[
            { type: 'phantom' as const },
            { type: 'my' as const },
            ...storyUsers.map((s) => ({ type: 'user' as const, story: s })),
          ]}
          horizontal
          keyExtractor={(item) => (item.type === 'phantom' ? 'phantom' : item.type === 'my' ? 'me' : item.story.userId)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => {
            if (item.type === 'phantom') {
              return (
                <PhantomStoryRing
                  seen={phantomSeen}
                  onPress={() => {
                    setPhantomSeen(true)
                    router.push({ pathname: '/(app)/story-viewer', params: { userId: 'phantom' } })
                  }}
                />
              )
            }
            if (item.type === 'my') {
              return (
                <Pressable onPress={() => createMutation.mutate()} style={styles.myStoryWrapper}>
                  <View style={styles.myStoryAvatarBox}>
                    <Avatar name={currentUser?.displayName ?? '?'} size={52} />
                    <View style={styles.myStoryAddBadge}>
                      <Ionicons name="add" size={13} color={colors.white} />
                    </View>
                  </View>
                  <Text style={styles.storyRingName}>My Story</Text>
                </Pressable>
              )
            }
            return (
              <View style={styles.storyRingItem}>
                <StoryRing
                  userId={item.story.userId}
                  name={item.story.userId.slice(0, 6)}
                  onPress={() => handleStoryPress(item.story)}
                />
              </View>
            )
          }}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        />
      </View>

      {/* Feed */}
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : stories.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(250).springify()} style={styles.emptyState}>
          <Ionicons name="aperture-outline" size={52} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyTitle}>No stories yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share a story</Text>
        </Animated.View>
      ) : (
        <FlashList
          data={stories}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 25).duration(250).springify()}>
              <StoryCard story={item} onPress={handleStoryPress} />
            </Animated.View>
          )}
          onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage() }}
          onEndReachedThreshold={0.3}
          onRefresh={refetch}
          refreshing={false}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  strip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  myStoryWrapper: { alignItems: 'center', gap: 6, marginRight: 14 },
  myStoryAvatarBox: { position: 'relative', width: 56, height: 56 },
  myStoryAddBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  phantomGradientRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phantomAvatarInner: {
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phantomEmoji: { fontSize: 26 },
  cardStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storyRingItem: { marginRight: 14 },
  storyRingWrapper: { alignItems: 'center', gap: 6 },
  storyRingBorder: { padding: 2, borderRadius: 30, borderWidth: 2 },
  storyRingSeen: { borderColor: 'rgba(255,255,255,0.2)', backgroundColor: 'transparent' },
  storyRingUnseen: { borderColor: colors.primary, backgroundColor: 'rgba(59,130,246,0.15)' },
  storyRingName: { color: colors.textSecondary, fontSize: 11, maxWidth: 60 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  emptySubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: radius.xl,
    overflow: 'hidden',
    height: 200,
    backgroundColor: colors.bgSurface,
  },
  cardImage: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cardCaption: { color: colors.white, fontSize: fontSize.sm, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { color: 'rgba(255,255,255,0.6)', fontSize: fontSize.xs },
})
