import type { AxiosInstance } from 'axios'
import type { User, UserSettings, PrivacyLevel, Theme } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface UpdateProfileDto {
  displayName?: string
  username?: string | null
  bio?: string | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  avatarMediaId?: string | null
}

export interface UpdateSettingsDto {
  privacyLastSeen?: PrivacyLevel
  privacyProfilePhoto?: PrivacyLevel
  privacyOnlineStatus?: PrivacyLevel
  privacyForwards?: PrivacyLevel
  privacyMessages?: PrivacyLevel
  notifyMessages?: boolean
  notifyGroups?: boolean
  notifyChannels?: boolean
  notifySound?: boolean
  notifyPreview?: boolean
  theme?: Theme
  language?: string
}

export interface UserSearchResult {
  id: string
  username: string | null
  displayName: string
  avatarEmoji: string | null
  avatarColor: string | null
}

export function createUsersApi(client: AxiosInstance) {
  return {
    search: async (q: string): Promise<UserSearchResult[]> =>
      unwrap(await client.get('/users/search', { params: { q } })),

    getMe: async (): Promise<User> =>
      unwrap(await client.get('/users/me')),

    getUser: async (userId: string): Promise<User> =>
      unwrap(await client.get(`/users/${userId}`)),

    updateProfile: async (dto: UpdateProfileDto): Promise<User> =>
      unwrap(await client.patch('/users/me', dto)),

    getSettings: async (): Promise<UserSettings> =>
      unwrap(await client.get('/users/me/settings')),

    updateSettings: async (dto: UpdateSettingsDto): Promise<UserSettings> =>
      unwrap(await client.patch('/users/me/settings', dto)),

    deleteAccount: async (): Promise<void> => {
      await client.delete('/users/me')
    },
  }
}
