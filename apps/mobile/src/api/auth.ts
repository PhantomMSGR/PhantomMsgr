import { apiClient } from './client'
import type { AuthResponse, Platform, Session } from '@/types'

interface RegisterDto {
  displayName: string
  platform: Platform
  deviceName?: string
}

interface RecoverDto {
  anonymousToken: string
  platform: Platform
  deviceName?: string
}

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

export const authApi = {
  register: async (dto: RegisterDto): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/register', dto)
    return unwrap(res)
  },

  recover: async (dto: RecoverDto): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/recover', dto)
    return unwrap(res)
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/refresh', { refreshToken })
    return unwrap(res)
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  getSessions: async (): Promise<Session[]> => {
    const res = await apiClient.get('/auth/sessions')
    return unwrap(res)
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/auth/sessions/${sessionId}`)
  },

  verify2fa: async (pin: string): Promise<{ verified: boolean }> => {
    const res = await apiClient.post('/auth/2fa/verify', { pin })
    return unwrap(res)
  },
}
