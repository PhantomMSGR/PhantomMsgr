
import { renderHook } from '@testing-library/react-native'
import { useMessageGroups } from '../useMessageGroups'
import type { Message } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _id = 0
function msg(overrides: {
  senderId: string
  createdAt: string
  text?: string
}): Message {
  return {
    id: String(++_id),
    chatId: 'c1',
    senderId: overrides.senderId,
    type: 'text',
    text: overrides.text ?? 'hi',
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
    createdAt: overrides.createdAt,
    updatedAt: overrides.createdAt,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useMessageGroups', () => {
  beforeEach(() => { _id = 0 })

  it('returns an empty array for no messages', () => {
    const { result } = renderHook(() => useMessageGroups([], 'user-1'))
    expect(result.current).toEqual([])
  })

  it('returns a single message item with date separator', () => {
    const messages = [msg({ senderId: 'user-1', createdAt: '2024-01-15T10:00:00Z' })]
    const { result } = renderHook(() => useMessageGroups(messages, 'user-1'))

    // FlashList is inverted, so output is reversed: message item appears before date separator
    const items = result.current
    expect(items).toHaveLength(2)
    // reversed order: most recent first in array = message, then date
    const msgItem = items.find((i) => i.type === 'message')
    const dateItem = items.find((i) => i.type === 'date')
    expect(msgItem).toBeTruthy()
    expect(dateItem).toBeTruthy()
  })

  it('inserts a date separator when day changes', () => {
    // Use midday timestamps so the test is timezone-agnostic (near-midnight UTC
    // timestamps would land on the same local day in UTC+N timezones)
    const messages = [
      msg({ senderId: 'user-1', createdAt: '2024-01-14T12:00:00Z' }),
      msg({ senderId: 'user-1', createdAt: '2024-01-15T12:00:00Z' }),
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'user-1'))

    const dateItems = result.current.filter((i) => i.type === 'date')
    expect(dateItems).toHaveLength(2)
  })

  it('groups consecutive messages from same sender within 5 min as a run', () => {
    const base = '2024-01-15T10:00:00Z'
    const plus2min = '2024-01-15T10:02:00Z'
    const messages = [
      msg({ senderId: 'user-1', createdAt: base }),
      msg({ senderId: 'user-1', createdAt: plus2min }),
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'other'))

    const msgItems = result.current.filter((i) => i.type === 'message') as Extract<
      (typeof result.current)[number],
      { type: 'message' }
    >[]

    // In reversed order: plus2min is first (newest), base is second (oldest)
    // plus2min item: isFirst=false (has prev in group), isLast=true
    // base item: isFirst=true, isLast=false
    const newestItem = msgItems[0] // plus2min
    const oldestItem = msgItems[1] // base

    expect(newestItem.isLast).toBe(true)
    expect(newestItem.isFirst).toBe(false)
    expect(oldestItem.isFirst).toBe(true)
    expect(oldestItem.isLast).toBe(false)
  })

  it('breaks the group when more than 5 minutes apart', () => {
    const messages = [
      msg({ senderId: 'user-1', createdAt: '2024-01-15T10:00:00Z' }),
      msg({ senderId: 'user-1', createdAt: '2024-01-15T10:06:00Z' }), // +6 min
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'other'))

    const msgItems = result.current.filter((i) => i.type === 'message') as any[]
    // Both should be isFirst=true and isLast=true (separate groups)
    expect(msgItems[0].isFirst).toBe(true)
    expect(msgItems[0].isLast).toBe(true)
    expect(msgItems[1].isFirst).toBe(true)
    expect(msgItems[1].isLast).toBe(true)
  })

  it('breaks the group when sender changes', () => {
    const messages = [
      msg({ senderId: 'user-1', createdAt: '2024-01-15T10:00:00Z' }),
      msg({ senderId: 'user-2', createdAt: '2024-01-15T10:01:00Z' }),
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'other'))

    const msgItems = result.current.filter((i) => i.type === 'message') as any[]
    expect(msgItems).toHaveLength(2)
    expect(msgItems[0].isFirst).toBe(true)
    expect(msgItems[0].isLast).toBe(true)
    expect(msgItems[1].isFirst).toBe(true)
    expect(msgItems[1].isLast).toBe(true)
  })

  it('sets showAvatar=true for other sender on isLast message only', () => {
    const messages = [
      msg({ senderId: 'user-2', createdAt: '2024-01-15T10:00:00Z' }),
      msg({ senderId: 'user-2', createdAt: '2024-01-15T10:01:00Z' }),
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'user-1'))

    const msgItems = result.current.filter((i) => i.type === 'message') as any[]
    // In reversed array: msgItems[0] is the newer one (isLast=true), msgItems[1] is older (isLast=false)
    expect(msgItems[0].showAvatar).toBe(true)  // isLast & not own
    expect(msgItems[1].showAvatar).toBe(false) // not isLast
  })

  it('never sets showAvatar for own messages', () => {
    const messages = [msg({ senderId: 'user-1', createdAt: '2024-01-15T10:00:00Z' })]
    const { result } = renderHook(() => useMessageGroups(messages, 'user-1'))

    const msgItems = result.current.filter((i) => i.type === 'message') as any[]
    expect(msgItems[0].showAvatar).toBe(false)
  })

  it('handles messages arriving newest-first from API (sorts internally)', () => {
    const messages = [
      msg({ senderId: 'user-1', createdAt: '2024-01-15T10:02:00Z' }),
      msg({ senderId: 'user-1', createdAt: '2024-01-15T10:00:00Z' }),
    ]
    const { result } = renderHook(() => useMessageGroups(messages, 'user-1'))

    const msgItems = result.current.filter((i) => i.type === 'message') as any[]
    // Should still be grouped correctly regardless of input order
    expect(msgItems).toHaveLength(2)
    // Both same sender, within 5 min → one group
    const firstInGroup = msgItems.find((i: any) => i.isFirst)
    const lastInGroup = msgItems.find((i: any) => i.isLast)
    expect(firstInGroup).toBeTruthy()
    expect(lastInGroup).toBeTruthy()
  })
})
