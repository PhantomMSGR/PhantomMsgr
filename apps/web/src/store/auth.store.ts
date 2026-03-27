import { create } from 'zustand'
import { sdk } from '@/lib/sdk'
import { webTokenStorage } from '@/lib/tokenStorage'
import type { User } from '@phantom/sdk'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isInitializing: boolean

  initialize: () => Promise<void>
  register: (displayName: string, deviceName?: string) => Promise<{ anonymousToken: string }>
  recover: (anonymousToken: string, deviceName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateUser: (partial: Partial<User>) => void
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Force-logout when refresh token expires
  sdk.onForceLogout(() => set({ user: null, isAuthenticated: false }))

  return {
    user: null,
    isAuthenticated: false,
    isInitializing: true,

    initialize: async () => {
      try {
        const refreshToken = await webTokenStorage.getRefreshToken()
        if (!refreshToken) return set({ isInitializing: false })

        const data = await sdk.auth.refresh(refreshToken)
        sdk.setAccessToken(data.accessToken)
        await webTokenStorage.setRefreshToken(data.refreshToken)

        const user = await sdk.users.getMe()
        set({ user, isAuthenticated: true, isInitializing: false })
      } catch {
        sdk.setAccessToken(null)
        await webTokenStorage.deleteRefreshToken()
        set({ isInitializing: false, isAuthenticated: false, user: null })
      }
    },

    register: async (displayName, deviceName) => {
      const data = await sdk.auth.register({ displayName, platform: 'web', deviceName })
      sdk.setAccessToken(data.accessToken)
      await webTokenStorage.setRefreshToken(data.refreshToken)
      if (data.user.anonymousToken) {
        await webTokenStorage.setAnonymousToken(data.user.anonymousToken)
      }
      set({ user: data.user, isAuthenticated: true })
      return { anonymousToken: data.user.anonymousToken! }
    },

    recover: async (anonymousToken, deviceName) => {
      const data = await sdk.auth.recover({ anonymousToken, platform: 'web', deviceName })
      sdk.setAccessToken(data.accessToken)
      await webTokenStorage.setRefreshToken(data.refreshToken)
      await webTokenStorage.setAnonymousToken(anonymousToken)
      set({ user: data.user, isAuthenticated: true })
    },

    logout: async () => {
      try { await sdk.auth.logout() } catch { /* best-effort */ }
      sdk.setAccessToken(null)
      await webTokenStorage.deleteRefreshToken()
      set({ user: null, isAuthenticated: false })
    },

    refreshUser: async () => {
      const user = await sdk.users.getMe()
      set({ user })
    },

    updateUser: (partial) => {
      const current = get().user
      if (current) set({ user: { ...current, ...partial } })
    },
  }
})
