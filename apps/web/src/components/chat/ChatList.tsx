import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import {
  Box, TextInput, Text, Stack, Loader, Center,
  UnstyledButton, Group, ActionIcon,
} from '@mantine/core'
import { Search, Plus } from 'lucide-react'
import { sdk } from '@/lib/sdk'
import { ChatListItem } from './ChatListItem'
import type { Chat } from '@phantom/sdk'

export function ChatList() {
  const { chatId } = useParams()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useInfiniteQuery({
    queryKey: ['chats'],
    queryFn: ({ pageParam }) => sdk.chats.list(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const allChats: Chat[] = data?.pages.flatMap((p) => p.items) ?? []
  const chats = search.trim()
    ? allChats.filter((c) =>
        (c.title ?? c.peerName ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : allChats

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Group
        px="md"
        py="sm"
        justify="space-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}
      >
        <Text fw={600} c="dark.0" size="sm">Chats</Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          radius="md"
          onClick={() => {/* TODO: new chat modal */}}
        >
          <Plus size={16} />
        </ActionIcon>
      </Group>

      {/* Search */}
      <Box px="sm" py={8} style={{ flexShrink: 0 }}>
        <TextInput
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          leftSection={<Search size={14} color="#6b7280" />}
          size="xs"
          styles={{
            input: {
              backgroundColor: '#242424',
              border: 'none',
              color: '#f0f0f0',
              '&::placeholder': { color: '#6b7280' },
            },
          }}
          radius="md"
        />
      </Box>

      {/* List */}
      <Box style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Center h={120}><Loader size="sm" color="blue" /></Center>
        ) : chats.length === 0 ? (
          <Center h={120}>
            <Stack align="center" gap={4}>
              <Text c="dark.3" size="sm">
                {search ? 'No results' : 'No chats yet'}
              </Text>
            </Stack>
          </Center>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isActive={chat.id === chatId}
              onClick={() => navigate(`/chats/${chat.id}`)}
            />
          ))
        )}
      </Box>
    </Box>
  )
}
