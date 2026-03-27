import { apiClient } from './client'
import type { User, UserSettings, PrivacyLevel, Theme } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

interface UpdateProfileDto {
  displayName?: string
  username?: string | null
  bio?: string | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  avatarMediaId?: string | null
}

interface UpdateSettingsDto {
  privacyLastSeen?: PrivacyLevel
  privacyProfilePhoto?: PrivacyLevel
  privacyOnlineStatus?: PrivacyLevel
  privacyForwards?: PrivacyLevel
  privacyMessages?: PrivacyLevel
  notifyMessages?: boolean
  notifyGroups?: boolean
  notifyChannels?: boolean
  notifySound?: boolean
  notifyVibration?: boolean
  notifyPreview?: boolean
  theme?: Theme
  language?: string
}

export interface UserSearchResult {
  id: string
  username: string | null
  displayName: string
}

export const usersApi = {
  searchUsers: async (q: string): Promise<UserSearchResult[]> => {
    const res = await apiClient.get('/users/search', { params: { q } })
    return unwrap(res)
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/users/me')
    return unwrap(res)
  },

  getUser: async (userId: string): Promise<User> => {
    const res = await apiClient.get(`/users/${userId}`)
    return unwrap(res)
  },

  updateProfile: async (dto: UpdateProfileDto): Promise<User> => {
    const res = await apiClient.patch('/users/me', dto)
    return unwrap(res)
  },

  getSettings: async (): Promise<UserSettings> => {
    const res = await apiClient.get('/users/me/settings')
    return unwrap(res)
  },

  updateSettings: async (dto: UpdateSettingsDto): Promise<UserSettings> => {
    const res = await apiClient.patch('/users/me/settings', dto)
    return unwrap(res)
  },

  deleteAccount: async (): Promise<void> => {
    await apiClient.delete('/users/me')
  },
}
