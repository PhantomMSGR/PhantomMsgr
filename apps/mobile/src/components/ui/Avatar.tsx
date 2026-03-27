import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { colors } from '@/constants/theme'

interface AvatarProps {
  name: string
  mediaUrl?: string | null
  emoji?: string | null
  color?: string | null
  size?: number
  online?: boolean
}

function nameToHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export function Avatar({ name, mediaUrl, emoji, color, size = 44, online = false }: AvatarProps) {
  const hue = useMemo(() => nameToHue(name), [name])
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  const textSize = Math.round(size * 0.38)
  const emojiSize = Math.round(size * 0.5)

  const bgColor = color ?? `hsl(${hue}, 55%, 32%)`

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        {mediaUrl ? (
          <Image
            source={{ uri: mediaUrl }}
            style={{ width: size, height: size }}
            contentFit="cover"
            transition={200}
          />
        ) : emoji ? (
          <Text style={{ fontSize: emojiSize, lineHeight: emojiSize * 1.3 }}>{emoji}</Text>
        ) : (
          <Text style={[styles.initials, { fontSize: textSize }]}>{initials}</Text>
        )}
      </View>

      {online ? (
        <View
          style={[
            styles.onlineDot,
            {
              width: size * 0.27,
              height: size * 0.27,
              borderRadius: size * 0.135,
            },
          ]}
        />
      ) : null}
    </View>
  )
}

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
    borderColor: colors.bg,
  },
})
