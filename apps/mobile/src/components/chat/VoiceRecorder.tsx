/**
 * Inline voice recorder that replaces the text input while recording.
 *
 * Usage: controlled by `isRecording` prop — parent calls startRecording/stop
 * via the exported hook.
 */
import React, { useEffect, useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInUp,
  FadeOutDown,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'

interface Props {
  isRecording: boolean
  durationMs: number
  waveformBars: number[]
  onCancel: () => void
  onSend: () => void
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export function VoiceRecorder({
  isRecording,
  durationMs,
  waveformBars,
  onCancel,
  onSend,
}: Props) {
  // Pulsing red dot
  const dotOpacity = useSharedValue(1)
  const prevRecording = useRef(false)

  useEffect(() => {
    if (isRecording && !prevRecording.current) {
      dotOpacity.value = withRepeat(
        withSequence(withTiming(0.2, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true,
      )
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    }
    prevRecording.current = isRecording
  }, [isRecording, dotOpacity])

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }))

  // Pad waveform bars to always show 40 columns (fill left with min height)
  const TOTAL_BARS = 40
  const bars: number[] = [
    ...Array.from({ length: Math.max(0, TOTAL_BARS - waveformBars.length) }, () => 3),
    ...waveformBars,
  ]

  return (
    <Animated.View
      entering={FadeInUp.duration(200).springify()}
      exiting={FadeOutDown.duration(150)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#0f0f0f',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 10,
      }}
    >
      {/* Cancel */}
      <Pressable
        onPress={onCancel}
        hitSlop={12}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#2a2a2a',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 16 }}>✕</Text>
      </Pressable>

      {/* Waveform + timer */}
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {/* Pulsing red dot */}
        <Animated.View
          style={[
            dotStyle,
            {
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#ef4444',
            },
          ]}
        />

        {/* Timer */}
        <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', width: 38 }}>
          {formatDuration(durationMs)}
        </Text>

        {/* Live waveform */}
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            height: 32,
            gap: 1.5,
          }}
        >
          {bars.map((h, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                borderRadius: 2,
                backgroundColor: i >= TOTAL_BARS - waveformBars.length
                  ? '#3b82f6'   // recent bars — blue
                  : '#374151',  // old bars — gray
              }}
            />
          ))}
        </View>
      </View>

      {/* Send */}
      <Pressable
        onPress={onSend}
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#3b82f6',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 18 }}>➤</Text>
      </Pressable>
    </Animated.View>
  )
}
