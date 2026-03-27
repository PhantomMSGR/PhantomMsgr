import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { colors } from '@/constants/theme'

interface Props {
  visible: boolean
}

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0)

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 280 }),
          withTiming(0,  { duration: 280 }),
          withTiming(0,  { duration: 180 }),
        ),
        -1,
        false,
      ),
    )
    return () => { translateY.value = 0 }
  }, [delay, translateY])

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  return <Animated.View style={[styles.dot, style]} />
}

export function TypingIndicator({ visible }: Props) {
  if (!visible) return null
  return (
    <Animated.View
      entering={FadeInDown.duration(180).springify()}
      exiting={FadeOutDown.duration(130)}
      style={styles.container}
    >
      <Dot delay={0} />
      <Dot delay={140} />
      <Dot delay={280} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.textSecondary,
    marginHorizontal: 2,
  },
})
