import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'
import type { Story } from '../../../../src/database/schema'

@Injectable()
export class StoryPrivacyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async filterVisibleStories(stories: Story[], viewerId: string): Promise<Story[]> {
    if (!stories.length) return []

    const storyIds = stories.map((s) => s.id)

    // Fetch exception lists for all stories in one query
    const exceptions = await this.db
      .select()
      .from(schema.storyPrivacyExceptions)
      .where(inArray(schema.storyPrivacyExceptions.storyId, storyIds))

    // Fetch viewer's contacts (the viewer's contact list)
    const viewerContacts = await this.db
      .select({ contactId: schema.contacts.contactId })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.ownerId, viewerId),
          eq(schema.contacts.isBlocked, false),
        ),
      )

    const contactIds = new Set(viewerContacts.map((c) => c.contactId))

    const exceptionsByStory = exceptions.reduce<Record<string, Set<string>>>(
      (acc, e) => {
        if (!acc[e.storyId]) acc[e.storyId] = new Set()
        acc[e.storyId].add(e.userId)
        return acc
      },
      {},
    )

    return stories.filter((story) => {
      // Owner always sees own stories
      if (story.userId === viewerId) return true

      const exceptionSet = exceptionsByStory[story.id] ?? new Set<string>()

      switch (story.privacy) {
        case 'everyone':
          return true
        case 'contacts':
          return contactIds.has(story.userId)
        case 'close_friends':
          // close_friends list stored as exceptions where story owner chose them
          return exceptionSet.has(viewerId)
        case 'selected_users':
          return exceptionSet.has(viewerId)
        default:
          return false
      }
    })
  }
}
