import { useMemo } from 'react'
import type { Message, MessageListItem } from '@/types'

const GROUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDateLabel(date: Date): string {
  const now = new Date()
  if (isSameDay(date, now)) return 'Today'

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (isSameDay(date, yesterday)) return 'Yesterday'

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'long' })
  }

  return date.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Takes a flat list of messages (newest-first is fine — we sort internally)
 * and returns a typed list of items ready for FlashList:
 *  - DateSeparator items when the date changes
 *  - Message items with grouping flags (isFirst/isLast/showAvatar)
 *
 * Output is in display order: oldest → newest (because FlashList is inverted).
 */
export function useMessageGroups(
  messages: Message[],
  currentUserId: string | undefined,
): MessageListItem[] {
  return useMemo(() => {
    // messages come in newest-first from API; sort oldest-first for grouping logic
    const sorted = [...messages].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    const items: MessageListItem[] = []
    let prevDate: Date | null = null

    for (let i = 0; i < sorted.length; i++) {
      const msg = sorted[i]
      const msgDate = new Date(msg.createdAt)

      // ── Date separator ──────────────────────────────────────────────────────
      if (!prevDate || !isSameDay(prevDate, msgDate)) {
        items.push({ type: 'date', date: formatDateLabel(msgDate) })
        prevDate = msgDate
      }

      // ── Grouping flags ──────────────────────────────────────────────────────
      const prev = sorted[i - 1]
      const next = sorted[i + 1]

      const sameAsPrev =
        prev &&
        prev.senderId === msg.senderId &&
        msgDate.getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS

      const sameAsNext =
        next &&
        next.senderId === msg.senderId &&
        new Date(next.createdAt).getTime() - msgDate.getTime() < GROUP_WINDOW_MS

      const isFirst = !sameAsPrev
      const isLast = !sameAsNext
      // Show avatar for received messages only on the last bubble of a group
      const showAvatar = msg.senderId !== currentUserId && isLast

      items.push({ type: 'message', message: msg, isFirst, isLast, showAvatar })
    }

    // Reverse so FlashList (inverted) shows newest at bottom
    return items.reverse()
  }, [messages, currentUserId])
}
