import React, { useCallback } from 'react'
import { View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import { ANIM } from '@/constants/animation'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { ChatListItem } from './ChatListItem'
import type { Chat } from '@/types'

const ACTION_WIDTH  = 72
const ARCHIVE_THRESHOLD = ACTION_WIDTH
const DELETE_THRESHOLD  = ACTION_WIDTH * 2

interface Props {
  chat: Chat
  currentUserId: string
  onPress: (chatId: string) => void
  onArchive?: (chatId: string) => void
  onDelete?: (chatId: string) => void
  unreadCount?: number
}

export function SwipeableChatListItem({
  chat,
  currentUserId,
  onPress,
  onArchive,
  onDelete,
  unreadCount,
}: Props) {
  const translateX = useSharedValue(0)
  const hapticFired = useSharedValue(false)
  const rowHeight = useSharedValue(72)
  const rowOpacity = useSharedValue(1)

  const fireHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }, [])

  const handleArchive = useCallback(() => {
    onArchive?.(chat.id)
  }, [chat.id, onArchive])

  const handleDelete = useCallback(() => {
    // Animate row out
    rowHeight.value = withTiming(0, { duration: 280 })
    rowOpacity.value = withTiming(0, { duration: 200 })
    setTimeout(() => onDelete?.(chat.id), 300)
  }, [chat.id, onDelete, rowHeight, rowOpacity])

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 999])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      // Only swipe left (negative x)
      const drag = Math.min(0, Math.max(e.translationX, -DELETE_THRESHOLD - 20))
      translateX.value = drag

      const abs = Math.abs(drag)
      if (abs >= DELETE_THRESHOLD && !hapticFired.value) {
        hapticFired.value = true
        runOnJS(fireHaptic)()
      }
      if (abs < DELETE_THRESHOLD) {
        hapticFired.value = false
      }
    })
    .onEnd(() => {
      const abs = Math.abs(translateX.value)

      if (abs >= DELETE_THRESHOLD) {
        translateX.value = withTiming(-DELETE_THRESHOLD, { duration: ANIM.duration.fast, easing: ANIM.easing.standard })
        runOnJS(handleDelete)()
      } else if (abs >= ARCHIVE_THRESHOLD) {
        translateX.value = withTiming(-ARCHIVE_THRESHOLD, { duration: ANIM.duration.fast, easing: ANIM.easing.standard })
        runOnJS(handleArchive)()
        setTimeout(() => {
          translateX.value = withTiming(0, { duration: ANIM.duration.snap, easing: ANIM.easing.standard })
        }, 600)
      } else {
        translateX.value = withTiming(0, { duration: ANIM.duration.snap, easing: ANIM.easing.standard })
      }
    })

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const containerStyle = useAnimatedStyle(() => ({
    height: rowHeight.value,
    opacity: rowOpacity.value,
    overflow: 'hidden',
  }))

  // Archive action background
  const archiveBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, ARCHIVE_THRESHOLD * 0.5, ARCHIVE_THRESHOLD],
      [0, 0, 1],
      Extrapolation.CLAMP,
    ),
  }))

  // Delete action background
  const deleteBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.value),
      [ARCHIVE_THRESHOLD, DELETE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }))

  return (
    <Animated.View style={containerStyle}>
      <View style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Action backgrounds */}
        <Animated.View
          style={[
            archiveBgStyle,
            {
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: ACTION_WIDTH,
              backgroundColor: '#f59e0b',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Ionicons name={chat.isArchived ? 'arrow-up-outline' : 'archive-outline'} size={22} color="#ffffff" />
        </Animated.View>

        <Animated.View
          style={[
            deleteBgStyle,
            {
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: DELETE_THRESHOLD,
              backgroundColor: '#ef4444',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingRight: 24,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={22} color="#ffffff" />
        </Animated.View>

        {/* Row */}
        <GestureDetector gesture={panGesture}>
          <Animated.View style={rowStyle}>
            <ChatListItem
              chat={chat}
              currentUserId={currentUserId}
              onPress={onPress}
              unreadCount={unreadCount}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  )
}
