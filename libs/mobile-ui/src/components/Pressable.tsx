import React, { forwardRef, useCallback } from 'react'
import {
  Pressable as RNPressable,
  Platform,
  View,
  type PressableProps,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { ANIM } from '../tokens'

type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection'

export interface PressableUIProps extends PressableProps {
  haptic?: HapticStyle | false
  scaleTo?: number
  children?: React.ReactNode
}

export const Pressable = forwardRef<View, PressableUIProps>(
  (
    {
      haptic = 'light',
      scaleTo = 0.97,
      onPress,
      onPressIn,
      onPressOut,
      style,
      children,
      ...rest
    },
    ref,
  ) => {
    const scale = useSharedValue(1)
    const shouldScale = Platform.OS === 'ios' && scaleTo !== 1

    const animStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }))

    const handlePressIn = useCallback(
      (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
        if (shouldScale) {
          scale.value = withTiming(scaleTo, {
            duration: 80,
            easing: ANIM.easing.accelerate,
          })
        }
        onPressIn?.(e)
      },
      [shouldScale, scale, scaleTo, onPressIn],
    )

    const handlePressOut = useCallback(
      (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
        if (shouldScale) {
          scale.value = withTiming(1, {
            duration: 180,
            easing: ANIM.easing.decelerate,
          })
        }
        onPressOut?.(e)
      },
      [shouldScale, scale, onPressOut],
    )

    const handlePress = useCallback(
      (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
        if (haptic !== false) {
          const triggerHaptic = async () => {
            try {
              if (haptic === 'selection') {
                await Haptics.selectionAsync()
              } else {
                const feedbackStyle =
                  haptic === 'heavy'
                    ? Haptics.ImpactFeedbackStyle.Heavy
                    : haptic === 'medium'
                      ? Haptics.ImpactFeedbackStyle.Medium
                      : Haptics.ImpactFeedbackStyle.Light
                await Haptics.impactAsync(feedbackStyle)
              }
            } catch {
              // Haptics not available on all devices
            }
          }
          void triggerHaptic()
        }
        onPress?.(e)
      },
      [haptic, onPress],
    )

    return (
      <Animated.View style={animStyle}>
        <RNPressable
          ref={ref}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          style={style}
          android_ripple={
            Platform.OS === 'android'
              ? { color: 'rgba(255,255,255,0.08)', borderless: false }
              : undefined
          }
          {...rest}
        >
          {children}
        </RNPressable>
      </Animated.View>
    )
  },
)

Pressable.displayName = 'Pressable'
