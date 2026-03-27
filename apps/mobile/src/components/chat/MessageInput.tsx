import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as RNTextInput,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
  interpolateColor,
  Extrapolation,
} from 'react-native-reanimated'
import {
  useAudioRecorder,
  useAudioRecorderState,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fontSize, radius } from '@/constants/theme'
import { ANIM } from '@/constants/animation'

interface Props {
  chatId: string
  onSend: (text: string) => Promise<void>
  onEdit?: (messageId: string, text: string) => Promise<void>
  onSendVoice?: (uri: string, durationMs: number) => Promise<void>
  onAttachImage?: () => void
  onTypingStart?: () => void
  onTypingStop?: () => void
  replyTo?: { id: string; text: string | null; senderName?: string | null } | null
  onCancelReply?: () => void
  editingMessage?: { id: string; text: string } | null
  onCancelEdit?: () => void
}

// Format seconds → m:ss
function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MessageInput({
  onSend,
  onEdit,
  onSendVoice,
  onAttachImage,
  onTypingStart,
  onTypingStop,
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}: Props) {
  const { bottom: bottomInset } = useSafeAreaInsets()
  const [text, setText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<RNTextInput>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder, 100)
  const isRecording = recorderState.isRecording
  const recordingDuration = recorderState.durationMillis

  // 0 = mic icon, 1 = send icon
  const sendProgress = useSharedValue(0)
  // 0 = hidden, 1 = visible (reply banner)
  const replyVisible = useSharedValue(replyTo ? 1 : 0)
  // 0 = hidden, 1 = visible (edit banner)
  const editVisible = useSharedValue(editingMessage ? 1 : 0)
  // 0→1 pulse animation for recording dot
  const recordPulse = useSharedValue(0)

  const canSend = text.trim().length > 0

  // Animate send button when canSend changes
  useEffect(() => {
    sendProgress.value = withTiming(canSend ? 1 : 0, {
      duration: ANIM.duration.fast,
      easing: ANIM.easing.standard,
    })
  }, [canSend, sendProgress])

  // Animate reply banner in/out
  useEffect(() => {
    replyVisible.value = withTiming(replyTo ? 1 : 0, {
      duration: ANIM.duration.fast,
      easing: ANIM.easing.standard,
    })
  }, [replyTo, replyVisible])

  // Animate edit banner in/out + pre-fill text
  useEffect(() => {
    editVisible.value = withTiming(editingMessage ? 1 : 0, {
      duration: ANIM.duration.fast,
      easing: ANIM.easing.standard,
    })
    if (editingMessage) {
      setText(editingMessage.text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [editingMessage, editVisible])

  // Pulse recording indicator
  useEffect(() => {
    if (isRecording) {
      recordPulse.value = withRepeat(
        withTiming(1, { duration: 700 }),
        -1,
        true,
      )
    } else {
      recordPulse.value = 0
    }
  }, [isRecording, recordPulse])

  const sendBtnStyle = useAnimatedStyle(() => ({
    backgroundColor: isRecording
      ? colors.danger
      : interpolateColor(
          sendProgress.value,
          [0, 1],
          [colors.bgElevated, colors.primary],
        ),
  }))

  // Separate scale styles for mic and arrow icons
  const micIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(sendProgress.value, [0, 0.5], [1, 0], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(sendProgress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
    position: 'absolute',
  }))

  const arrowIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(sendProgress.value, [0.5, 1], [0, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(sendProgress.value, [0.6, 1], [0, 1], Extrapolation.CLAMP),
    position: 'absolute',
  }))

  const replyBannerStyle = useAnimatedStyle(() => ({
    height: interpolate(replyVisible.value, [0, 1], [0, 50], Extrapolation.CLAMP),
    opacity: replyVisible.value,
    overflow: 'hidden',
  }))

  const editBannerStyle = useAnimatedStyle(() => ({
    height: interpolate(editVisible.value, [0, 1], [0, 44], Extrapolation.CLAMP),
    opacity: editVisible.value,
    overflow: 'hidden',
  }))

  const recordDotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(recordPulse.value, [0, 1], [1, 0.3]),
    transform: [{ scale: interpolate(recordPulse.value, [0, 1], [1, 1.2]) }],
  }))

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value)
      if (value.length > 0) {
        if (!isTypingRef.current) {
          isTypingRef.current = true
          onTypingStart?.()
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
        typingTimerRef.current = setTimeout(() => {
          isTypingRef.current = false
          onTypingStop?.()
        }, 2_000)
      } else {
        if (isTypingRef.current) {
          isTypingRef.current = false
          onTypingStop?.()
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      }
    },
    [onTypingStart, onTypingStop],
  )

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return

    isTypingRef.current = false
    onTypingStop?.()
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)

    setIsSending(true)
    setText('')
    Keyboard.dismiss()
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      if (editingMessage && onEdit) {
        await onEdit(editingMessage.id, trimmed)
        onCancelEdit?.()
      } else {
        await onSend(trimmed)
      }
    } finally {
      setIsSending(false)
    }
  }, [text, isSending, onSend, onEdit, editingMessage, onCancelEdit, onTypingStop])

  // ── Voice recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync()
      if (!granted) return

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
      await recorder.prepareToRecordAsync()
      recorder.record()

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch {
      // Permission denied or device doesn't support recording
    }
  }, [recorder])

  const stopRecording = useCallback(
    async (send: boolean) => {
      if (!recorder.isRecording) return

      const duration = recorder.getStatus().durationMillis

      try {
        await recorder.stop()
        await setAudioModeAsync({ allowsRecording: false })

        if (send && duration > 500 && onSendVoice) {
          const uri = recorder.uri
          if (uri) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            await onSendVoice(uri, duration)
          }
        }
      } catch {
        // ignore
      }
    },
    [recorder, onSendVoice],
  )

  return (
    <View style={styles.wrapper}>
      {/* Edit banner — animated height */}
      <Animated.View style={editBannerStyle}>
        <View style={[styles.replyBanner, styles.editBanner]}>
          <View style={[styles.replyAccent, styles.editAccent]} />
          <View style={styles.replyBody}>
            <Text style={[styles.replyName, styles.editLabel]}>Editing message</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {editingMessage?.text ?? ''}
            </Text>
          </View>
          <Pressable onPress={onCancelEdit} hitSlop={14} style={styles.replyClose}>
            <Ionicons name="close" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Reply banner — animated height */}
      <Animated.View style={replyBannerStyle}>
        <View style={styles.replyBanner}>
          <View style={styles.replyAccent} />
          <View style={styles.replyBody}>
            <Text style={styles.replyName} numberOfLines={1}>
              {replyTo?.senderName ?? 'Reply'}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {replyTo?.text ?? 'Photo'}
            </Text>
          </View>
          <Pressable onPress={onCancelReply} hitSlop={14} style={styles.replyClose}>
            <Ionicons name="close" size={17} color={colors.textMuted} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Recording indicator overlay */}
      {isRecording && (
        <View style={styles.recordingRow}>
          <Animated.View style={[styles.recordDot, recordDotStyle]} />
          <Text style={styles.recordingText}>Recording… {formatDuration(recordingDuration)}</Text>
          <Pressable onPress={() => stopRecording(false)} hitSlop={8}>
            <Text style={styles.cancelRecord}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* Input row — hidden while recording */}
      {!isRecording && (
        <View style={styles.row}>
          {/* Attach */}
          <Pressable
            onPress={onAttachImage}
            hitSlop={8}
            style={({ pressed }) => [
              styles.sideBtn,
              pressed && styles.sideBtnPressed,
            ]}
          >
            <Ionicons name="attach" size={24} color={colors.textSecondary} />
          </Pressable>

          {/* Text field pill */}
          <View style={styles.pill}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleChangeText}
              placeholder="Message"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
              returnKeyType="default"
              blurOnSubmit={false}
            />
          </View>

          {/* Send / mic — animated */}
          <Pressable
            onPress={canSend ? handleSend : undefined}
            onLongPress={!canSend ? startRecording : undefined}
            onPressOut={isRecording ? () => stopRecording(true) : undefined}
            delayLongPress={200}
            disabled={isSending}
            hitSlop={4}
            style={styles.sendBtnOuter}
          >
            <Animated.View style={[styles.sendBtn, sendBtnStyle]}>
              {/* Mic icon */}
              <Animated.View style={micIconStyle}>
                <Ionicons name="mic-outline" size={20} color={colors.textSecondary} />
              </Animated.View>
              {/* Send icon */}
              <Animated.View style={arrowIconStyle}>
                <Ionicons name="arrow-up" size={20} color={colors.white} />
              </Animated.View>
            </Animated.View>
          </Pressable>
        </View>
      )}

      {/* Recording row action bar */}
      {isRecording && (
        <View style={styles.row}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => stopRecording(true)}
            hitSlop={4}
            style={styles.sendBtnOuter}
          >
            <View style={[styles.sendBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="send" size={18} color={colors.white} />
            </View>
          </Pressable>
        </View>
      )}

      {/* Bottom safe-area filler (navigation bar on Android, home indicator on iOS) */}
      {bottomInset > 0 && <View style={{ height: bottomInset }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderLight,
  },

  // Edit banner
  editBanner: {
    height: 44,
  },
  editAccent: {
    backgroundColor: '#f59e0b',
  },
  editLabel: {
    color: '#f59e0b',
  },

  // Reply banner
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 50,
  },
  replyAccent: {
    width: 2.5,
    height: 32,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginRight: 10,
  },
  replyBody: {
    flex: 1,
    justifyContent: 'center',
  },
  replyName: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
    lineHeight: 16,
  },
  replyText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  replyClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  sideBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    marginBottom: 1,
  },
  sideBtnPressed: {
    backgroundColor: colors.bgElevated,
  },

  // Pill text field
  pill: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    borderRadius: 22,
    minHeight: 40,
    maxHeight: 130,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 9 : 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    lineHeight: 21,
    padding: 0,
    margin: 0,
  },

  // Send button
  sendBtnOuter: {
    marginBottom: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Recording
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  cancelRecord: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
})
