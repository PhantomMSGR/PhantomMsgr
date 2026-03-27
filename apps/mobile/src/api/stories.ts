import { apiClient } from './client'
import type { MessageEntity, PaginatedResponse, Story, StoryPrivacy } from '@/types'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

interface CreateStoryDto {
  mediaId: string
  caption?: string
  privacy?: StoryPrivacy
  selectedUserIds?: string[]
  entities?: MessageEntity[]
}

interface StoryViewer {
  viewerId: string
  reactionEmoji: string | null
  viewedAt: string
}

export const storiesApi = {
  create: async (dto: CreateStoryDto): Promise<Story> => {
    const res = await apiClient.post('/stories', dto)
    return unwrap(res)
  },

  getFeed: async (cursor?: string, limit = 20): Promise<PaginatedResponse<Story>> => {
    const params: Record<string, unknown> = { limit }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get('/stories/feed', { params })
    return unwrap(res)
  },

  getUserStories: async (userId: string): Promise<Story[]> => {
    const res = await apiClient.get(`/stories/users/${userId}`)
    return unwrap(res)
  },

  delete: async (storyId: string): Promise<void> => {
    await apiClient.delete(`/stories/${storyId}`)
  },

  archive: async (storyId: string): Promise<void> => {
    await apiClient.post(`/stories/${storyId}/archive`)
  },

  pin: async (storyId: string, isPinned: boolean): Promise<void> => {
    await apiClient.patch(`/stories/${storyId}/pin`, { isPinned })
  },

  view: async (storyId: string): Promise<void> => {
    await apiClient.post(`/stories/${storyId}/view`)
  },

  getViewers: async (storyId: string): Promise<StoryViewer[]> => {
    const res = await apiClient.get(`/stories/${storyId}/viewers`)
    return unwrap(res)
  },

  react: async (storyId: string, emoji: string): Promise<void> => {
    await apiClient.post(`/stories/${storyId}/react`, { emoji })
  },
}
