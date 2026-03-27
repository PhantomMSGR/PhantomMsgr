import React, { useEffect } from 'react'
import { Pressable, Text } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useToastStore, type ToastItem } from '@/store/toast.store'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']
const ICON: Record<string, IoniconsName> = {
  info:    'information-circle',
  success: 'checkmark-circle',
  error:   'close-circle',
  warning: 'warning',
}

const BG: Record<string, string> = {
  info:    '#1e3a5f',
  success: '#14532d',
  error:   '#450a0a',
  warning: '#422006',
}

const BORDER: Record<string, string> = {
  info:    '#3b82f6',
  success: '#22c55e',
  error:   '#ef4444',
  warning: '#f59e0b',
}

function SingleToast({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss)
  const { top } = useSafeAreaInsets()

  const translateY = useSharedValue(-80)
  const opacity = useSharedValue(0)

  const easing = Easing.out(Easing.cubic)
  useEffect(() => {
    translateY.value = withTiming(0, { duration: 240, easing })
    opacity.value = withTiming(1, { duration: 200 })

    const timer = setTimeout(() => {
      translateY.value = withTiming(-80, { duration: 200, easing: Easing.in(Easing.cubic) })
      opacity.value = withTiming(0, { duration: 200 })
    }, item.duration - 300)

    return () => clearTimeout(timer)
  }, [item.duration, opacity, translateY])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          top: top + 8,
          left: 16,
          right: 16,
          zIndex: 9999,
          backgroundColor: BG[item.type],
          borderRadius: 14,
          borderWidth: 1,
          borderColor: BORDER[item.type],
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
      ]}
    >
      <Ionicons name={ICON[item.type]} size={18} color={BORDER[item.type]} style={{ marginRight: 10 }} />
      <Text
        style={{ flex: 1, color: '#f0f0f0', fontSize: 14, fontWeight: '500', lineHeight: 20 }}
        numberOfLines={2}
      >
        {item.message}
      </Text>
      <Pressable onPress={() => dismiss(item.id)} hitSlop={10} style={{ marginLeft: 8 }}>
        <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Animated.View>
  )
}

export function Toast() {
  const queue = useToastStore((s) => s.queue)
  // Show only the first/latest toast
  const current = queue[queue.length - 1]

  if (!current) return null
  return <SingleToast key={current.id} item={current} />
}
