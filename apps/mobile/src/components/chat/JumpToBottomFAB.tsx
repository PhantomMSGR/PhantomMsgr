import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { ANIM } from '@/constants/animation'
import { colors, radius } from '@/constants/theme'

interface Props {
  visible: boolean
  unreadCount: number
  onPress: () => void
}

export function JumpToBottomFAB({ visible, unreadCount, onPress }: Props) {
  const scale = useSharedValue(0)
  const opacity = useSharedValue(0)

  useEffect(() => {
    if (visible) {
      scale.value = withTiming(1, { duration: ANIM.duration.normal, easing: ANIM.easing.decelerate })
      opacity.value = withTiming(1, { duration: ANIM.duration.fast })
    } else {
      scale.value = withTiming(0, { duration: ANIM.duration.fast, easing: ANIM.easing.accelerate })
      opacity.value = withTiming(0, { duration: ANIM.duration.fast })
    }
  }, [visible, scale, opacity])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.container, animStyle]}
    >
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.85)" />
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    zIndex: 10,
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -3,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 19,
    height: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 22, 28, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 10,
  },
  buttonPressed: {
    backgroundColor: 'rgba(22, 22, 28, 0.55)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
})
