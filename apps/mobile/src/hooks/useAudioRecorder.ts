import { useCallback } from 'react'
import {
  useAudioRecorder as useExpoAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio'

export interface AudioRecorderState {
  isRecording: boolean
  durationMs: number
  waveformBars: number[]
  uri: string | null
}

export function useAudioRecorder() {
  const recorder = useExpoAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  })
  const recorderState = useAudioRecorderState(recorder, 100)

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) throw new Error('Microphone permission denied')

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()
    } catch (err) {
      console.warn('[useAudioRecorder] startRecording failed:', err)
      throw err
    }
  }, [recorder])

  const stopRecording = useCallback(async (): Promise<{ uri: string; durationMs: number } | null> => {
    if (!recorder.isRecording) return null
    try {
      const durationMs = recorder.getStatus().durationMillis
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false })
      const uri = recorder.uri
      return uri ? { uri, durationMs } : null
    } catch (err) {
      console.warn('[useAudioRecorder] stopRecording failed:', err)
      return null
    }
  }, [recorder])

  const cancelRecording = useCallback(async () => {
    if (recorder.isRecording) {
      try { await recorder.stop() } catch {}
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {})
  }, [recorder])

  return {
    state: {
      isRecording: recorderState.isRecording,
      durationMs: recorderState.durationMillis,
      waveformBars: [],
      uri: recorderState.url,
    } as AudioRecorderState,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
