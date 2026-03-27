import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatListItem } from '../ChatListItem'
import type { Chat } from '@/types'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: 'chat-1',
    type: 'direct',
    title: 'Alice',
    description: null,
    avatarMediaId: null,
    createdBy: null,
    username: null,
    isPublic: false,
    inviteHash: null,
    memberCount: 2,
    messageCount: 10,
    lastMessageId: null,
    isVerified: false,
    slowModeDelay: null,
    linkedChatId: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ChatListItem', () => {
  it('renders the chat title', () => {
    const { getByText } = renderWithClient(
      <ChatListItem chat={makeChat({ title: 'Alice' })} currentUserId="u1" onPress={jest.fn()} />,
    )
    expect(getByText('Alice')).toBeTruthy()
  })

  it('falls back to "Saved Messages" for saved chats', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat({ type: 'saved', title: null })}
        currentUserId="u1"
        onPress={jest.fn()}
      />,
    )
    expect(getByText('Saved Messages')).toBeTruthy()
  })

  it('falls back to chat type when no title and not saved', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat({ title: null })}
        currentUserId="u1"
        onPress={jest.fn()}
      />,
    )
    // Component uses capitalized chat type as the fallback title
    expect(getByText('Direct')).toBeTruthy()
  })

  it('shows unread badge when unreadCount > 0', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat()}
        currentUserId="u1"
        onPress={jest.fn()}
        unreadCount={5}
      />,
    )
    expect(getByText('5')).toBeTruthy()
  })

  it('caps unread badge at 99+', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat()}
        currentUserId="u1"
        onPress={jest.fn()}
        unreadCount={150}
      />,
    )
    expect(getByText('99+')).toBeTruthy()
  })

  it('does not show unread badge when unreadCount is 0', () => {
    const { queryByText } = renderWithClient(
      <ChatListItem
        chat={makeChat()}
        currentUserId="u1"
        onPress={jest.fn()}
        unreadCount={0}
      />,
    )
    // No numeric badge
    expect(queryByText('0')).toBeNull()
  })

  it('renders last message text', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat({ lastMessageText: 'See you later!' })}
        currentUserId="u1"
        onPress={jest.fn()}
      />,
    )
    expect(getByText('See you later!')).toBeTruthy()
  })

  it('shows "No messages yet" fallback for non-channel with no last message', () => {
    const { getByText } = renderWithClient(
      <ChatListItem chat={makeChat()} currentUserId="u1" onPress={jest.fn()} />,
    )
    expect(getByText('No messages yet')).toBeTruthy()
  })

  it('shows "Channel" fallback for channel type with no last message', () => {
    const { getByText } = renderWithClient(
      <ChatListItem
        chat={makeChat({ type: 'channel' })}
        currentUserId="u1"
        onPress={jest.fn()}
      />,
    )
    expect(getByText('Channel')).toBeTruthy()
  })

  it('calls onPress with chatId when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = renderWithClient(
      <ChatListItem chat={makeChat({ id: 'chat-42' })} currentUserId="u1" onPress={onPress} />,
    )
    fireEvent.press(getByText('Alice'))
    expect(onPress).toHaveBeenCalledWith('chat-42')
  })

  it('renders a verified checkmark for verified chats', () => {
    const { getByText, getByTestId } = renderWithClient(
      <ChatListItem
        chat={makeChat({ title: 'Official', isVerified: true })}
        currentUserId="u1"
        onPress={jest.fn()}
      />,
    )
    expect(getByText('Official')).toBeTruthy()
    expect(getByTestId('icon-checkmark-circle')).toBeTruthy()
  })
})
