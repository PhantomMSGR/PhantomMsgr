import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NetInfo from '@react-native-community/netinfo'

type NetworkState = 'online' | 'offline' | 'reconnecting'

const TIMING_IN = { duration: 220, easing: Easing.out(Easing.cubic) }
const TIMING_OUT = { duration: 180, easing: Easing.in(Easing.cubic) }

const BANNER_HEIGHT = 40

interface OfflineBannerInternalProps {
  visible: boolean
  state: NetworkState
  top: number
}

function OfflineBannerInternal({ visible, state, top }: OfflineBannerInternalProps) {
  const translateY = useSharedValue(-BANNER_HEIGHT)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, TIMING_IN)
      opacity.value = withTiming(1, TIMING_IN)
    } else {
      translateY.value = withTiming(-BANNER_HEIGHT, TIMING_OUT)
      opacity.value = withTiming(0, TIMING_OUT)
    }
  }, [visible, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.banner, animatedStyle, { top }]}
    >
      {state === 'reconnecting' ? (
        <ActivityIndicator size="small" color="#fde68a" style={styles.indicator} />
      ) : (
        <Ionicons name="wifi-outline" size={14} color="#fde68a" />
      )}
      <Text style={styles.text}>
        {state === 'reconnecting' ? 'Reconnecting…' : 'No internet connection'}
      </Text>
    </Animated.View>
  )
}

// ─── Connected OfflineBanner (uses NetInfo internally) ──────────────────────

export function OfflineBanner() {
  const { top } = useSafeAreaInsets()
  const [networkState, setNetworkState] = useState<NetworkState>('online')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let prevConnected: boolean | null = null

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? true

      if (!isConnected) {
        setNetworkState('offline')
        setVisible(true)
      } else if (prevConnected === false && isConnected) {
        // Was offline, now reconnecting
        setNetworkState('reconnecting')
        setVisible(true)

        // After a short delay, hide the reconnecting banner
        const timer = setTimeout(() => {
          setVisible(false)
          // Reset state after animation completes
          setTimeout(() => setNetworkState('online'), 300)
        }, 2000)

        prevConnected = isConnected
        return () => clearTimeout(timer)
      } else {
        setNetworkState('online')
        setVisible(false)
      }

      prevConnected = isConnected
    })

    return () => unsubscribe()
  }, [])

  return (
    <OfflineBannerInternal
      visible={visible}
      state={networkState}
      top={top}
    />
  )
}

OfflineBanner.displayName = 'OfflineBanner'

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
    height: BANNER_HEIGHT,
  },
  text: {
    color: '#fde68a',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  indicator: {
    marginRight: 0,
  },
})
