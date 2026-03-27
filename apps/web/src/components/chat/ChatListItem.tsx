import React from 'react'
import { UnstyledButton, Group, Box, Text, Badge } from '@mantine/core'
import { Users, Megaphone, Cloud } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { formatDistanceToNowStrict } from 'date-fns'
import type { Chat } from '@phantom/sdk'

interface Props {
  chat: Chat
  isActive?: boolean
  onClick: () => void
}

function getTitle(chat: Chat) {
  if (chat.type === 'direct') return chat.peerName ?? chat.title ?? 'Direct'
  return chat.title ?? 'Chat'
}

function getPreview(chat: Chat) {
  if (chat.lastMessageText) return chat.lastMessageText
  if (chat.type === 'saved') return 'Tap to add a note'
  return 'No messages yet'
}

function TypeIcon({ chat }: { chat: Chat }) {
  if (chat.type === 'group')   return <Users size={12} color="#3b82f6" />
  if (chat.type === 'channel') return <Megaphone size={12} color="#7c3aed" />
  if (chat.type === 'saved')   return <Cloud size={12} color="#3b82f6" />
  return null
}

export function ChatListItem({ chat, isActive, onClick }: Props) {
  const title = getTitle(chat)
  const preview = getPreview(chat)
  const unread = chat.unreadCount ?? 0
  const timeStr = chat.lastMessageAt
    ? formatDistanceToNowStrict(new Date(chat.lastMessageAt), { addSuffix: false })
    : null

  return (
    <UnstyledButton
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        backgroundColor: isActive ? '#242424' : 'transparent',
        transition: 'background-color 100ms',
      }}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#1e1e1e' }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <Group gap={10} wrap="nowrap" align="center">
        <Avatar name={title} emoji={chat.avatarEmoji ?? undefined} color={chat.avatarColor ?? undefined} size={46} />

        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Top row: title + time */}
          <Group justify="space-between" gap={4} wrap="nowrap">
            <Group gap={4} style={{ minWidth: 0, flex: 1 }}>
              <Text
                size="sm"
                fw={600}
                c="dark.0"
                style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {title}
              </Text>
              <TypeIcon chat={chat} />
            </Group>
            {timeStr && (
              <Text size="xs" c={unread > 0 ? 'blue.5' : 'dark.3'} style={{ flexShrink: 0 }}>
                {timeStr}
              </Text>
            )}
          </Group>

          {/* Bottom row: preview + badge */}
          <Group justify="space-between" gap={4} mt={2} wrap="nowrap">
            <Text
              size="xs"
              c="dark.2"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
            >
              {preview}
            </Text>
            {unread > 0 && (
              <Badge
                size="xs"
                radius="xl"
                color="blue"
                style={{ flexShrink: 0 }}
              >
                {unread > 99 ? '99+' : unread}
              </Badge>
            )}
          </Group>
        </Box>
      </Group>
    </UnstyledButton>
  )
}
