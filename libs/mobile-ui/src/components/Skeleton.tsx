import React, { useEffect } from 'react'
import { View, type ViewStyle } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

export interface SkeletonProps {
  width?: number | `${number}%`
  height?: number
  radius?: number
  style?: ViewStyle
}

function SkeletonBase({ width, height = 16, radius: borderRadius = 4, style }: SkeletonProps) {
  const opacity = useSharedValue(0.8)

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 700 }),
        withTiming(0.8, { duration: 700 }),
      ),
      -1,
      false,
    )
  }, [opacity])

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return (
    <Animated.View
      style={[
        animStyle,
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#2a2a2a',
        },
        style,
      ]}
    />
  )
}

SkeletonBase.displayName = 'Skeleton'

// ─── Skeleton.Avatar ─────────────────────────────────────────────────────────

interface SkeletonAvatarProps {
  size?: number
  style?: ViewStyle
}

function SkeletonAvatar({ size = 40, style }: SkeletonAvatarProps) {
  return (
    <SkeletonBase
      width={size}
      height={size}
      radius={size / 2}
      style={style}
    />
  )
}

SkeletonAvatar.displayName = 'Skeleton.Avatar'

// ─── Skeleton.Text ───────────────────────────────────────────────────────────

interface SkeletonTextProps {
  lines?: number
  lastLineWidth?: number | `${number}%`
  gap?: number
  lineHeight?: number
  style?: ViewStyle
}

function SkeletonText({
  lines = 1,
  lastLineWidth = '75%',
  gap = 8,
  lineHeight = 16,
  style,
}: SkeletonTextProps) {
  return (
    <View style={[{ gap }, style]}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBase
          key={i}
          width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
          height={lineHeight}
          radius={lineHeight / 2}
        />
      ))}
    </View>
  )
}

SkeletonText.displayName = 'Skeleton.Text'

// ─── Exported Skeleton with static methods ───────────────────────────────────

export const Skeleton = Object.assign(SkeletonBase, {
  Avatar: SkeletonAvatar,
  Text: SkeletonText,
})

