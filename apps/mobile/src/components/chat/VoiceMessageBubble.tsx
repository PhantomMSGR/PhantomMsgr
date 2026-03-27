/**
 * Voice message playback bubble.
 * Shown inside MessageBubble when message.type === 'voice'.
 */
import React, { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import type { Media } from '@/types'

// Bar geometry — keep bars short so they fit comfortably inside any bubble
const TOTAL_BARS = 28
const BAR_W      = 3
const BAR_GAP    = 2
const BAR_MIN_H  = 2
const BAR_MAX_H  = 6    // max bar height in pixels

interface Props {
  mediaUri: string | null
  media?: Media | null
  isOwn: boolean
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * Build a natural-looking waveform:
 * – real data from server if available
 * – otherwise a smooth pseudo-random profile with a bell-curve envelope
 */
function buildBars(waveform: number[] | null | undefined, seed: number): number[] {
  if (waveform && waveform.length >= TOTAL_BARS) {
    const step = waveform.length / TOTAL_BARS
    return Array.from({ length: TOTAL_BARS }, (_, i) => {
      const val = waveform[Math.floor(i * step)] ?? 0
      return BAR_MIN_H + Math.round(val * (BAR_MAX_H - BAR_MIN_H))
    })
  }

  return Array.from({ length: TOTAL_BARS }, (_, i) => {
    const t = i / (TOTAL_BARS - 1)
    // Bell-curve envelope: higher in the middle, shorter at edges
    const envelope = 0.35 + 0.65 * Math.sin(t * Math.PI)
    // Deterministic noise per message
    const noise = ((i * 1223 + seed * 997) % 256) / 255
    const v = 0.55 * envelope + 0.45 * noise
    return BAR_MIN_H + Math.round(v * (BAR_MAX_H - BAR_MIN_H))
  })
}

// Total waveform width — fixed so bars never stretch
const WAVEFORM_WIDTH = TOTAL_BARS * BAR_W + (TOTAL_BARS - 1) * BAR_GAP

export function VoiceMessageBubble({ mediaUri, media, isOwn }: Props) {
  const { state, toggle } = useAudioPlayer(mediaUri)

  const seed = useMemo(
    () => (mediaUri ?? '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
    [mediaUri],
  )
  const bars = useMemo(() => buildBars(media?.waveform, seed), [media?.waveform, seed])

  const knownDurationMs =
    media?.duration != null && media.duration > 0 ? media.duration * 1000 : 0
  const effectiveDurationMs = state.durationMs > 0 ? state.durationMs : knownDurationMs

  const playedFraction =
    effectiveDurationMs > 0 ? state.positionMs / effectiveDurationMs : 0
  const playedBars = Math.round(playedFraction * TOTAL_BARS)

  const activeColor   = isOwn ? 'rgba(255,255,255,0.92)' : '#3b82f6'
  const inactiveColor = isOwn ? 'rgba(255,255,255,0.28)' : 'rgba(100,116,139,0.45)'
  const iconColor     = isOwn ? '#ffffff' : '#3b82f6'
  const btnBg         = isOwn ? 'rgba(255,255,255,0.18)' : 'rgba(59,130,246,0.12)'
  const timeColor     = isOwn ? 'rgba(255,255,255,0.55)' : '#6b7280'

  const displayTime =
    state.isPlaying || state.positionMs > 0
      ? formatTime(state.positionMs)
      : formatTime(effectiveDurationMs)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>

      {/* Play / Pause */}
      <Pressable
        onPress={toggle}
        hitSlop={8}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: btnBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons
          name={state.isPlaying ? 'pause' : 'play'}
          size={15}
          color={iconColor}
          style={{ marginLeft: state.isPlaying ? 0 : 2 }}
        />
      </Pressable>

      {/* Waveform — fixed pixel width, bars centred vertically */}
      <View
        style={{
          width: WAVEFORM_WIDTH,
          height: BAR_MAX_H,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: BAR_GAP,
          flexShrink: 1,
          overflow: 'hidden',
        }}
      >
        {bars.map((h, i) => (
          <View
            key={i}
            style={{
              width: BAR_W,
              height: h,
              borderRadius: BAR_W / 2,
              backgroundColor: i < playedBars ? activeColor : inactiveColor,
            }}
          />
        ))}
      </View>

      {/* Duration */}
      <Text
        style={{
          fontSize: 11,
          color: timeColor,
          minWidth: 28,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {displayTime}
      </Text>
    </View>
  )
}
