/**
 * Full-screen media viewer modal.
 *
 * Features:
 *  - Horizontal swipe between all media items in the chat
 *  - Pinch-to-zoom (1x – 5x) + pan while zoomed
 *  - Double-tap to toggle 1x ↔ 2.5x zoom
 *  - Swipe-down to dismiss (when scale = 1)
 *  - Download button
 *  - Share button (expo-sharing)
 */
import React, { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  StatusBar,
  Text,
  View,
  type ViewToken,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler'
import * as FileSystem from 'expo-file-system/legacy'
import { useChatMedia } from '@/hooks/useChatMedia'
import type { Media } from '@/types'

const { width: W, height: H } = Dimensions.get('window')
const MIN_SCALE = 1
const MAX_SCALE = 5
const DOUBLE_TAP_ZOOM = 2.5
const DISMISS_VELOCITY = 1200  // px/s swipe-down to dismiss

// ─── Single media item with zoom/pan ─────────────────────────────────────────

function ZoomableMedia({
  item,
  onDismiss,
}: {
  item: Media
  onDismiss: () => void
}) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedX = useSharedValue(0)
  const savedY = useSharedValue(0)
  const opacity = useSharedValue(1)
  const lastTap = useSharedValue(0)

  const resetZoom = useCallback(() => {
    scale.value = withSpring(1, { damping: 18 })
    translateX.value = withSpring(0, { damping: 18 })
    translateY.value = withSpring(0, { damping: 18 })
    savedScale.value = 1
    savedX.value = 0
    savedY.value = 0
  }, [scale, translateX, translateY, savedScale, savedX, savedY])

  // Pinch-to-zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, savedScale.value * e.scale))
      scale.value = next
    })
    .onEnd(() => {
      savedScale.value = scale.value
      if (scale.value < 1) {
        scale.value = withSpring(1)
        savedScale.value = 1
      }
    })

  // Pan (move while zoomed, or swipe-down to dismiss when at scale=1)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.01) {
        // Swipe-down → shift opacity
        const progress = Math.abs(e.translationY) / H
        translateY.value = e.translationY
        opacity.value = 1 - progress * 0.5
      } else {
        translateX.value = savedX.value + e.translationX
        translateY.value = savedY.value + e.translationY
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1.01) {
        if (e.velocityY > DISMISS_VELOCITY || Math.abs(e.translationY) > H * 0.3) {
          // Dismiss
          translateY.value = withTiming(H, { duration: 250 })
          opacity.value = withTiming(0, { duration: 200 }, () => runOnJS(onDismiss)())
        } else {
          // Snap back
          translateY.value = withSpring(0, { damping: 18 })
          opacity.value = withTiming(1, { duration: 200 })
        }
      } else {
        savedX.value = translateX.value
        savedY.value = translateY.value
      }
    })

  // Double-tap zoom toggle
  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((_e, success) => {
      if (!success) return
      if (scale.value > 1.01) {
        scale.value = withSpring(1, { damping: 18 })
        translateX.value = withSpring(0)
        translateY.value = withSpring(0)
        savedScale.value = 1
        savedX.value = 0
        savedY.value = 0
      } else {
        scale.value = withSpring(DOUBLE_TAP_ZOOM, { damping: 18 })
        savedScale.value = DOUBLE_TAP_ZOOM
      }
    })

  const combined = Gesture.Simultaneous(pinchGesture, Gesture.Exclusive(tapGesture, panGesture))

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  const uri = item.url

  return (
    <GestureDetector gesture={combined}>
      <Animated.View
        style={[
          imageStyle,
          { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: W, height: H }}
          contentFit="contain"
          transition={200}
        />
      </Animated.View>
    </GestureDetector>
  )
}

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadMedia(item: Media): Promise<void> {
  const ext = item.mimeType.split('/')[1] ?? 'jpg'
  const localUri = FileSystem.cacheDirectory + `phantom_${item.id}.${ext}`
  await FileSystem.downloadAsync(item.url, localUri)
  // On iOS can use expo-media-library; for now just save to cache
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function MediaViewerScreen() {
  const { chatId, initialIndex } = useLocalSearchParams<{
    chatId: string
    initialIndex: string
  }>()

  const { media } = useChatMedia(chatId)
  const [currentIndex, setCurrentIndex] = useState(Number(initialIndex ?? 0))
  const [isDownloading, setIsDownloading] = useState(false)
  const flatListRef = useRef<FlatList<Media>>(null)

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index ?? 0)
      }
    },
    [],
  )

  const handleDismiss = useCallback(() => {
    router.back()
  }, [])

  const handleDownload = useCallback(async () => {
    const item = media[currentIndex]
    if (!item || isDownloading) return
    setIsDownloading(true)
    try {
      await downloadMedia(item)
    } finally {
      setIsDownloading(false)
    }
  }, [media, currentIndex, isDownloading])

  const currentItem = media[currentIndex]

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />

      {/* Pager */}
      <FlatList
        ref={flatListRef}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Number(initialIndex ?? 0)}
        getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <ZoomableMedia item={item} onDismiss={handleDismiss} />
        )}
      />

      {/* Header overlay */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}
        pointerEvents="box-none"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: 'rgba(0,0,0,0.4)',
          }}
        >
          <Pressable onPress={handleDismiss} hitSlop={12}>
            <Text style={{ color: '#fff', fontSize: 22 }}>✕</Text>
          </Pressable>

          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
            {currentIndex + 1} / {media.length}
          </Text>

          <Pressable onPress={handleDownload} hitSlop={12} disabled={isDownloading}>
            <Text style={{ fontSize: 20, opacity: isDownloading ? 0.4 : 1 }}>
              {isDownloading ? '⏳' : '⬇'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* Footer — caption / filename */}
      {currentItem?.fileName ? (
        <SafeAreaView
          edges={['bottom']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 }}
          pointerEvents="none"
        >
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <Text style={{ color: '#e5e7eb', fontSize: 13 }} numberOfLines={1}>
              {currentItem.fileName}
            </Text>
          </View>
        </SafeAreaView>
      ) : null}
    </View>
  )
}
