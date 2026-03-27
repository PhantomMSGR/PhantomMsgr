import React, { memo, useCallback, useEffect, useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { Avatar } from '@phantom/ui'
import { DeliveryStatus } from './DeliveryStatus'
import { VoiceMessageBubble } from './VoiceMessageBubble'
import { colors, fontSize } from '@/constants/theme'
import { ANIM } from '@/constants/animation'
import { usePreferencesStore, formatMessageTime } from '@/store/preferences.store'
import type { Message, MessageStatus } from '@/types'

// Must match the chat screen list background for the tail cutout trick
export const CHAT_BG = '#0f0f0f'

// Telegram-style outer corner radius
const R_OUTER = 18
const R_INNER = 4
const R_TAIL  = 3   // near-zero where the tail starts

interface Props {
  message: Message
  isOwn: boolean
  isFirst: boolean
  isLast: boolean
  showAvatar: boolean
  senderName?: string
  status?: MessageStatus
  onLongPress?: (message: Message, pageX: number, pageY: number) => void
  onReplyPress?: (messageId: string) => void
  replyToMessage?: Message | null
  replyToSenderName?: string
  highlighted?: boolean
}

// ─── Telegram-style tail ──────────────────────────────────────────────────────
// Two-view technique: a filled rectangle + a circle "cutout" in CHAT_BG color

function OwnTail() {
  return (
    <>
      {/* Tail body — same color as own bubble */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -8,
          bottom: 0,
          width: 9,
          height: 16,
          backgroundColor: colors.bubbleOwn,
        }}
      />
      {/* Circle cutout — matches chat background, creates the curved swoosh */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -18,
          bottom: -5,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: CHAT_BG,
        }}
      />
    </>
  )
}

function OtherTail() {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -8,
          bottom: 0,
          width: 9,
          height: 16,
          backgroundColor: colors.bubbleOther,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -18,
          bottom: -5,
          width: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: CHAT_BG,
        }}
      />
    </>
  )
}

// ─── Reactions ────────────────────────────────────────────────────────────────

