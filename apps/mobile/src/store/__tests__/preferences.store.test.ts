import { formatChatTime } from '../preferences.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// "Now" is fixed to Thursday 2024-01-18 at 10:30 AM local time.
// Jan 18 2024 is a Thursday; the Mon-anchored week runs Mon Jan 15 – Sun Jan 21.
const NOW = new Date(2024, 0, 18, 10, 30, 0)

function localDate(year: number, month: number, day: number, hour = 9, min = 0) {
  return new Date(year, month - 1, day, hour, min, 0)
}

function iso(d: Date) {
  return d.toISOString()
}

/** True if the string looks like a time (HH:MM or H:MM AM/PM) */
function looksLikeTime(s: string) {
  return /\d{1,2}:\d{2}/.test(s)
}

/** True if the string contains a 4-digit year */
function containsYear(s: string) {
  return /\d{4}/.test(s)
}

/** True if the string contains the day number (as a standalone number) */
function containsDayNumber(s: string, day: number) {
  // Matches the day number surrounded by non-digits (or start/end)
  return new RegExp(`(?<![\\d])${day}(?![\\d])`).test(s)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('formatChatTime', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(NOW)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // ── Today ────────────────────────────────────────────────────────────────

  it('shows time for a message sent earlier today (08:30)', () => {
    const result = formatChatTime(iso(localDate(2024, 1, 18, 8, 30)), false)
    expect(looksLikeTime(result)).toBe(true)
  })

  it('shows time for a message sent just now', () => {
    const result = formatChatTime(iso(NOW), false)
    expect(looksLikeTime(result)).toBe(true)
  })

  it('shows time when use24Hour=true (no AM/PM)', () => {
    const result = formatChatTime(iso(localDate(2024, 1, 18, 8, 5)), true)
    expect(looksLikeTime(result)).toBe(true)
    expect(result).not.toMatch(/AM|PM/i)
  })

  // ── Critical bug fix: yesterday morning viewed early today ────────────────

  it('shows "Yesterday" for yesterday 23:30 viewed at 01:00 today (< 24 h gap)', () => {
    // Old broken code: 23:30→01:00 = 1.5h diff → diffDays=0 → shows time
    jest.setSystemTime(new Date(2024, 0, 18, 1, 0, 0))
    const result = formatChatTime(iso(localDate(2024, 1, 17, 23, 30)), false)
    expect(result).toBe('Yesterday')
  })

  it('shows "Yesterday" for yesterday 07:38 viewed at 06:00 today (< 24 h gap)', () => {
    // Exact user-reported scenario: yesterday 7:38 was showing as "7:38"
    jest.setSystemTime(new Date(2024, 0, 18, 6, 0, 0))
    const result = formatChatTime(iso(localDate(2024, 1, 17, 7, 38)), false)
    expect(result).toBe('Yesterday')
  })

  // ── Yesterday (standard) ─────────────────────────────────────────────────

  it('shows "Yesterday" for yesterday at 10:00', () => {
    expect(formatChatTime(iso(localDate(2024, 1, 17, 10, 0)), false)).toBe('Yesterday')
  })

  it('shows "Yesterday" for yesterday at 00:01', () => {
    expect(formatChatTime(iso(localDate(2024, 1, 17, 0, 1)), false)).toBe('Yesterday')
  })

  // ── This week (Mon-anchored, excludes today and yesterday) ────────────────

  it('shows a non-time non-year string for Monday of the same week (2 days before yesterday)', () => {
    // Jan 15 (Mon) is in the same week; it's NOT today or yesterday
    const result = formatChatTime(iso(localDate(2024, 1, 15, 9, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(result).not.toBe('Yesterday')
    expect(containsYear(result)).toBe(false)
    // The result should be a short weekday name (locale-dependent), not a date number
    expect(containsDayNumber(result, 15)).toBe(false)
  })

  it('shows a weekday string for Tuesday of the same week', () => {
    // Jan 16 (Tue) — 2 days before Thu, same week, not yesterday
    const result = formatChatTime(iso(localDate(2024, 1, 16, 14, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(result).not.toBe('Yesterday')
    expect(containsYear(result)).toBe(false)
    expect(containsDayNumber(result, 16)).toBe(false)
  })

  it('yesterday (Jan 17 = Wed) shows "Yesterday", not a weekday name', () => {
    // Yesterday is always "Yesterday", even if it's a different weekday
    const result = formatChatTime(iso(localDate(2024, 1, 17, 20, 0)), false)
    expect(result).toBe('Yesterday')
  })

  // ── Previous week boundary: Sunday Jan 14 is NOT this week ───────────────

  it('shows date (not weekday) for Sunday Jan 14 — previous Mon-anchored week', () => {
    // Current week: Mon Jan 15 – Sun Jan 21
    // Jan 14 (Sun) belongs to the previous week → should show date
    const result = formatChatTime(iso(localDate(2024, 1, 14, 10, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(result).not.toBe('Yesterday')
    expect(containsYear(result)).toBe(false)
    expect(containsDayNumber(result, 14)).toBe(true)  // date format shows the day
  })

  it('shows weekday for Monday Jan 15 — first day of this week', () => {
    const result = formatChatTime(iso(localDate(2024, 1, 15, 10, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(containsYear(result)).toBe(false)
    // Weekday string does NOT contain the day number
    expect(containsDayNumber(result, 15)).toBe(false)
  })

  // ── Same year, not this week ──────────────────────────────────────────────

  it('shows date WITHOUT year for a message from last week (same year)', () => {
    // Jan 10 = previous week, same year 2024
    const result = formatChatTime(iso(localDate(2024, 1, 10, 12, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(containsDayNumber(result, 10)).toBe(true)
    expect(containsYear(result)).toBe(false)
  })

  it('shows date WITHOUT year for a message from December same year', () => {
    const result = formatChatTime(iso(localDate(2024, 12, 1, 9, 0)), false)
    expect(containsYear(result)).toBe(false)
  })

  // ── Previous year ─────────────────────────────────────────────────────────

  it('shows date WITH year for a message from last year', () => {
    const result = formatChatTime(iso(localDate(2023, 11, 25, 10, 0)), false)
    expect(containsYear(result)).toBe(true)
    expect(result).toContain('2023')
  })

  it('shows date WITH year for a message from two years ago', () => {
    const result = formatChatTime(iso(localDate(2022, 6, 4, 9, 0)), false)
    expect(containsYear(result)).toBe(true)
    expect(result).toContain('2022')
  })

  // ── When today is Monday (week boundary) ─────────────────────────────────

  it('when today is Monday, yesterday (Sunday) shows "Yesterday"', () => {
    jest.setSystemTime(new Date(2024, 0, 15, 10, 0, 0)) // Mon Jan 15
    const result = formatChatTime(iso(localDate(2024, 1, 14, 18, 0)), false)
    expect(result).toBe('Yesterday')
  })

  it('when today is Monday, Saturday (2 days ago) shows date — previous week', () => {
    jest.setSystemTime(new Date(2024, 0, 15, 10, 0, 0)) // Mon Jan 15
    // weekStart = Mon Jan 15; Jan 13 (Sat) < Jan 15 → previous week → date
    const result = formatChatTime(iso(localDate(2024, 1, 13, 10, 0)), false)
    expect(looksLikeTime(result)).toBe(false)
    expect(result).not.toBe('Yesterday')
    expect(containsYear(result)).toBe(false)
    expect(containsDayNumber(result, 13)).toBe(true)
  })

  // ── When today is Sunday (week boundary) ─────────────────────────────────

  it('when today is Sunday, Monday of the same week is 6 days ago and still this week', () => {
    // Sun Jan 21 — Mon Jan 15 is 6 days ago, but same Mon-anchored week
    jest.setSystemTime(new Date(2024, 0, 21, 10, 0, 0)) // Sun Jan 21
    const result = formatChatTime(iso(localDate(2024, 1, 15, 10, 0)), false)
    // Should be weekday (this week), not a date
    expect(looksLikeTime(result)).toBe(false)
    expect(containsDayNumber(result, 15)).toBe(false)
    expect(containsYear(result)).toBe(false)
  })

  it('when today is Sunday, previous Sunday (7 days ago) is previous week → date', () => {
    jest.setSystemTime(new Date(2024, 0, 21, 10, 0, 0)) // Sun Jan 21
    const result = formatChatTime(iso(localDate(2024, 1, 14, 10, 0)), false)
    expect(containsDayNumber(result, 14)).toBe(true)
    expect(containsYear(result)).toBe(false)
  })
})
