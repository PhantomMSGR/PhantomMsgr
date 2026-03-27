import React, { forwardRef, useCallback, useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps as RNTextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { colors, radius, fontSize } from '../tokens'

type IoniconsName = ComponentProps<typeof Ionicons>['name']

export type TextInputSize = 'sm' | 'md' | 'lg'

export interface TextInputProps extends Omit<RNTextInputProps, 'style'> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: IoniconsName
  rightIcon?: IoniconsName
  onRightIconPress?: () => void
  size?: TextInputSize
  containerStyle?: ViewStyle
  inputStyle?: TextStyle
}

const SIZE_HEIGHTS: Record<TextInputSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      onRightIconPress,
      size = 'md',
      containerStyle,
      inputStyle,
      secureTextEntry,
      onFocus,
      onBlur,
      ...rest
    },
    ref,
  ) => {
    const [secure, setSecure] = useState(secureTextEntry ?? false)
    const focusProgress = useSharedValue(0)

    const handleFocus = useCallback(
      (e: Parameters<NonNullable<RNTextInputProps['onFocus']>>[0]) => {
        focusProgress.value = withTiming(1, { duration: 180 })
        onFocus?.(e)
      },
      [focusProgress, onFocus],
    )

    const handleBlur = useCallback(
      (e: Parameters<NonNullable<RNTextInputProps['onBlur']>>[0]) => {
        focusProgress.value = withTiming(0, { duration: 180 })
        onBlur?.(e)
      },
      [focusProgress, onBlur],
    )

    const unfocusedBorderColor = error ? colors.danger : colors.border
    const focusedBorderColor = error ? colors.danger : colors.primary

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [unfocusedBorderColor, focusedBorderColor],
      ),
    }))

    const inputHeight = SIZE_HEIGHTS[size]

    // Determine effective right icon (secureTextEntry overrides)
    const effectiveRightIcon: IoniconsName | undefined = secureTextEntry !== undefined
      ? secure
        ? 'eye-off-outline'
        : 'eye-outline'
      : rightIcon

    const handleRightIconPress = secureTextEntry !== undefined
      ? () => setSecure((v) => !v)
      : onRightIconPress

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? (
          <Text style={styles.label}>{label}</Text>
        ) : null}

        <Animated.View
          style={[
            styles.inputRow,
            animatedBorderStyle,
            { height: inputHeight },
          ]}
        >
          {leftIcon && (
            <View style={styles.leftIconContainer}>
              <Ionicons name={leftIcon} size={18} color={colors.textMuted} />
            </View>
          )}

          <RNTextInput
            ref={ref}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              { fontSize: size === 'sm' ? fontSize.sm : size === 'lg' ? fontSize.lg : fontSize.base },
              inputStyle,
            ]}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secure}
            {...rest}
          />

          {effectiveRightIcon && (
            handleRightIconPress ? (
              <Pressable
                onPress={handleRightIconPress}
                hitSlop={8}
                style={styles.rightIconContainer}
              >
                <Ionicons name={effectiveRightIcon} size={18} color={colors.textMuted} />
              </Pressable>
            ) : (
              <View style={styles.rightIconContainer}>
                <Ionicons name={effectiveRightIcon} size={18} color={colors.textMuted} />
              </View>
            )
          )}
        </Animated.View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : helperText ? (
          <Text style={styles.helper}>{helperText}</Text>
        ) : null}
      </View>
    )
  },
)

TextInput.displayName = 'TextInput'

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    rowGap: 6,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  leftIconContainer: {
    marginRight: 10,
  },
  rightIconContainer: {
    marginLeft: 10,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginLeft: 4,
  },
  helper: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginLeft: 4,
  },
})
