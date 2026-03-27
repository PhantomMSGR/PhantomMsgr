import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, desc, eq, gt, lt } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../src/database/schema'
import { StoryPrivacyService } from './privacy/story-privacy.service'
import { StoryExpiryService } from './expiry/story-expiry.service'

const STORY_TTL_HOURS = 24

@Injectable()
export class StoryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly privacyService: StoryPrivacyService,
    private readonly expiryService: StoryExpiryService,
  ) {}

  async createStory(dto: {
    userId: string
    mediaId: string
    caption?: string
    privacy?: 'everyone' | 'contacts' | 'close_friends' | 'selected_users'
    selectedUserIds?: string[]
    entities?: unknown
  }) {
    const expiresAt = new Date(Date.now() + STORY_TTL_HOURS * 3600 * 1000)

    const [story] = await this.db
      .insert(schema.stories)
      .values({
        userId: dto.userId,
        mediaId: dto.mediaId,
        caption: dto.caption,
        privacy: dto.privacy ?? 'everyone',
        entities: dto.entities as any,
        expiresAt,
      })
      .returning()

    if (dto.privacy === 'selected_users' && dto.selectedUserIds?.length) {
      await this.db.insert(schema.storyPrivacyExceptions).values(
        dto.selectedUserIds.map((uid) => ({ storyId: story.id, userId: uid })),
      )
    }

    await this.expiryService.scheduleExpiry(story.id, STORY_TTL_HOURS * 3600)

    return story
  }

  async getFeed(dto: { viewerId: string; cursor?: string; limit?: number }) {
    const limit = Math.min(dto.limit ?? 20, 50)

    // Get stories visible to this viewer: not expired, not archived, not deleted
    const rows = await this.db
      .select()
      .from(schema.stories)
      .where(
        and(
          eq(schema.stories.isArchived, false),
          gt(schema.stories.expiresAt, new Date()),
          dto.cursor ? lt(schema.stories.createdAt, new Date(dto.cursor)) : undefined,
        ),
      )
      .orderBy(desc(schema.stories.createdAt))
      .limit(limit + 1)

    // Filter by privacy for each story
    const visible = await this.privacyService.filterVisibleStories(rows, dto.viewerId)

    const hasMore = visible.length > limit
    const items = visible.slice(0, limit)

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].createdAt.toISOString() : null,
      hasMore,
    }
  }

  async getByUser(userId: string, viewerId: string) {
    const rows = await this.db
      .select()
      .from(schema.stories)
      .where(
        and(
          eq(schema.stories.userId, userId),
          eq(schema.stories.isArchived, false),
          gt(schema.stories.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(schema.stories.createdAt))

    return this.privacyService.filterVisibleStories(rows, viewerId)
  }

  async deleteStory(storyId: string, userId: string) {
    const story = await this.getStoryOrThrow(storyId, userId)

    await this.db.delete(schema.stories).where(eq(schema.stories.id, storyId))
    return { ok: true }
  }

  async archiveStory(storyId: string, userId: string) {
    await this.getStoryOrThrow(storyId, userId)

    await this.db
      .update(schema.stories)
      .set({ isArchived: true })
      .where(eq(schema.stories.id, storyId))

    return { ok: true }
  }

  async togglePin(storyId: string, userId: string, isPinned: boolean) {
    await this.getStoryOrThrow(storyId, userId)

    await this.db
      .update(schema.stories)
      .set({ isPinned })
      .where(eq(schema.stories.id, storyId))

    return { ok: true }
  }

  async recordView(storyId: string, viewerId: string) {
    await this.db
      .insert(schema.storyViews)
      .values({ storyId, viewerId })
      .onConflictDoNothing()

    await this.db
      .update(schema.stories)
      .set({ viewsCount: this.db.$count(schema.storyViews, eq(schema.storyViews.storyId, storyId)) as any })
      .where(eq(schema.stories.id, storyId))

    return { ok: true }
  }

  async getViewers(storyId: string, userId: string) {
    await this.getStoryOrThrow(storyId, userId)

    return this.db
      .select({
        viewerId: schema.storyViews.viewerId,
        reactionEmoji: schema.storyViews.reactionEmoji,
        viewedAt: schema.storyViews.viewedAt,
      })
      .from(schema.storyViews)
      .where(eq(schema.storyViews.storyId, storyId))
  }

  async reactToStory(dto: { storyId: string; viewerId: string; emoji: string }) {
    await this.db
      .update(schema.storyViews)
      .set({ reactionEmoji: dto.emoji })
      .where(
        and(
          eq(schema.storyViews.storyId, dto.storyId),
          eq(schema.storyViews.viewerId, dto.viewerId),
        ),
      )

    return { ok: true }
  }

  private async getStoryOrThrow(storyId: string, userId: string) {
    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.id, storyId))
      .limit(1)

    if (!story) throw new RpcException({ status: 404, message: 'Story not found' })
    if (story.userId !== userId) throw new RpcException({ status: 403, message: 'Forbidden' })
    return story
  }
}
