import { Easing } from 'react-native-reanimated'

// ─── Colors ──────────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  primaryLight: '#60a5fa',
  primaryBg: 'rgba(59,130,246,0.12)',

  // Backgrounds
  bg: '#0f0f0f',
  bgSurface: '#1a1a1a',
  bgElevated: '#242424',
  bgInput: '#1e1e1e',

  // Text
  textPrimary: '#f0f0f0',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',

  // Chat bubbles
  bubbleOwn: '#2563eb',
  bubbleOther: '#262626',

  // Status
  online: '#22c55e',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.12)',
  danger: '#ef4444',
  dangerBg: 'rgba(239,68,68,0.12)',

  // Misc
  white: '#ffffff',
  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.05)',
  warning: '#facc15',
  warningBg: 'rgba(234,179,8,0.1)',
  warningText: '#ca8a04',
  overlay: 'rgba(0,0,0,0.6)',
} as const

// ─── Radius ──────────────────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const

// ─── Font sizes ──────────────────────────────────────────────────────────────

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  px: 1,
  '0.5': 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const

// ─── Typography presets ──────────────────────────────────────────────────────

export const typography = {
  h1: { fontSize: 30, fontWeight: '700' as const, lineHeight: 38, color: colors.textPrimary },
  h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, color: colors.textPrimary },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28, color: colors.textPrimary },
  h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26, color: colors.textPrimary },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24, color: colors.textPrimary },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20, color: colors.textSecondary },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16, color: colors.textMuted },
  label: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, color: colors.textPrimary },
} as const

// ─── Animation ───────────────────────────────────────────────────────────────

export const ANIM = {
  duration: {
    fast: 160,
    normal: 220,
    slow: 320,
    snap: 260,
  },
  easing: {
    standard: Easing.out(Easing.cubic),
    decelerate: Easing.out(Easing.quad),
    accelerate: Easing.in(Easing.cubic),
    bounce: Easing.out(Easing.back(1.5)),
  },
} as const

// ─── Avatar sizes ─────────────────────────────────────────────────────────────

export const AVATAR_SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
} as const

export type AvatarSize = keyof typeof AVATAR_SIZES
