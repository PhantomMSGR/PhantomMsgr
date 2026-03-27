import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL, SECURE_STORE_KEYS } from '@/config'

// ─── Axios instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── In-memory token store ────────────────────────────────────────────────────
// Access token lives only in memory (short-lived, 15 min).

let accessToken: string | null = null
let isRefreshing = false
let refreshQueue: Array<{
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

// ─── Request interceptor — attach Bearer token ────────────────────────────────

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// ─── Response interceptor — handle 401 / token refresh ───────────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    // Mark to avoid infinite retry loops
    original._retry = true

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        refreshQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(original))
          },
          reject,
        })
      })
    }

    isRefreshing = true

    try {
      const storedRefreshToken = await SecureStore.getItemAsync(
        SECURE_STORE_KEYS.REFRESH_TOKEN,
      )
      if (!storedRefreshToken) throw new Error('No refresh token')

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: storedRefreshToken,
      })

      const newAccess: string = data.data.accessToken
      const newRefresh: string = data.data.refreshToken

      setAccessToken(newAccess)
      await SecureStore.setItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN, newRefresh)

      // Flush queued requests
      refreshQueue.forEach(({ resolve }) => resolve(newAccess))
      refreshQueue = []

      original.headers.Authorization = `Bearer ${newAccess}`
      return apiClient(original)
    } catch (refreshError) {
      refreshQueue.forEach(({ reject }) => reject(refreshError))
      refreshQueue = []

      // Force logout — clear all stored credentials
      setAccessToken(null)
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.REFRESH_TOKEN)
      await SecureStore.deleteItemAsync(SECURE_STORE_KEYS.ANONYMOUS_TOKEN)

      // Emit a custom event that the auth store will listen to
      authLogoutListeners.forEach((fn) => fn())

      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  },
)

// ─── Force-logout listeners ───────────────────────────────────────────────────
// Allows the auth store to subscribe to forced logouts (expired session).

const authLogoutListeners: Array<() => void> = []

export function onForceLogout(fn: () => void) {
  authLogoutListeners.push(fn)
  return () => {
    const idx = authLogoutListeners.indexOf(fn)
    if (idx !== -1) authLogoutListeners.splice(idx, 1)
  }
}
