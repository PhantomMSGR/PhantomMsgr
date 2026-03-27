import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// ─── Token Storage Adapter ────────────────────────────────────────────────────
// Each platform implements this interface to store tokens in the right place:
//   - Mobile:  expo-secure-store
//   - Web:     localStorage / sessionStorage
//   - Desktop: same as web (Tauri webview)

export interface TokenStorage {
  getRefreshToken(): Promise<string | null>
  setRefreshToken(token: string): Promise<void>
  deleteRefreshToken(): Promise<void>
  getAnonymousToken(): Promise<string | null>
  setAnonymousToken(token: string): Promise<void>
  deleteAnonymousToken(): Promise<void>
}

// ─── Client factory ───────────────────────────────────────────────────────────

export interface ApiClientOptions {
  baseURL: string
  storage: TokenStorage
}

export interface ApiClient {
  instance: AxiosInstance
  setAccessToken(token: string | null): void
  getAccessToken(): string | null
  onForceLogout(fn: () => void): () => void
}

export function createApiClient({ baseURL, storage }: ApiClientOptions): ApiClient {
  const instance = axios.create({
    baseURL,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
  })

  // ── In-memory token (short-lived, never persisted) ────────────────────────

  let accessToken: string | null = null
  let isRefreshing = false
  let refreshQueue: Array<{
    resolve: (token: string) => void
    reject: (err: unknown) => void
  }> = []

  const forceLogoutListeners: Array<() => void> = []

  function setAccessToken(token: string | null) {
    accessToken = token
  }

  function getAccessToken() {
    return accessToken
  }

  function onForceLogout(fn: () => void) {
    forceLogoutListeners.push(fn)
    return () => {
      const idx = forceLogoutListeners.indexOf(fn)
      if (idx !== -1) forceLogoutListeners.splice(idx, 1)
    }
  }

  // ── Request interceptor — attach Bearer token ─────────────────────────────

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  })

  // ── Response interceptor — refresh on 401 ────────────────────────────────

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error)
      }

      original._retry = true

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`
              resolve(instance(original))
            },
            reject,
          })
        })
      }

      isRefreshing = true

      try {
        const storedRefreshToken = await storage.getRefreshToken()
        if (!storedRefreshToken) throw new Error('No refresh token')

        const { data } = await axios.post(`${baseURL}/auth/refresh`, {
          refreshToken: storedRefreshToken,
        })

        const newAccess: string = data.data.accessToken
        const newRefresh: string = data.data.refreshToken

        setAccessToken(newAccess)
        await storage.setRefreshToken(newRefresh)

        refreshQueue.forEach(({ resolve }) => resolve(newAccess))
        refreshQueue = []

        original.headers.Authorization = `Bearer ${newAccess}`
        return instance(original)
      } catch (refreshError) {
        refreshQueue.forEach(({ reject }) => reject(refreshError))
        refreshQueue = []

        setAccessToken(null)
        await storage.deleteRefreshToken()
        await storage.deleteAnonymousToken()

        forceLogoutListeners.forEach((fn) => fn())

        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    },
  )

  return { instance, setAccessToken, getAccessToken, onForceLogout }
}
