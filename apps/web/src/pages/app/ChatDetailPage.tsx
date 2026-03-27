import React, { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import {
  Box, Group, Text, Textarea, ActionIcon,
  Center, Loader, Stack,
} from '@mantine/core'
import { SendHorizonal } from 'lucide-react'
import { format } from 'date-fns'
import { sdk } from '@/lib/sdk'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'
import type { Message } from '@phantom/sdk'

export function ChatDetailPage() {
  const { chatId } = useParams<{ chatId: string }>()
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: chat } = useQuery({
    queryKey: ['chat', chatId],
    queryFn: () => sdk.chats.get(chatId!),
    enabled: !!chatId,
  })

  const { data: messagesData, isLoading } = useInfiniteQuery({
    queryKey: ['messages', chatId],
    queryFn: ({ pageParam }) => sdk.messages.list(chatId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!chatId,
  })

  const messages: Message[] = messagesData?.pages.flatMap((p) => p.items).reverse() ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length])

  const title = chat?.type === 'direct'
    ? (chat.peerName ?? 'Direct')
    : (chat?.title ?? 'Chat')

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || !chatId) return
    setDraft('')
    await sdk.messages.send(chatId, { text })
    queryClient.invalidateQueries({ queryKey: ['messages', chatId] })
  }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Group
        px="md"
        py="sm"
        gap="sm"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
      >
        {chat && (
          <Avatar
            name={title}
            emoji={chat.avatarEmoji ?? undefined}
            color={chat.avatarColor ?? undefined}
            size={38}
          />
        )}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} c="dark.0" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </Text>
          {chat?.memberCount != null && chat.type !== 'direct' && (
            <Text size="xs" c="dark.3">{chat.memberCount} members</Text>
          )}
        </Box>
      </Group>

      {/* Messages */}
      <Box style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isLoading ? (
          <Center style={{ flex: 1 }}><Loader size="sm" color="blue" /></Center>
        ) : messages.length === 0 ? (
          <Center style={{ flex: 1 }}>
            <Text c="dark.3" size="sm">No messages yet</Text>
          </Center>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUser?.id
            return (
              <Box
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  style={{
                    maxWidth: '70%',
                    backgroundColor: isOwn ? '#2563eb' : '#262626',
                    borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '8px 12px',
                  }}
                >
                  <Text size="sm" c="dark.0" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </Text>
                  <Text
                    size="xs"
                    mt={2}
                    style={{ textAlign: 'right', color: isOwn ? 'rgba(255,255,255,0.55)' : '#6b7280' }}
                  >
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </Text>
                </Box>
              </Box>
            )
          })
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input */}
      <Group
        px="md"
        py="sm"
        gap="xs"
        align="flex-end"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
      >
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Message…"
          autosize
          minRows={1}
          maxRows={5}
          style={{ flex: 1 }}
          radius="xl"
          styles={{
            input: {
              backgroundColor: '#1e1e1e',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#f0f0f0',
              resize: 'none',
              '&::placeholder': { color: '#6b7280' },
              '&:focus': { borderColor: '#3b82f6' },
            },
          }}
        />
        <ActionIcon
          onClick={handleSend}
          disabled={!draft.trim()}
          size={38}
          radius="xl"
          color="blue"
          variant={draft.trim() ? 'filled' : 'subtle'}
          style={{ flexShrink: 0 }}
        >
          <SendHorizonal size={16} />
        </ActionIcon>
      </Group>
    </Box>
  )
}
