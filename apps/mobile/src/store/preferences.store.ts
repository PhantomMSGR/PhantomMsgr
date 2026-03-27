import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PreferencesState {
  use24Hour: boolean
  setUse24Hour: (v: boolean) => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      use24Hour: false,
      setUse24Hour: (use24Hour) => set({ use24Hour }),
    }),
    {
      name: 'phantom-preferences',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/** Format an ISO timestamp to a time string */
export function formatMessageTime(iso: string, use24Hour: boolean): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  })
}

/** Format an ISO timestamp to chat list preview time (relative) */
export function formatChatTime(iso: string, use24Hour: boolean): string {
  const date = new Date(iso)
  const now = new Date()

  // Compare calendar dates (start-of-day in local time) to avoid
  // the 24-hour-window bug where yesterday morning appears as "today"
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const todayStart = startOfDay(now)
  const dateStart  = startOfDay(date)

  const diffCalendarDays = Math.round(
    (todayStart.getTime() - dateStart.getTime()) / 86_400_000,
  )

  // Same calendar day → time
  if (diffCalendarDays === 0) return formatMessageTime(iso, use24Hour)

  // Previous calendar day → "Yesterday"
  if (diffCalendarDays === 1) return 'Yesterday'

  // Same Monday-anchored calendar week → weekday name (Mon, Tue, …)
  const dayOfWeek = todayStart.getDay() // 0=Sun … 6=Sat
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const weekStart = new Date(todayStart)
  weekStart.setDate(todayStart.getDate() - daysFromMonday)

  if (dateStart >= weekStart) {
    return date.toLocaleDateString([], { weekday: 'short' })
  }

  // Same year → date without year (e.g. "Mar 5")
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' })
  }

  // Older → date with year (e.g. "Mar 5, 2023")
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}
