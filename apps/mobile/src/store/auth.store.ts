import { create } from 'zustand'
import { Platform as RNPlatform } from 'react-native'
import { sdk, mobileTokenStorage } from '@/lib/sdk'
import type { User, Platform } from '@/types'

// ─── State shape ──────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean

  // Actions
  initialize: () => Promise<void>
  register: (displayName: string, deviceName?: string) => Promise<{ anonymousToken: string }>
  recover: (anonymousToken: string, deviceName?: string) => Promise<void>
  logout: () => Promise<void>
  deleteAccount: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (user: Partial<User>) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlatform(): Platform {
  switch (RNPlatform.OS) {
    case 'ios':     return 'ios'
    case 'android': return 'android'
    case 'web':     return 'web'
    default:        return 'desktop'
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => {
  // Subscribe to forced logouts (e.g., refresh token expired)
  sdk.onForceLogout(() => {
    set({ user: null, isAuthenticated: false })
  })

  return {
    user: null,
    isAuthenticated: false,
    isInitializing: true,

    // ── initialize ───────────────────────────────────────────────────────────
    // Called once at app startup. Tries to restore session using stored refresh token.

    initialize: async () => {
      try {
        const storedRefreshToken = await mobileTokenStorage.getRefreshToken()

        if (!storedRefreshToken) {
          set({ isInitializing: false })
          return
        }

        const data = await sdk.auth.refresh(storedRefreshToken)
        sdk.setAccessToken(data.accessToken)
        await mobileTokenStorage.setRefreshToken(data.refreshToken)

        const user = await sdk.users.getMe()
        set({ user, isAuthenticated: true, isInitializing: false })
      } catch {
        // Refresh failed — user must log in again
        sdk.setAccessToken(null)
        await mobileTokenStorage.deleteRefreshToken()
        set({ isInitializing: false, isAuthenticated: false, user: null })
      }
    },

    // ── register ─────────────────────────────────────────────────────────────

    register: async (displayName: string, deviceName?: string) => {
      const data = await sdk.auth.register({
        displayName,
        platform: getPlatform(),
        deviceName,
      })

      sdk.setAccessToken(data.accessToken)
      await mobileTokenStorage.setRefreshToken(data.refreshToken)

      // Persist the anonymous token — the user must store this themselves too
      if (data.user.anonymousToken) {
        await mobileTokenStorage.setAnonymousToken(data.user.anonymousToken)
      }

      set({ user: data.user, isAuthenticated: true })
      return { anonymousToken: data.user.anonymousToken! }
    },

    // ── recover ──────────────────────────────────────────────────────────────

    recover: async (anonymousToken: string, deviceName?: string) => {
      const data = await sdk.auth.recover({
        anonymousToken,
        platform: getPlatform(),
        deviceName,
      })

      sdk.setAccessToken(data.accessToken)
      await mobileTokenStorage.setRefreshToken(data.refreshToken)
      await mobileTokenStorage.setAnonymousToken(anonymousToken)

      set({ user: data.user, isAuthenticated: true })
    },

    // ── logout ───────────────────────────────────────────────────────────────

    logout: async () => {
      try {
        await sdk.auth.logout()
      } catch {
        // Best-effort; clear state regardless
      }

      sdk.setAccessToken(null)
      await mobileTokenStorage.deleteRefreshToken()
      // Note: we intentionally keep ANONYMOUS_TOKEN so the user can recover later

      set({ user: null, isAuthenticated: false })
    },

    // ── deleteAccount ─────────────────────────────────────────────────────────

    deleteAccount: async () => {
      try {
        await sdk.users.deleteAccount()
        await sdk.auth.logout()
      } catch {
        // best-effort; clear local state regardless
      }
      sdk.setAccessToken(null)
      await mobileTokenStorage.deleteRefreshToken()
      await mobileTokenStorage.deleteAnonymousToken()
      set({ user: null, isAuthenticated: false })
    },

    // ── refreshUser ──────────────────────────────────────────────────────────

    refreshUser: async () => {
      const user = await sdk.users.getMe()
      set({ user })
    },

    // ── updateUser ───────────────────────────────────────────────────────────
    // Optimistic local update after profile edits

    updateUser: (partial: Partial<User>) => {
      const current = get().user
      if (current) set({ user: { ...current, ...partial } })
    },
  }
})
