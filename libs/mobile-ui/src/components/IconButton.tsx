import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { colors, radius } from '../tokens'
import { Pressable } from './Pressable'

type IoniconsName = ComponentProps<typeof Ionicons>['name']

export type IconButtonVariant = 'ghost' | 'filled' | 'subtle' | 'outline'
export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg'

export interface IconButtonProps {
  icon: IoniconsName
  label: string
  variant?: IconButtonVariant
  size?: IconButtonSize
  color?: string
  disabled?: boolean
  loading?: boolean
  badge?: boolean
  onPress?: () => void | Promise<void>
  style?: ViewStyle
}

const CONTAINER_SIZES: Record<IconButtonSize, number> = {
  xs: 32,
  sm: 36,
  md: 42,
  lg: 48,
}

const ICON_SIZES: Record<IconButtonSize, number> = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 22,
}

const VARIANT_STYLES: Record<
  IconButtonVariant,
  { container: ViewStyle; iconColor: string; spinnerColor: string }
> = {
  ghost: {
    container: { backgroundColor: 'transparent' },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
  filled: {
    container: { backgroundColor: colors.bgElevated },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
  subtle: {
    container: { backgroundColor: 'rgba(59,130,246,0.12)' },
    iconColor: colors.primary,
    spinnerColor: colors.primary,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
}

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  color,
  disabled = false,
  loading = false,
  badge = false,
  onPress,
  style,
}: IconButtonProps) {
  const isDisabled = disabled || loading
  const containerSize = CONTAINER_SIZES[size]
  const iconSize = ICON_SIZES[size]
  const v = VARIANT_STYLES[variant]
  const resolvedIconColor = color ?? v.iconColor

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      haptic="light"
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        v.container,
        {
          width: containerSize,
          height: containerSize,
          borderRadius: radius.full,
        },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinnerColor} />
      ) : (
        <Ionicons name={icon} size={iconSize} color={resolvedIconColor} />
      )}
      {badge && !loading && (
        <View style={styles.badge} />
      )}
    </Pressable>
  )
}

IconButton.displayName = 'IconButton'

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.45,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
})
