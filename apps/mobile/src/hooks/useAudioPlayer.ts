import { useCallback } from 'react'
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from 'expo-audio'

export interface AudioPlayerState {
  isLoaded: boolean
  isPlaying: boolean
  positionMs: number
  durationMs: number
  isFinished: boolean
}

export function useAudioPlayer(uri: string | null) {
  const player = useExpoAudioPlayer(uri ? { uri } : null, { updateInterval: 100 })
  const status = useAudioPlayerStatus(player)

  const play = useCallback(async () => {
    try {
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false })
      if (status.didJustFinish) {
        await player.seekTo(0)
      }
      player.play()
    } catch (err) {
      console.warn('[useAudioPlayer] play error:', err)
    }
  }, [player, status.didJustFinish])

  const pause = useCallback(() => {
    try {
      player.pause()
    } catch (err) {
      console.warn('[useAudioPlayer] pause error:', err)
    }
  }, [player])

  const seek = useCallback(async (positionMs: number) => {
    try {
      await player.seekTo(positionMs / 1000)
    } catch (err) {
      console.warn('[useAudioPlayer] seek error:', err)
    }
  }, [player])

  const toggle = useCallback(async () => {
    if (status.playing) {
      pause()
    } else {
      await play()
    }
  }, [status.playing, play, pause])

  return {
    state: {
      isLoaded: status.isLoaded,
      isPlaying: status.playing,
      positionMs: Math.round(status.currentTime * 1000),
      durationMs: Math.round(status.duration * 1000),
      isFinished: status.didJustFinish,
    } as AudioPlayerState,
    play,
    pause,
    seek,
    toggle,
  }
}
