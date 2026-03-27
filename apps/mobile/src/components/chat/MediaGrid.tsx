import React, { useCallback } from 'react'
import { Dimensions, Pressable, Text, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useChatMedia } from '@/hooks/useChatMedia'
import type { Media } from '@/types'

const COLUMNS = 3
const GAP = 1
const SCREEN_WIDTH = Dimensions.get('window').width
const CELL_SIZE = (SCREEN_WIDTH - GAP * (COLUMNS + 1)) / COLUMNS

interface Props {
  chatId: string
}

function MediaCell({ item, index, chatId }: { item: Media; index: number; chatId: string }) {
  const isVideo = item.type === 'video'
  const thumbnailUri = item.thumbnailUrl ?? item.url

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/media-viewer',
          params: { chatId, initialIndex: String(index) },
        })
      }
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        margin: GAP / 2,
      }}
    >
      <Image
        source={{ uri: thumbnailUri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="cover"
        transition={200}
        placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
      />

      {/* Video overlay */}
      {isVideo && (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22 }}>▶</Text>
          {item.duration ? (
            <Text
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                color: '#fff',
                fontSize: 10,
                fontWeight: '600',
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 4,
                paddingVertical: 1,
                borderRadius: 4,
              }}
            >
              {formatDuration(item.duration)}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  )
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MediaGrid({ chatId }: Props) {
  const { media, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useChatMedia(chatId)

  const renderItem = useCallback(
    ({ item, index }: { item: Media; index: number }) => (
      <MediaCell item={item} index={index} chatId={chatId} />
    ),
    [chatId],
  )

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#6b7280' }}>Loading media…</Text>
      </View>
    )
  }

  if (media.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <Text style={{ color: '#6b7280', fontSize: 14, textAlign: 'center' }}>
          No photos or videos yet
        </Text>
      </View>
    )
  }

  return (
    <FlashList
      data={media}
      numColumns={COLUMNS}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage()
      }}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{ padding: GAP / 2, backgroundColor: '#000' }}
    />
  )
}
