import React, { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { colors, radius, fontSize } from '../tokens'
import { Pressable } from './Pressable'

type IoniconsName = ComponentProps<typeof Ionicons>['name']

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  label: string
  onPress?: () => void | Promise<void>
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: IoniconsName
  rightIcon?: IoniconsName
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
  rounded?: boolean
  style?: ViewStyle
  labelStyle?: TextStyle
  accessibilityLabel?: string
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading: loadingProp,
  disabled = false,
  fullWidth = false,
  rounded = false,
  style,
  labelStyle,
  accessibilityLabel,
}: ButtonProps) {
  const [asyncLoading, setAsyncLoading] = useState(false)
  const loading = loadingProp ?? asyncLoading
  const isDisabled = disabled || loading

  const handlePress = useCallback(async () => {
    if (!onPress || isDisabled) return
    const result = onPress()
    if (result instanceof Promise) {
      setAsyncLoading(true)
      try {
        await result
      } finally {
        setAsyncLoading(false)
      }
    }
  }, [onPress, isDisabled])

  const v = VARIANT_STYLES[variant]
  const s = SIZE_STYLES[size]
  const borderRadius = rounded ? radius.full : s.borderRadius

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      haptic="light"
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        v.container,
        s.container,
        { borderRadius },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.spinnerColor} />
      ) : (
        <>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={s.iconSize}
              color={v.iconColor}
              style={styles.leftIcon}
            />
          )}
          <Text style={[styles.label, v.label, s.label, labelStyle]} numberOfLines={1}>
            {label}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={s.iconSize}
              color={v.iconColor}
              style={styles.rightIcon}
            />
          )}
        </>
      )}
    </Pressable>
  )
}

Button.displayName = 'Button'

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    letterSpacing: 0.1,
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    marginLeft: 4,
  },
})

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    container: ViewStyle
    label: TextStyle
    iconColor: string
    spinnerColor: string
  }
> = {
  primary: {
    container: { backgroundColor: colors.primary },
    label: { color: colors.white },
    iconColor: colors.white,
    spinnerColor: colors.white,
  },
  secondary: {
    container: { backgroundColor: colors.bgElevated },
    label: { color: colors.textPrimary },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    label: { color: colors.textPrimary },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
  danger: {
    container: { backgroundColor: colors.danger },
    label: { color: colors.white },
    iconColor: colors.white,
    spinnerColor: colors.white,
  },
  outline: {
    container: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    label: { color: colors.textPrimary },
    iconColor: colors.textPrimary,
    spinnerColor: colors.textPrimary,
  },
  subtle: {
    container: { backgroundColor: 'rgba(59,130,246,0.12)' },
    label: { color: colors.primary },
    iconColor: colors.primary,
    spinnerColor: colors.primary,
  },
}

const SIZE_STYLES: Record<
  ButtonSize,
  {
    container: ViewStyle
    label: TextStyle
    iconSize: number
    borderRadius: number
  }
> = {
  sm: {
    container: { height: 32, paddingHorizontal: 12, gap: 4 },
    label: { fontSize: fontSize.sm, fontWeight: '500' },
    iconSize: 14,
    borderRadius: radius.md,
  },
  md: {
    container: { height: 44, paddingHorizontal: 16, gap: 6 },
    label: { fontSize: fontSize.base, fontWeight: '600' },
    iconSize: 18,
    borderRadius: radius.lg,
  },
  lg: {
    container: { height: 52, paddingHorizontal: 20, gap: 8 },
    label: { fontSize: fontSize.lg, fontWeight: '600' },
    iconSize: 20,
    borderRadius: radius.xl,
  },
}
