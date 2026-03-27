import React, { useCallback } from 'react'
import { View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
  type NativeViewGestureHandler,
} from 'react-native-gesture-handler'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { ANIM } from '@/constants/animation'
import type { Message } from '@/types'

export const REPLY_THRESHOLD = 64  // exported for tests
export const MAX_DRAG = 80         // exported for tests

interface Props {
  message: Message
  isOwn: boolean
  children: React.ReactNode
  onSwipeReply: (message: Message) => void
  scrollRef?: React.RefObject<NativeViewGestureHandler>
}

export function SwipeableMessage({ message, isOwn, children, onSwipeReply, scrollRef }: Props) {
  const translateX = useSharedValue(0)
  const hapticFired = useSharedValue(false)
  // Locked in only after both velocity AND translation confirm a horizontal swipe
  const lockedHorizontal = useSharedValue(false)

  const triggerHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }, [])

  const triggerReply = useCallback(() => {
    onSwipeReply(message)
  }, [message, onSwipeReply])

  const snapBack = () => {
    'worklet'
    translateX.value = withTiming(0, { duration: ANIM.duration.snap, easing: ANIM.easing.standard })
  }

  const panGesture = (scrollRef
    ? Gesture.Pan().simultaneousWithExternalGesture(scrollRef)
    : Gesture.Pan()
  )
    .activeOffsetX([22, 999])
    .failOffsetY([-5, 5])
    .onBegin(() => {
      lockedHorizontal.value = false
      hapticFired.value = false
    })
    .onUpdate((e) => {
      if (!lockedHorizontal.value) {
        // Require BOTH translation AND velocity to agree it's horizontal:
        // Translation: X > 8px and X > Y*3 (horizontal dominant by 3:1)
        // Velocity: vX > 80px/s and vX > vY*2 (moving more than 2× faster horizontally)
        const transOk = e.translationX > 8 && e.translationX > Math.abs(e.translationY) * 3
        const velOk = e.velocityX > 80 && e.velocityX > Math.abs(e.velocityY) * 2

        if (transOk && velOk) {
          lockedHorizontal.value = true
        } else {
          // Too much vertical accumulated — give up on this gesture
          if (Math.abs(e.translationY) > 12) {
            snapBack()
          }
          return
        }
      }

      // Already locked horizontal — bail if velocity swings vertical mid-gesture
      if (Math.abs(e.velocityY) > Math.abs(e.velocityX) * 2 && Math.abs(e.velocityY) > 150) {
        snapBack()
        lockedHorizontal.value = false
        hapticFired.value = false
        return
      }

      const drag = Math.max(0, Math.min(e.translationX, MAX_DRAG))
      translateX.value = drag

      if (drag >= REPLY_THRESHOLD && !hapticFired.value) {
        hapticFired.value = true
        runOnJS(triggerHaptic)()
      }
      if (drag < REPLY_THRESHOLD) {
        hapticFired.value = false
      }
    })
    .onEnd(() => {
      const wasTriggered = translateX.value >= REPLY_THRESHOLD
      snapBack()
      if (wasTriggered) runOnJS(triggerReply)()
    })
    .onFinalize(() => {
      snapBack()
      lockedHorizontal.value = false
      hapticFired.value = false
    })

  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  const iconOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, REPLY_THRESHOLD * 0.4, REPLY_THRESHOLD], [0, 0.4, 1], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(translateX.value, [0, REPLY_THRESHOLD], [0.5, 1], Extrapolation.CLAMP) },
    ],
  }))

  return (
    <GestureDetector gesture={panGesture}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Animated.View style={[iconOpacity, { position: 'absolute', left: 8 }]}>
          <Ionicons name="arrow-undo" size={18} color="rgba(255,255,255,0.5)" />
        </Animated.View>
        <Animated.View style={[{ flex: 1 }, messageStyle]}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  )
}
