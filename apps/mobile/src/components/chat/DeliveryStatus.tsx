import React, { useEffect } from 'react'
import { View } from 'react-native'
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import type { MessageStatus } from '@/types'

const SIZE = 15
const GRAY = 'rgba(255,255,255,0.50)'
const BLUE = '#60a5fa'
const RED = '#ff6b6b'

export function DeliveryStatus({ status }: { status: MessageStatus }) {
  if (status === 'sending') {
    return (
      <Animated.View entering={FadeIn.duration(120)} style={icon}>
        <Ionicons name="time-outline" size={SIZE - 1} color={GRAY} />
      </Animated.View>
    )
  }

  if (status === 'failed') {
    return (
      <Animated.View entering={FadeIn.duration(120)} style={icon}>
        <Ionicons name="alert-circle" size={SIZE} color={RED} />
      </Animated.View>
    )
  }

  return (
    <AnimatedChecks
      isDouble={status === 'delivered' || status === 'read'}
      isRead={status === 'read'}
    />
  )
}

function AnimatedChecks({
  isDouble,
  isRead,
}: {
  isDouble: boolean
  isRead: boolean
}) {
  const blueProgress = useSharedValue(isRead ? 1 : 0)

  useEffect(() => {
    blueProgress.value = withTiming(isRead ? 1 : 0, { duration: 280 })
  }, [isRead, blueProgress])

  // Gray icon is the "base" that takes up layout space
  const grayStyle = useAnimatedStyle(() => ({
    opacity: 1 - blueProgress.value,
  }))

  // Blue icon fades in on top
  const blueStyle = useAnimatedStyle(() => ({
    opacity: blueProgress.value,
    position: 'absolute',
    top: 0,
    left: 0,
  }))

  const name = isDouble ? 'checkmark-done' : 'checkmark'

  return (
    <Animated.View entering={FadeIn.duration(180)} style={icon}>
      <View style={{ position: 'relative' }}>
        <Animated.View style={grayStyle}>
          <Ionicons name={name} size={SIZE} color={GRAY} />
        </Animated.View>
        <Animated.View style={blueStyle}>
          <Ionicons name={name} size={SIZE} color={BLUE} />
        </Animated.View>
      </View>
    </Animated.View>
  )
}

const icon = {
  marginLeft: 3,
  justifyContent: 'center' as const,
}