function ReactionRow({
  reactions,
  isOwn,
}: {
  reactions: Record<string, number> | null
  isOwn: boolean
}) {
  const entries = Object.entries(reactions ?? {}).filter(([, n]) => n > 0)
  if (entries.length === 0) return null
  return (
    <View style={[styles.reactionsRow, isOwn ? styles.reactionsOwn : styles.reactionsOther]}>
      {entries.map(([emoji, count]) => (
        <View key={emoji} style={styles.reactionChip}>
          <Text style={styles.reactionEmoji}>{emoji}</Text>
          {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
        </View>
      ))}
    </View>
  )
}

// ─── Main bubble ─────────────────────────────────────────────────────────────

export const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  isFirst,
  isLast,
  showAvatar,
  senderName,
  status,
  onLongPress,
  onReplyPress,
  replyToMessage,
  replyToSenderName,
  highlighted = false,
}: Props) {
  const pressRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const use24Hour = usePreferencesStore((s) => s.use24Hour)
  const flashOpacity = useSharedValue(0)

  // Highlight flash on scroll-to
  useEffect(() => {
    if (highlighted) {
      flashOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 180, easing: ANIM.easing.standard }),
          withTiming(0, { duration: 320, easing: ANIM.easing.standard }),
        ),
        3,
        false,
      )
    } else {
      flashOpacity.value = 0
    }
  }, [highlighted, flashOpacity])

  const flashStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: R_OUTER,
    backgroundColor: interpolateColor(
      flashOpacity.value,
      [0, 1],
      ['rgba(250,210,60,0)', 'rgba(250,210,60,0.38)'],
    ),
  }))

  const handleLongPress = useCallback(() => {
    onLongPress?.(message, pressRef.current.x, pressRef.current.y)
  }, [message, onLongPress])

  const timeStr = formatMessageTime(message.createdAt, use24Hour)
  const isPhotoOnly = message.type === 'photo' && !message.text
  const hasReactions = Object.values(message.reactions ?? {}).some((n) => n > 0)

  // ── Deleted ────────────────────────────────────────────────────────────────
  if (message.isDeleted) {
    return (
      <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther, styles.deletedRow]}>
        <View style={styles.deletedBubble}>
          <Text style={styles.deletedText}>Message deleted</Text>
        </View>
      </View>
    )
  }

  // ── Telegram border-radius pattern ────────────────────────────────────────
  const bubbleRadius = isOwn
    ? {
        borderTopLeftRadius: R_OUTER,
        borderTopRightRadius: isFirst ? R_OUTER : R_INNER,
        borderBottomRightRadius: isLast ? R_TAIL : R_INNER,
        borderBottomLeftRadius: R_OUTER,
      }
    : {
        borderTopLeftRadius: isFirst ? R_OUTER : R_INNER,
        borderTopRightRadius: R_OUTER,
        borderBottomRightRadius: R_OUTER,
        borderBottomLeftRadius: isLast ? R_TAIL : R_INNER,
      }

  return (
    <Animated.View
      entering={FadeIn.duration(120)}
      style={[
        styles.row,
        isOwn ? styles.rowOwn : styles.rowOther,
        { marginBottom: isLast ? 8 : 2 },
      ]}
    >
      {/* Avatar slot — only for others in group chats */}
      {!isOwn && (
        <View style={styles.avatarSlot}>
          {showAvatar && <Avatar name={senderName ?? '?'} size={28} />}
        </View>
      )}

      {/* Column: bubble + tail + reactions */}
      <View style={[styles.msgColumn, isOwn && styles.msgColumnOwn]}>
        {/* Relative wrapper for bubble + absolutely-positioned tail */}
        <View style={styles.bubbleWrap}>
          <Pressable
            onPressIn={(e) => {
              pressRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }
            }}
            onLongPress={handleLongPress}
            delayLongPress={350}
            style={[
              styles.bubble,
              isOwn ? styles.bubbleOwn : styles.bubbleOther,
              bubbleRadius,
              isPhotoOnly && styles.bubbleNoPadding,
            ]}
          >
            {/* Flash highlight overlay */}
            <Animated.View style={flashStyle} pointerEvents="none" />

            {/* Sender name (group chats) */}
            {!isOwn && senderName && isFirst && (
              <Text style={styles.senderName}>{senderName}</Text>
            )}

            {/* Reply preview */}
            {replyToMessage ? (
              <Pressable
                onPress={() => onReplyPress?.(replyToMessage.id)}
                style={[
                  styles.replyPreview,
                  isOwn ? styles.replyPreviewOwn : styles.replyPreviewOther,
                ]}
              >
                <Text
                  style={[styles.replyAuthor, isOwn && styles.replyAuthorOwn]}
                  numberOfLines={1}
                >
                  {replyToSenderName ?? 'Message'}
                </Text>
                <Text style={styles.replyText} numberOfLines={2}>
                  {replyToMessage.text ?? '📎 Media'}
                </Text>
              </Pressable>
            ) : message.replyToMessageId ? (
              <Pressable
                onPress={() => onReplyPress?.(message.replyToMessageId!)}
                style={[
                  styles.replyPreview,
                  isOwn ? styles.replyPreviewOwn : styles.replyPreviewOther,
                ]}
              >
                <Text style={[styles.replyAuthor, isOwn && styles.replyAuthorOwn]}>
                  Reply
                </Text>
                <Text style={styles.replyText}>Original message not loaded</Text>
              </Pressable>
            ) : null}

            {/* Photo */}
            {message.type === 'photo' && message.mediaId && (
              <View
                style={[
                  styles.photoWrapper,
                  message.text && styles.photoWithCaption,
                ]}
              >
                <Image
                  source={{ uri: message.media?.url ?? '' }}
                  style={styles.photo}
                  contentFit="cover"
                  placeholder={{ blurhash: 'LGF5?xYk^6#M@-5c,1J5@[or[Q6.' }}
                  transition={200}
                />
                {/* Time overlay for photo-only messages */}
                {isPhotoOnly && (
                  <View style={styles.photoTimeBar}>
                    {message.isEdited && (
                      <Text style={styles.photoTimeMeta}>edited</Text>
                    )}
                    <Text style={styles.photoTimeMeta}>{timeStr}</Text>
                    {isOwn && status && <DeliveryStatus status={status} />}
                  </View>
                )}
              </View>
            )}

            {/* Voice */}
            {message.type === 'voice' && (
              <VoiceMessageBubble
                mediaUri={message.media?.url ?? null}
                media={message.media}
                isOwn={isOwn}
              />
            )}

            {/* Text */}
            {message.text ? (
              <Text
                style={[
                  styles.messageText,
                  isOwn ? styles.textOwn : styles.textOther,
                ]}
              >
                {message.text}
              </Text>
            ) : null}

            {/* Footer: time + delivery status — always in normal flow */}
            {!isPhotoOnly && (
              <View style={styles.footer}>
                {message.isEdited && (
                  <Text
                    style={[
                      styles.timeMeta,
                      isOwn ? styles.timeMetaOwn : styles.timeMetaOther,
                    ]}
                  >
                    edited
                  </Text>
                )}
                <Text
                  style={[
                    styles.timeMeta,
                    isOwn ? styles.timeMetaOwn : styles.timeMetaOther,
                  ]}
                >
                  {timeStr}
                </Text>
                {isOwn && status && <DeliveryStatus status={status} />}
              </View>
            )}
          </Pressable>

          {/* Telegram-style tail */}
          {isLast && isOwn && <OwnTail />}
          {isLast && !isOwn && <OtherTail />}
        </View>

        {/* Reactions — outside the bubble, overlapping its bottom edge */}
        {hasReactions && (
          <ReactionRow reactions={message.reactions} isOwn={isOwn} />
        )}
      </View>
    </Animated.View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  rowOwn:   { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  deletedRow: { marginBottom: 4 },

  // ── Deleted ──────────────────────────────────────────────────────────────
  deletedBubble: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R_OUTER,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  deletedText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },

  // ── Avatar ────────────────────────────────────────────────────────────────
  avatarSlot: {
    width: 32,
    marginRight: 4,
    alignSelf: 'flex-end',
    marginBottom: 2,
  },

  // ── Message column (bubble + reactions) ──────────────────────────────────
  msgColumn: {
    maxWidth: '80%',
    alignItems: 'flex-start',
  },
  msgColumnOwn: {
    alignItems: 'flex-end',
  },

  // ── Bubble wrap (bubble + tail) ───────────────────────────────────────────
  bubbleWrap: {
    position: 'relative',
  },

  // ── Bubble ────────────────────────────────────────────────────────────────
  bubble: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  bubbleOwn:      { backgroundColor: colors.bubbleOwn },
  bubbleOther:    { backgroundColor: colors.bubbleOther },
  bubbleNoPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },

  // ── Sender name ──────────────────────────────────────────────────────────
  senderName: {
    color: colors.primaryLight,
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 3,
    letterSpacing: 0.1,
  },

  // ── Reply preview ────────────────────────────────────────────────────────
  replyPreview: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderRadius: 2,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  replyPreviewOwn:   { borderLeftColor: 'rgba(255,255,255,0.7)' },
  replyPreviewOther: { borderLeftColor: colors.primaryLight },
  replyAuthor: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: 1,
  },
  replyAuthorOwn: { color: 'rgba(255,255,255,0.85)' },
  replyText: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 17,
  },

  // ── Photo ─────────────────────────────────────────────────────────────────
  photoWrapper: {
    width: 240,
    height: 180,
    overflow: 'hidden',
  },
  photoWithCaption: {
    marginBottom: 6,
    borderRadius: 10,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  photoTimeBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  photoTimeMeta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 10.5,
  },

  // ── Text ─────────────────────────────────────────────────────────────────
  messageText: {
    fontSize: 15.5,
    lineHeight: 22,
  },
  textOwn:   { color: '#ffffff' },
  textOther: { color: colors.textPrimary },

  // ── Footer (time + status) ────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    marginTop: 3,
    marginBottom: -1,
  },
  timeMeta: { fontSize: 10.5 },
  timeMetaOwn:   { color: 'rgba(255,255,255,0.55)' },
  timeMetaOther: { color: colors.textMuted },

  // ── Reactions (below bubble) ──────────────────────────────────────────────
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  reactionsOwn:   { justifyContent: 'flex-end' },
  reactionsOther: { justifyContent: 'flex-start' },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
})
