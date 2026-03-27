import React from 'react'
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import { Gesture } from 'react-native-gesture-handler'
import { SwipeableMessage, REPLY_THRESHOLD, MAX_DRAG } from '../SwipeableMessage'
import type { Message } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: 'user-1',
    type: 'text',
    text: 'Hey!',
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
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    ...overrides,
  }
}

// Get the Pan gesture instance created during the last render
function getPan() {
  const instances = (Gesture.Pan as jest.Mock).mock.results
  return instances[instances.length - 1].value
}

// Simulate a complete gesture sequence: begin → series of updates → end
function simulateGesture(
  pan: ReturnType<typeof getPan>,
  updates: Array<{ translationX: number; translationY: number; velocityX: number; velocityY: number }>,
) {
  pan._fire('onBegin', {})
  for (const u of updates) {
    pan._fire('onUpdate', u)
  }
  pan._fire('onEnd', {})
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SwipeableMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it('renders children', () => {
    const { getByText } = render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={jest.fn()}>
        <Text>Bubble content</Text>
      </SwipeableMessage>,
    )
    expect(getByText('Bubble content')).toBeTruthy()
  })

  it('renders without crashing for own and other messages', () => {
    const msg = makeMessage()
    const { toJSON: j1 } = render(
      <SwipeableMessage message={msg} isOwn onSwipeReply={jest.fn()}>
        <Text>Own</Text>
      </SwipeableMessage>,
    )
    const { toJSON: j2 } = render(
      <SwipeableMessage message={msg} isOwn={false} onSwipeReply={jest.fn()}>
        <Text>Other</Text>
      </SwipeableMessage>,
    )
    expect(j1()).toBeTruthy()
    expect(j2()).toBeTruthy()
  })

  it('registers Pan gesture callbacks', () => {
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={jest.fn()}>
        <Text>Content</Text>
      </SwipeableMessage>,
    )
    const pan = getPan()
    expect(pan.onBegin).toHaveBeenCalled()
    expect(pan.onUpdate).toHaveBeenCalled()
    expect(pan.onEnd).toHaveBeenCalled()
    expect(pan.onFinalize).toHaveBeenCalled()
  })

  // ── Gesture: should trigger reply ──────────────────────────────────────────

  it('triggers reply on a clear horizontal swipe past threshold', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      // Build up: clearly horizontal, velocity dominant
      { translationX: 15, translationY: 3,  velocityX: 180, velocityY: 30 },
      { translationX: 35, translationY: 5,  velocityX: 220, velocityY: 35 },
      { translationX: 70, translationY: 8,  velocityX: 260, velocityY: 40 },
    ])
    expect(onSwipeReply).toHaveBeenCalledWith(makeMessage())
  })

  it('triggers reply at exactly REPLY_THRESHOLD', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      { translationX: 12, translationY: 2,  velocityX: 200, velocityY: 20 },
      { translationX: REPLY_THRESHOLD, translationY: 5, velocityX: 220, velocityY: 30 },
    ])
    expect(onSwipeReply).toHaveBeenCalled()
  })

  // ── Gesture: should NOT trigger reply ──────────────────────────────────────

  it('does NOT trigger reply on a vertical scroll', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      // Mostly vertical — classic scroll
      { translationX: 4,  translationY: 10,  velocityX: 20,  velocityY: 200 },
      { translationX: 6,  translationY: 30,  velocityX: 15,  velocityY: 350 },
      { translationX: 8,  translationY: 80,  velocityX: 10,  velocityY: 500 },
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  it('does NOT trigger reply on a 45° diagonal move', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      { translationX: 20, translationY: 20, velocityX: 150, velocityY: 150 },
      { translationX: 50, translationY: 50, velocityX: 200, velocityY: 200 },
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  it('does NOT trigger reply on a short horizontal swipe below threshold', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      { translationX: 12, translationY: 2,  velocityX: 200, velocityY: 20 },
      { translationX: 30, translationY: 4,  velocityX: 180, velocityY: 25 },
      // Stops well below REPLY_THRESHOLD
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  it('does NOT trigger reply when velocity is too slow (accidental touch)', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      // Good translation ratio but very low velocity — finger dragging slowly
      { translationX: 20, translationY: 4, velocityX: 40, velocityY: 15 },
      { translationX: 70, translationY: 8, velocityX: 50, velocityY: 20 },
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  it('does NOT trigger reply when swipe starts horizontal but turns vertical', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      // Starts horizontally → locks in
      { translationX: 12, translationY: 2,  velocityX: 200, velocityY: 20 },
      { translationX: 20, translationY: 4,  velocityX: 220, velocityY: 30 },
      // Direction changes — velocity goes vertical
      { translationX: 25, translationY: 30, velocityX: 40,  velocityY: 400 },
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  it('does NOT trigger reply on leftward swipe', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    simulateGesture(getPan(), [
      { translationX: -20, translationY: 2,  velocityX: -200, velocityY: 20 },
      { translationX: -70, translationY: 5,  velocityX: -300, velocityY: 25 },
    ])
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  // ── onFinalize always snaps back ───────────────────────────────────────────

  it('calls onFinalize on interrupted gesture (never calls reply)', () => {
    const onSwipeReply = jest.fn()
    render(
      <SwipeableMessage message={makeMessage()} isOwn onSwipeReply={onSwipeReply}>
        <Text>Msg</Text>
      </SwipeableMessage>,
    )
    const pan = getPan()
    pan._fire('onBegin', {})
    pan._fire('onUpdate', { translationX: 30, translationY: 4, velocityX: 200, velocityY: 30 })
    // Gesture is cancelled (no onEnd) — onFinalize fires
    pan._fire('onFinalize', {})
    expect(onSwipeReply).not.toHaveBeenCalled()
  })

  // ── Threshold constants ────────────────────────────────────────────────────

  it('exports expected threshold values', () => {
    expect(REPLY_THRESHOLD).toBe(64)
    expect(MAX_DRAG).toBe(80)
  })
})
