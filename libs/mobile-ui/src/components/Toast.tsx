import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize } from '../tokens'

type ToastType = 'info' | 'success' | 'error' | 'warning'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

export interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  action?: { label: string; onPress: () => void }
  onDismiss?: () => void
}

const TYPE_ICON: Record<ToastType, IoniconsName> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
}

const TYPE_ACCENT: Record<ToastType, string> = {
  info: colors.primary,
  success: colors.online,
  error: colors.danger,
  warning: colors.warning,
}

const TYPE_BG: Record<ToastType, string> = {
  info: '#1e3a5f',
  success: '#14532d',
  error: '#450a0a',
  warning: '#422006',
}

const TYPE_BORDER: Record<ToastType, string> = {
  info: 'rgba(59,130,246,0.35)',
  success: 'rgba(34,197,94,0.35)',
  error: 'rgba(239,68,68,0.35)',
  warning: 'rgba(250,204,21,0.35)',
}

interface InternalToastProps extends ToastProps {
  id: string
  onDismissById: (id: string) => void
}

export function ToastItem({
  id,
  message,
  type = 'info',
  duration = 3000,
  action,
  onDismissById,
}: InternalToastProps) {
  const { top } = useSafeAreaInsets()

  const translateY = useSharedValue(-80)
  const opacity = useSharedValue(0)
  const translateX = useSharedValue(0)

  const dismiss = () => onDismissById(id)

  useEffect(() => {
    const easeIn = Easing.out(Easing.cubic)
    const easeOut = Easing.in(Easing.cubic)

    translateY.value = withTiming(0, { duration: 240, easing: easeIn })
    opacity.value = withTiming(1, { duration: 200 })

    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 200, easing: easeOut })
      opacity.value = withTiming(0, { duration: 200 })
      setTimeout(dismiss, 220)
    }, duration - 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  const swipeGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY
        opacity.value = 1 + e.translationY / 80
      }
    })
    .onEnd((e) => {
      if (e.translationY < -30) {
        translateY.value = withTiming(-120, { duration: 180 })
        opacity.value = withTiming(0, { duration: 180 })
        setTimeout(dismiss, 200)
      } else {
        translateY.value = withTiming(0, { duration: 180 })
        opacity.value = withTiming(1, { duration: 180 })
      }
    })
    .runOnJS(true)

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
    opacity: opacity.value,
  }))

  const accent = TYPE_ACCENT[type]
  const icon = TYPE_ICON[type]

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View
        style={[
          styles.container,
          animStyle,
          {
            top: top + 8,
            backgroundColor: TYPE_BG[type],
            borderColor: TYPE_BORDER[type],
            borderLeftColor: accent,
          },
        ]}
      >
        <Ionicons name={icon} size={18} color={accent} style={styles.icon} />

        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>

        {action && (
          <Pressable onPress={action.onPress} hitSlop={8} style={styles.actionButton}>
            <Text style={[styles.actionLabel, { color: accent }]}>{action.label}</Text>
          </Pressable>
        )}

        <Pressable onPress={dismiss} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  )
}

ToastItem.displayName = 'ToastItem'

// ─── Standalone Toast (for backwards compat / external use) ──────────────────

/**
 * Presentational Toast. Manages its own show/hide animation.
 * For app-level toasts driven by a store, use ToastProvider.
 */
export function Toast({
  message,
  type = 'info',
  duration = 3000,
  action,
  onDismiss,
}: ToastProps) {
  const { top } = useSafeAreaInsets()

  const translateY = useSharedValue(-80)
  const opacity = useSharedValue(0)

  useEffect(() => {
    const easeIn = Easing.out(Easing.cubic)
    const easeOut = Easing.in(Easing.cubic)

    translateY.value = withTiming(0, { duration: 240, easing: easeIn })
    opacity.value = withTiming(1, { duration: 200 })

    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 200, easing: easeOut })
      opacity.value = withTiming(0, { duration: 200 })
      setTimeout(() => onDismiss?.(), 220)
    }, duration - 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration])

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  const accent = TYPE_ACCENT[type]
  const icon = TYPE_ICON[type]

  return (
    <Animated.View
      style={[
        styles.container,
        animStyle,
        {
          top: top + 8,
          backgroundColor: TYPE_BG[type],
          borderColor: TYPE_BORDER[type],
          borderLeftColor: accent,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={accent} style={styles.icon} />

      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>

      {action && (
        <Pressable onPress={action.onPress} hitSlop={8} style={styles.actionButton}>
          <Text style={[styles.actionLabel, { color: accent }]}>{action.label}</Text>
        </Pressable>
      )}

      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeButton}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
        </Pressable>
      )}
    </Animated.View>
  )
}

Toast.displayName = 'Toast'

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  icon: {
    marginRight: 10,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
    lineHeight: 20,
  },
  actionButton: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  actionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 8,
  },
})
