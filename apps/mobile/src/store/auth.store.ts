import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import { Platform as RNPlatform } from 'react-native'
import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { setAccessToken, onForceLogout } from '@/api/client'
import { SECURE_STORE_KEYS } from '@/config'
import type { User, AuthResponse, Platform } from '@/types'

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

async function applyAuthResponse(data: AuthResponse): Promise<void> {
  setAccessToken(data.accessToken)
  await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refreshToken)
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => {
  // Subscribe to forced logouts (e.g., refresh token expired)
  onForceLogout(() => {
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
        const storedRefreshToken = await SecureStore.getItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)

        if (!storedRefreshToken) {
          set({ isInitializing: false })
          return
        }

        const data = await authApi.refresh(storedRefreshToken)
        await applyAuthResponse(data)

        // Store the new refresh token (rotation)
        await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, data.refreshToken)

        const user = await usersApi.getMe()
        set({ user, isAuthenticated: true, isInitializing: false })
      } catch {
        // Refresh failed — user must log in again
        setAccessToken(null)
        await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)
        set({ isInitializing: false, isAuthenticated: false, user: null })
      }
    },

    // ── register ─────────────────────────────────────────────────────────────

    register: async (displayName: string, deviceName?: string) => {
      const data = await authApi.register({
        displayName,
        platform: getPlatform(),
        deviceName,
      })

      await applyAuthResponse(data)

      // Persist the anonymous token — the user must store this themselves too
      if (data.user.anonymousToken) {
        await SecureStore.setItemAsync(
          SECURE_STORE_KEYS.ANONYMOUS_TOKEN,
          data.user.anonymousToken,
        )
      }

      set({ user: data.user, isAuthenticated: true })
      return { anonymousToken: data.user.anonymousToken! }
    },

    // ── recover ──────────────────────────────────────────────────────────────

    recover: async (anonymousToken: string, deviceName?: string) => {
      const data = await authApi.recover({
        anonymousToken,
        platform: getPlatform(),
        deviceName,
      })

      await applyAuthResponse(data)
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.ANONYMOUS_TOKEN, anonymousToken)

      set({ user: data.user, isAuthenticated: true })
    },

    // ── logout ───────────────────────────────────────────────────────────────

    logout: async () => {
      try {
        await authApi.logout()
      } catch {
        // Best-effort; clear state regardless
      }

      setAccessToken(null)
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)
      // Note: we intentionally keep ANONYMOUS_TOKEN so the user can recover later

      set({ user: null, isAuthenticated: false })
    },

    // ── deleteAccount ─────────────────────────────────────────────────────────

    deleteAccount: async () => {
      try {
        await usersApi.deleteAccount()
        await authApi.logout()
      } catch {
        // best-effort; clear local state regardless
      }
      setAccessToken(null)
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ANONYMOUS_TOKEN)
      set({ user: null, isAuthenticated: false })
    },

    // ── refreshUser ──────────────────────────────────────────────────────────

    refreshUser: async () => {
      const user = await usersApi.getMe()
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
