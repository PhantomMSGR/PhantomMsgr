import React, { useMemo } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Image } from 'expo-image'
import { colors, AVATAR_SIZES, type AvatarSize } from '../tokens'
import { Pressable } from './Pressable'

export interface AvatarProps {
  name?: string | null
  uri?: string | null
  emoji?: string | null
  color?: string | null
  size?: AvatarSize | number
  online?: boolean
  bordered?: boolean
  borderColor?: string
  onPress?: () => void
  style?: ViewStyle
}

function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({
  name,
  uri,
  emoji,
  color,
  size = 'md',
  online = false,
  bordered = false,
  borderColor,
  onPress,
  style,
}: AvatarProps) {
  const resolvedSize = typeof size === 'number' ? size : AVATAR_SIZES[size]

  const hue = useMemo(() => {
    if (!name) return 210
    return nameToHue(name)
  }, [name])

  const initials = useMemo(() => {
    if (!name) return '?'
    return getInitials(name)
  }, [name])

  const textSize = Math.round(resolvedSize * 0.38)
  const emojiSize = Math.round(resolvedSize * 0.5)
  const dotSize = 8
  const resolvedBorderColor = borderColor ?? colors.bgSurface
  const bgColor = color ?? `hsl(${hue}, 55%, 32%)`

  const circle = (
    <View
      style={[
        styles.circle,
        {
          width: resolvedSize,
          height: resolvedSize,
          borderRadius: resolvedSize / 2,
          backgroundColor: bgColor,
        },
        bordered && {
          borderWidth: 2,
          borderColor: resolvedBorderColor,
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: resolvedSize, height: resolvedSize }}
          contentFit="cover"
          transition={200}
        />
      ) : emoji ? (
        <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.3 }}>{emoji}</Text>
      ) : (
        <Text style={[styles.initials, { fontSize: textSize }]}>{initials}</Text>
      )}

      {online && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
          ]}
        />
      )}
    </View>
  )

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        haptic="light"
        scaleTo={0.95}
        style={{ width: resolvedSize, height: resolvedSize }}
      >
        {circle}
      </Pressable>
    )
  }

  return circle
}

Avatar.displayName = 'Avatar'

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '600',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.bgSurface,
  },
})
