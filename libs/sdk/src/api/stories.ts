import type { AxiosInstance } from 'axios'
import type { MessageEntity, PaginatedResponse, Story, StoryPrivacy } from '../types'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export interface StoryViewer {
  viewerId: string
  reactionEmoji: string | null
  viewedAt: string
}

export function createStoriesApi(client: AxiosInstance) {
  return {
    create: async (dto: {
      mediaId: string
      caption?: string
      privacy?: StoryPrivacy
      selectedUserIds?: string[]
      entities?: MessageEntity[]
    }): Promise<Story> =>
      unwrap(await client.post('/stories', dto)),

    getFeed: async (cursor?: string, limit = 20): Promise<PaginatedResponse<Story>> => {
      const params: Record<string, unknown> = { limit }
      if (cursor) params.cursor = cursor
      return unwrap(await client.get('/stories/feed', { params }))
    },

    getUserStories: async (userId: string): Promise<Story[]> =>
      unwrap(await client.get(`/stories/users/${userId}`)),

    delete: async (storyId: string): Promise<void> => {
      await client.delete(`/stories/${storyId}`)
    },

    archive: async (storyId: string): Promise<void> => {
      await client.post(`/stories/${storyId}/archive`)
    },

    pin: async (storyId: string, isPinned: boolean): Promise<void> => {
      await client.patch(`/stories/${storyId}/pin`, { isPinned })
    },

    view: async (storyId: string): Promise<void> => {
      await client.post(`/stories/${storyId}/view`)
    },

    getViewers: async (storyId: string): Promise<StoryViewer[]> =>
      unwrap(await client.get(`/stories/${storyId}/viewers`)),

    react: async (storyId: string, emoji: string): Promise<void> => {
      await client.post(`/stories/${storyId}/react`, { emoji })
    },
  }
}
