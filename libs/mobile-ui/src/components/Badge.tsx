import React from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors, radius, fontSize } from '../tokens'

export type BadgeVariant = 'primary' | 'danger' | 'success' | 'warning' | 'muted'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
  count?: number
  max?: number
  dot?: boolean
  variant?: BadgeVariant
  size?: BadgeSize
  style?: ViewStyle
}

const VARIANT_COLORS: Record<BadgeVariant, string> = {
  primary: colors.primary,
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
  muted: colors.textMuted,
}

export function Badge({
  count,
  max = 99,
  dot = false,
  variant = 'danger',
  size = 'md',
  style,
}: BadgeProps) {
  // Return null if count is 0 (and not a dot badge)
  if (!dot && count === 0) return null

  const bgColor = VARIANT_COLORS[variant]

  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: bgColor },
          style,
        ]}
      />
    )
  }

  const displayCount = count !== undefined && count > max ? `${max}+` : String(count ?? '')
  const isSmall = size === 'sm'
  const height = isSmall ? 16 : 20
  const minWidth = isSmall ? 16 : 20
  const textSize = isSmall ? 10 : fontSize.xs

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          height,
          minWidth,
          borderRadius: radius.full,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { fontSize: textSize },
        ]}
        numberOfLines={1}
      >
        {displayCount}
      </Text>
    </View>
  )
}

Badge.displayName = 'Badge'

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  text: {
    color: colors.white,
    fontWeight: '700',
    lineHeight: undefined,
  },
})
