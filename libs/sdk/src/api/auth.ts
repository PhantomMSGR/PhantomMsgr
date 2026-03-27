import type { AxiosInstance } from 'axios'
import type { AuthResponse, Platform, Session } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface RegisterDto {
  displayName: string
  platform: Platform
  deviceName?: string
}

export interface RecoverDto {
  anonymousToken: string
  platform: Platform
  deviceName?: string
}

export function createAuthApi(client: AxiosInstance) {
  return {
    register: async (dto: RegisterDto): Promise<AuthResponse> =>
      unwrap(await client.post('/auth/register', dto)),

    recover: async (dto: RecoverDto): Promise<AuthResponse> =>
      unwrap(await client.post('/auth/recover', dto)),

    refresh: async (refreshToken: string): Promise<AuthResponse> =>
      unwrap(await client.post('/auth/refresh', { refreshToken })),

    logout: async (): Promise<void> => {
      await client.post('/auth/logout')
    },

    getSessions: async (): Promise<Session[]> =>
      unwrap(await client.get('/auth/sessions')),

    revokeSession: async (sessionId: string): Promise<void> => {
      await client.delete(`/auth/sessions/${sessionId}`)
    },

    verify2fa: async (pin: string): Promise<{ verified: boolean }> =>
      unwrap(await client.post('/auth/2fa/verify', { pin })),
  }
}
