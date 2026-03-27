import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  currentIndex: number
  onPress: () => void
  onClose: () => void
}

function getPreview(message: Message): string {
  if (message.text) return message.text
  const labels: Record<string, string> = {
    photo: '📷 Photo', video: '🎬 Video', audio: '🎵 Audio',
    voice: '🎤 Voice message', document: '📄 Document',
  }
  return labels[message.type] ?? 'Message'
}

export function PinnedMessageBanner({ messages, currentIndex, onPress, onClose }: Props) {
  const total = messages.length
  const message = messages[currentIndex]

  if (!message) return null

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Segmented accent — each segment represents one pinned message */}
      <View style={styles.accentColumn}>
        {total === 1 ? (
          <View style={[styles.accentSegment, styles.accentSegmentActive]} />
        ) : (
          Array.from({ length: total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.accentSegment,
                i === currentIndex && styles.accentSegmentActive,
                i < total - 1 && styles.accentSegmentGap,
              ]}
            />
          ))
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          {total > 1 ? `Pinned message ${currentIndex + 1}/${total}` : 'Pinned message'}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {getPreview(message)}
        </Text>
      </View>

      <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  accentColumn: {
    width: 3,
    alignSelf: 'stretch',
    marginRight: 10,
    borderRadius: radius.sm,
    overflow: 'hidden',
    flexDirection: 'column',
    gap: 2,
  },
  accentSegment: {
    flex: 1,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  accentSegmentActive: {
    backgroundColor: colors.primary,
  },
  accentSegmentGap: {
    // gap is handled by the gap style above
  },
  content: {
    flex: 1,
  },
  label: {
    color: colors.primary,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
})
