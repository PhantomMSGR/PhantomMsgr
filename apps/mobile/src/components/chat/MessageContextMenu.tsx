import React, { useCallback, useEffect, useRef } from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Message } from '@/types'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const MENU_WIDTH = 240
const EMOJI_SIZE = 40

export type ContextMenuAction =
  | 'reply'
  | 'copy'
  | 'forward'
  | 'edit'
  | 'pin'
  | 'delete'

interface Props {
  message: Message | null
  isOwn: boolean
  isPinned?: boolean
  messageY: number
  onClose: () => void
  onAction: (action: ContextMenuAction, message: Message) => void
  onReact: (emoji: string, message: Message) => void
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function getActions(isOwn: boolean, isPinned: boolean): Array<{
  key: ContextMenuAction
  label: string
  icon: IoniconsName
  danger?: boolean
}> {
  return [
    { key: 'reply',   label: 'Reply',   icon: 'arrow-undo-outline' },
    { key: 'copy',    label: 'Copy',    icon: 'copy-outline' },
    { key: 'forward', label: 'Forward', icon: 'arrow-redo-outline' },
    { key: 'pin',     label: isPinned ? 'Unpin' : 'Pin', icon: isPinned ? 'pin' : 'pin-outline' },
    ...(isOwn ? [
      { key: 'edit'   as ContextMenuAction, label: 'Edit',   icon: 'pencil-outline' as IoniconsName },
      { key: 'delete' as ContextMenuAction, label: 'Delete', icon: 'trash-outline'  as IoniconsName, danger: true },
    ] : []),
  ]
}

// ─── Simplified message preview (selectable text) ─────────────────────────────

function MessagePreview({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const bubbleColor = isOwn ? '#1a3a6a' : '#1e1e28'
  const border = isOwn
    ? 'rgba(59,130,246,0.3)'
    : 'rgba(255,255,255,0.08)'

  const content = (() => {
    if (message.text) return message.text
    const labels: Record<string, string> = {
      photo: '📷 Photo', video: '🎬 Video',
      audio: '🎵 Audio', voice: '🎤 Voice message',
      document: '📄 Document',
    }
    return labels[message.type] ?? 'Message'
  })()

  return (
    <View style={{
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      maxWidth: SCREEN_W * 0.72,
      marginHorizontal: 16,
    }}>
      <View style={{
        backgroundColor: bubbleColor,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55,
        shadowRadius: 22,
        elevation: 18,
      }}>
        <Text
          selectable
          style={{ color: '#fff', fontSize: 15, lineHeight: 21 }}
        >
          {content}
        </Text>
        {message.isEdited && (
          <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 }}>
            edited
          </Text>
        )}
      </View>
    </View>
  )
}

// ─── Emoji button ─────────────────────────────────────────────────────────────

function EmojiButton({ emoji, delay, onPress }: { emoji: string; delay: number; onPress: () => void }) {
  const scale = useSharedValue(0)
  useEffect(() => {
    const t = setTimeout(() => {
      scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.back(1.4)) })
    }, delay)
    return () => clearTimeout(t)
  }, [delay, scale])

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <Animated.Text style={[style, { fontSize: EMOJI_SIZE * 0.65 }]}>{emoji}</Animated.Text>
    </Pressable>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MessageContextMenu({
  message,
  isOwn,
  isPinned,
  messageY,
  onClose,
  onAction,
  onReact,
}: Props) {
  const backdropOpacity = useSharedValue(0)
  const contentScale   = useSharedValue(0.93)
  const contentOpacity = useSharedValue(0)

  const scrollRef = useRef<ScrollView>(null)

  useEffect(() => {
    if (message) {
      backdropOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) })
      contentScale.value    = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })
      contentOpacity.value  = withTiming(1, { duration: 180 })
    }
  }, [message, backdropOpacity, contentScale, contentOpacity])

  const backdropStyle  = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }))
  const contentStyle   = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }))

  const handleAction = useCallback(
    (action: ContextMenuAction) => {
      if (!message) return
      onAction(action, message)
      onClose()
    },
    [message, onAction, onClose],
  )

  const handleReact = useCallback(
    (emoji: string) => {
      if (!message) return
      onReact(emoji, message)
      onClose()
    },
    [message, onReact, onClose],
  )

  if (!message) return null

  const actions = getActions(isOwn, isPinned ?? false)

  // Determine vertical layout:
  // If the tap was in the lower 55% of screen, push everything up.
  // Otherwise show it below the tap point.
  const isLowerHalf = messageY > SCREEN_H * 0.5
  // approx content height: bubble ~60 + gap + emoji row 60 + actions * 50
  const contentH = 60 + 16 + 60 + actions.length * 50 + 16
  const topPosition = isLowerHalf
    ? Math.max(24, messageY - contentH)
    : Math.min(messageY - 30, SCREEN_H - contentH - 24)

  // Align menu card same side as bubble
  const menuLeft  = isOwn ? undefined : 16
  const menuRight = isOwn ? 16        : undefined

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      {/* Dark backdrop */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.78)',
          },
          backdropStyle,
        ]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Content: message preview + reactions + menu */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: topPosition,
            left: 0,
            right: 0,
          },
          contentStyle,
        ]}
        pointerEvents="box-none"
      >
        <ScrollView
          ref={scrollRef}
          pointerEvents="box-none"
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* Message bubble preview */}
          <MessagePreview message={message} isOwn={isOwn} />

          <View style={{ height: 12 }} />

          {/* Quick emoji reactions */}
          <View style={{
            alignSelf: isOwn ? 'flex-end' : 'flex-start',
            marginHorizontal: 16,
            flexDirection: 'row',
            gap: 4,
            backgroundColor: '#1e1e28',
            borderRadius: 24,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 14,
            elevation: 12,
          }}>
            {QUICK_EMOJIS.map((emoji, i) => (
              <EmojiButton
                key={emoji}
                emoji={emoji}
                delay={i * 25}
                onPress={() => handleReact(emoji)}
              />
            ))}
          </View>

          <View style={{ height: 8 }} />

          {/* Action menu card */}
          <View style={{
            width: MENU_WIDTH,
            alignSelf: 'flex-start',
            marginLeft: menuLeft,
            marginRight: menuRight,
            ...(menuRight !== undefined ? { alignSelf: 'flex-end' } : {}),
            backgroundColor: '#1e1e28',
            borderRadius: radius.xl,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 16,
          }}>
            {actions.map((action, i) => (
              <Pressable
                key={action.key}
                onPress={() => handleAction(action.key)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: pressed ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: 'rgba(255,255,255,0.06)',
                })}
              >
                <Ionicons
                  name={action.icon}
                  size={19}
                  color={action.danger ? colors.danger : 'rgba(255,255,255,0.6)'}
                  style={{ marginRight: 12 }}
                />
                <Text style={{
                  fontSize: fontSize.base,
                  fontWeight: '500',
                  color: action.danger ? colors.danger : colors.textPrimary,
                  flex: 1,
                }}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  )
}

