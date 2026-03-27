import React, { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNetworkStatus } from '@/hooks/useNetworkStatus'

const TIMING_IN  = { duration: 220, easing: Easing.out(Easing.cubic) }
const TIMING_OUT = { duration: 180, easing: Easing.in(Easing.cubic) }

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()
  const { top } = useSafeAreaInsets()

  const translateY = useSharedValue(-48)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (!isOnline) {
      translateY.value = withTiming(0, TIMING_IN)
      opacity.value = withTiming(1, TIMING_IN)
    } else {
      translateY.value = withTiming(-48, TIMING_OUT)
      opacity.value = withTiming(0, TIMING_OUT)
    }
  }, [isOnline, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, animatedStyle, { top }]}
    >
      <Ionicons name="wifi-outline" size={14} color="#fde68a" />
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9998,
    backgroundColor: '#1c1409',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(253,230,138,0.15)',
    paddingVertical: 9,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  text: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
})
