import type { TokenStorage } from '@phantom/sdk'

const KEYS = {
  REFRESH_TOKEN: 'phantom:refresh_token',
  ANONYMOUS_TOKEN: 'phantom:anonymous_token',
} as const

// ─── Web token storage adapter ────────────────────────────────────────────────
// Stores tokens in localStorage. Tauri desktop app uses the same webview
// localStorage, so no platform branching is needed here.

export const webTokenStorage: TokenStorage = {
  getRefreshToken: async () => localStorage.getItem(KEYS.REFRESH_TOKEN),
  setRefreshToken: async (token) => localStorage.setItem(KEYS.REFRESH_TOKEN, token),
  deleteRefreshToken: async () => localStorage.removeItem(KEYS.REFRESH_TOKEN),

  getAnonymousToken: async () => localStorage.getItem(KEYS.ANONYMOUS_TOKEN),
  setAnonymousToken: async (token) => localStorage.setItem(KEYS.ANONYMOUS_TOKEN, token),
  deleteAnonymousToken: async () => localStorage.removeItem(KEYS.ANONYMOUS_TOKEN),
}
