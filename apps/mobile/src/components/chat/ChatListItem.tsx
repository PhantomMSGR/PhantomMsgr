import React, { memo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { Avatar } from '@phantom/ui'
import { colors, fontSize, radius } from '@/constants/theme'
import { usePreferencesStore, formatChatTime } from '@/store/preferences.store'
import { QUERY_KEYS } from '@/config'
import type { Chat } from '@/types'

interface Props {
  chat: Chat
  currentUserId: string
  onPress: (chatId: string) => void
  unreadCount?: number
}

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function getChatTypeBadge(chat: Chat): { icon: IoniconsName; color: string } | null {
  if (chat.type === 'direct') return null
  if (chat.type === 'group')   return { icon: 'people-outline',         color: '#3b82f6' }
  if (chat.type === 'channel') return { icon: 'megaphone-outline',      color: '#8b5cf6' }
  if (chat.type === 'saved') {
    if (chat.savedType === 'local')
      return { icon: 'phone-portrait-outline', color: '#f59e0b' }
    return { icon: 'cloud-outline', color: '#3b82f6' }
  }
  return null
}

function getChatTitle(chat: Chat, cachedChat?: Chat | null): string {
  if (chat.type === 'saved') return chat.title ?? 'Saved Messages'
  if (chat.type === 'direct') {
    // Prefer peerName from the list response; fall back to the individual-chat cache
    // (populated by getChatById) which always carries the resolved peer name.
    const peerName = chat.peerName ?? cachedChat?.peerName
    return peerName ?? chat.title ?? 'Direct'
  }
  if (chat.title) return chat.title
  return 'Unknown Chat'
}

function getPreviewText(chat: Chat): string {
  if (chat.lastMessageText) return chat.lastMessageText
  if (chat.lastMessageType && chat.lastMessageType !== 'text') {
    const labels: Record<string, string> = {
      photo: '📷 Photo', video: '🎬 Video', audio: '🎵 Audio',
      voice: '🎤 Voice message', document: '📄 Document',
    }
    return labels[chat.lastMessageType] ?? chat.lastMessageType
  }
  if (chat.type === 'saved') return 'Tap to add a note'
  if (chat.type === 'channel') return 'Channel'
  return 'No messages yet'
}

export const ChatListItem = memo(function ChatListItem({
  chat,
  onPress,
  unreadCount = 0,
}: Props) {
  const use24Hour = usePreferencesStore((s) => s.use24Hour)
  const queryClient = useQueryClient()
  const cachedChat = chat.type === 'direct'
    ? queryClient.getQueryData<Chat>(QUERY_KEYS.CHAT(chat.id))
    : undefined
  const title = getChatTitle(chat, cachedChat)
  const typeBadge = getChatTypeBadge(chat)
  const hasUnread = unreadCount > 0
  const timeStr = (chat.lastMessageAt ?? (chat.lastMessageId ? chat.updatedAt : null))
  const preview = getPreviewText(chat)

  return (
    <Pressable
      onPress={() => onPress(chat.id)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <Avatar name={title} emoji={chat.avatarEmoji} color={chat.avatarColor} size={52} />

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {typeBadge ? (
              <Ionicons name={typeBadge.icon} size={13} color={typeBadge.color} style={styles.verifiedIcon} />
            ) : null}
            {chat.isVerified ? (
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={styles.verifiedIcon} />
            ) : null}
            {chat.isMuted ? (
              <Ionicons name="volume-mute" size={14} color={colors.textMuted} style={styles.verifiedIcon} />
            ) : null}
          </View>

          {timeStr ? (
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {formatChatTime(timeStr, use24Hour)}
            </Text>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <Text style={[styles.preview, !chat.lastMessageId && styles.previewEmpty]} numberOfLines={1}>
            {preview}
          </Text>

          {hasUnread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: colors.bgElevated,
  },
  content: {
    flex: 1,
    marginLeft: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  title: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.base,
    flexShrink: 1,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  timeUnread: {
    color: colors.primary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  preview: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    flex: 1,
    marginRight: 8,
  },
  previewEmpty: {
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: 'bold',
  },
})
