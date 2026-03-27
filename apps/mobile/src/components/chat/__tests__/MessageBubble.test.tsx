import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { MessageBubble } from '../MessageBubble'
import type { Message } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0
function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: String(++_id),
    chatId: 'c1',
    senderId: 'user-2',
    type: 'text',
    text: 'Hello!',
    mediaId: null,
    replyToMessageId: null,
    forwardFromMessageId: null,
    forwardFromChatId: null,
    forwardSenderName: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    deleteForEveryone: false,
    ttlSeconds: null,
    ttlExpiresAt: null,
    viewsCount: 0,
    forwardsCount: 0,
    repliesCount: 0,
    reactions: {},
    entities: [],
    isEncrypted: false,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

const DEFAULT_PROPS = {
  isOwn: false,
  isFirst: true,
  isLast: true,
  showAvatar: false,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { _id = 0 })

describe('MessageBubble', () => {
  it('renders the message text', () => {
    const { getByText } = render(
      <MessageBubble message={makeMessage({ text: 'Hi there!' })} {...DEFAULT_PROPS} />,
    )
    expect(getByText('Hi there!')).toBeTruthy()
  })

  it('renders "Message deleted" for deleted messages', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ isDeleted: true, text: null })}
        {...DEFAULT_PROPS}
      />,
    )
    expect(getByText('Message deleted')).toBeTruthy()
  })

  it('does not render text when message is deleted', () => {
    const { queryByText } = render(
      <MessageBubble
        message={makeMessage({ isDeleted: true, text: 'Hidden' })}
        {...DEFAULT_PROPS}
      />,
    )
    expect(queryByText('Hidden')).toBeNull()
  })

  it('shows "edited" label for edited messages', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ isEdited: true, editedAt: '2024-01-15T11:00:00Z' })}
        {...DEFAULT_PROPS}
      />,
    )
    expect(getByText('edited')).toBeTruthy()
  })

  it('does not show "edited" for non-edited messages', () => {
    const { queryByText } = render(
      <MessageBubble message={makeMessage()} {...DEFAULT_PROPS} />,
    )
    expect(queryByText('edited')).toBeNull()
  })

  it('renders reaction badges', () => {
    const { getByText, queryByText } = render(
      <MessageBubble
        message={makeMessage({ reactions: { '👍': 2, '❤️': 1 } })}
        {...DEFAULT_PROPS}
      />,
    )
    expect(getByText('👍')).toBeTruthy()
    expect(getByText('2')).toBeTruthy()
    expect(getByText('❤️')).toBeTruthy()
    // Count is hidden when it equals 1
    expect(queryByText('1')).toBeNull()
  })

  it('does not render reaction row when reactions are empty', () => {
    const { queryByText } = render(
      <MessageBubble message={makeMessage({ reactions: {} })} {...DEFAULT_PROPS} />,
    )
    expect(queryByText('👍')).toBeNull()
  })

  it('renders DeliveryStatus for own messages when status is provided', () => {
    const { UNSAFE_getAllByType } = render(
      <MessageBubble
        message={makeMessage({ senderId: 'user-1' })}
        isOwn
        isFirst
        isLast
        showAvatar={false}
        status="sent"
      />,
    )
    const { DeliveryStatus } = require('../DeliveryStatus')
    expect(UNSAFE_getAllByType(DeliveryStatus)).toHaveLength(1)
  })

  it('does not render DeliveryStatus for other-user messages', () => {
    const { UNSAFE_queryAllByType } = render(
      <MessageBubble
        message={makeMessage()}
        {...DEFAULT_PROPS}
        isOwn={false}
        status="read"
      />,
    )
    const { DeliveryStatus } = require('../DeliveryStatus')
    expect(UNSAFE_queryAllByType(DeliveryStatus)).toHaveLength(0)
  })

  it('shows sender name for first message in group (non-own)', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage()}
        isOwn={false}
        isFirst
        isLast
        showAvatar={false}
        senderName="Alice"
      />,
    )
    expect(getByText('Alice')).toBeTruthy()
  })

  it('does not show sender name when isFirst=false', () => {
    const { queryByText } = render(
      <MessageBubble
        message={makeMessage()}
        isOwn={false}
        isFirst={false}
        isLast
        showAvatar={false}
        senderName="Alice"
      />,
    )
    expect(queryByText('Alice')).toBeNull()
  })

  it('calls onLongPress when long-pressed', () => {
    const onLongPress = jest.fn()
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ text: 'Press me' })}
        {...DEFAULT_PROPS}
        onLongPress={onLongPress}
      />,
    )
    fireEvent(getByText('Press me'), 'longPress')
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('renders reply preview when replyToMessageId is set', () => {
    const { getByText } = render(
      <MessageBubble
        message={makeMessage({ replyToMessageId: 'orig-msg' })}
        {...DEFAULT_PROPS}
      />,
    )
    expect(getByText('Reply')).toBeTruthy()
  })
})
