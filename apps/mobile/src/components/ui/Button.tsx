import React from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { colors, radius, fontSize } from '@/constants/theme'
import { ANIM } from '@/constants/animation'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends PressableProps {
  label: string
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
}

const variantStyles: Record<Variant, { container: object; text: object }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.white, fontWeight: '600' },
  },
  secondary: {
    container: {
      backgroundColor: colors.bgElevated,
      borderWidth: 1,
      borderColor: colors.border,
    },
    text: { color: colors.textPrimary, fontWeight: '600' },
  },
  ghost: {
    container: { backgroundColor: 'transparent' },
    text: { color: colors.primary, fontWeight: '600' },
  },
  danger: {
    container: { backgroundColor: colors.danger },
    text: { color: colors.white, fontWeight: '600' },
  },
}

const sizeStyles: Record<Size, { container: object; text: object }> = {
  sm: {
    container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.md },
    text: { fontSize: fontSize.sm },
  },
  md: {
    container: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: radius.lg },
    text: { fontSize: fontSize.base },
  },
  lg: {
    container: { paddingHorizontal: 24, paddingVertical: 16, borderRadius: radius.xl },
    text: { fontSize: fontSize.lg },
  },
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const isDisabled = disabled || loading

  return (
    <AnimatedPressable
      {...rest}
      disabled={isDisabled}
      style={[
        styles.base,
        variantStyles[variant].container,
        sizeStyles[size].container,
        fullWidth ? styles.fullWidth : styles.selfCenter,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: ANIM.duration.fast, easing: ANIM.easing.accelerate }) }}
      onPressOut={() => { scale.value = withTiming(1, { duration: ANIM.duration.normal, easing: ANIM.easing.decelerate }) }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? colors.white : colors.primary}
        />
      ) : (
        <Text style={[variantStyles[variant].text, sizeStyles[size].text]}>{label}</Text>
      )}
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  selfCenter: {
    alignSelf: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
})
