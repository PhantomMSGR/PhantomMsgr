import { createTheme, type MantineColorsTuple } from '@mantine/core'

// ─── Blue primary — matches mobile colors.primary #3b82f6 ─────────────────────
const blue: MantineColorsTuple = [
  '#eff6ff',
  '#dbeafe',
  '#bfdbfe',
  '#93c5fd',
  '#60a5fa',
  '#3b82f6', // [5] ← primary
  '#2563eb', // [6] ← primaryDark
  '#1d4ed8',
  '#1e40af',
  '#1e3a8a',
]

// ─── Dark palette — maps directly to mobile bg tokens ─────────────────────────
// Mantine dark[N]: 0 = lightest (text), 9 = darkest (background)
const dark: MantineColorsTuple = [
  '#f0f0f0', // [0] textPrimary
  '#d1d5db',
  '#9ca3af', // [2] textSecondary
  '#6b7280', // [3] textMuted
  '#454545',
  '#363636',
  '#2d2d2d',
  '#242424', // [7] bgElevated
  '#1a1a1a', // [8] bgSurface
  '#0f0f0f', // [9] bg
]

export const theme = createTheme({
  // ── Colors ─────────────────────────────────────────────────────────────────
  primaryColor: 'blue',
  primaryShade: { dark: 5, light: 5 },
  colors: { blue, dark },

  // ── Typography ──────────────────────────────────────────────────────────────
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSizes: {
    xs: '0.75rem',   // 12
    sm: '0.875rem',  // 14
    md: '1rem',      // 16
    lg: '1.125rem',  // 18
    xl: '1.25rem',   // 20
  },
  lineHeights: {
    xs: '1.33',
    sm: '1.43',
    md: '1.5',
    lg: '1.55',
    xl: '1.6',
  },

  // ── Radius — matches mobile radius tokens ───────────────────────────────────
  radius: {
    xs: '0.375rem',  // 6
    sm: '0.5rem',    // 8
    md: '0.75rem',   // 12
    lg: '1rem',      // 16
    xl: '1.5rem',    // 24
  },
  defaultRadius: 'md',

  // ── Spacing ─────────────────────────────────────────────────────────────────
  spacing: {
    xs: '0.5rem',   // 8
    sm: '0.75rem',  // 12
    md: '1rem',     // 16
    lg: '1.5rem',   // 24
    xl: '2rem',     // 32
  },

  // ── Component overrides ─────────────────────────────────────────────────────
  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          fontWeight: 600,
        },
      },
    },

    TextInput: {
      defaultProps: { radius: 'md' },
      styles: {
        input: {
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.1)',
          color: '#f0f0f0',
          '&::placeholder': { color: '#6b7280' },
          '&:focus': { borderColor: '#3b82f6' },
        },
      },
    },

    PasswordInput: {
      defaultProps: { radius: 'md' },
      styles: {
        input: {
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.1)',
          '&:focus-within': { borderColor: '#3b82f6' },
        },
        innerInput: { color: '#f0f0f0', '&::placeholder': { color: '#6b7280' } },
      },
    },

    Textarea: {
      defaultProps: { radius: 'md' },
      styles: {
        input: {
          backgroundColor: '#1e1e1e',
          borderColor: 'rgba(255,255,255,0.1)',
          color: '#f0f0f0',
          '&::placeholder': { color: '#6b7280' },
          '&:focus': { borderColor: '#3b82f6' },
        },
      },
    },

    Paper: {
      defaultProps: { radius: 'md' },
      styles: {
        root: {
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },

    Modal: {
      styles: {
        content: { backgroundColor: '#1a1a1a' },
        header: {
          backgroundColor: '#1a1a1a',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        },
        title: { color: '#f0f0f0', fontWeight: 600 },
      },
    },

    Divider: {
      styles: {
        root: { borderColor: 'rgba(255,255,255,0.07)' },
      },
    },

    Tooltip: {
      defaultProps: { radius: 'sm' },
      styles: {
        tooltip: {
          backgroundColor: '#242424',
          color: '#f0f0f0',
          border: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.75rem',
        },
      },
    },

    NavLink: {
      styles: {
        root: {
          borderRadius: 10,
          color: '#9ca3af',
          '&:hover': { backgroundColor: '#242424', color: '#f0f0f0' },
          '&[data-active]': {
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            '&:hover': { backgroundColor: '#2563eb' },
          },
        },
      },
    },

    ScrollArea: {
      styles: {
        scrollbar: { '&[data-orientation="vertical"]': { width: 4 } },
        thumb: { backgroundColor: 'rgba(255,255,255,0.12)' },
      },
    },
  },
})
