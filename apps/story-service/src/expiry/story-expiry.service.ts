import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { Inject } from '@nestjs/common'
import { and, eq, lt } from 'drizzle-orm'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'

@Injectable()
@Processor('story-expiry')
export class StoryExpiryService {
  constructor(
    @InjectQueue('story-expiry') private readonly queue: Queue,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async scheduleExpiry(storyId: string, ttlSeconds: number) {
    await this.queue.add(
      'expire',
      { storyId },
      { delay: ttlSeconds * 1000, attempts: 3, backoff: 5000 },
    )
  }

  @Process('expire')
  async handleExpiry(job: Job<{ storyId: string }>) {
    const { storyId } = job.data

    const [story] = await this.db
      .select()
      .from(schema.stories)
      .where(eq(schema.stories.id, storyId))
      .limit(1)

    // Pinned stories don't expire
    if (!story || story.isPinned) return

    await this.db
      .update(schema.stories)
      .set({ isArchived: true })
      .where(eq(schema.stories.id, storyId))
  }

  /** Safety net: runs every hour to catch any stories missed by Bull */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpired() {
    await this.db
      .update(schema.stories)
      .set({ isArchived: true })
      .where(
        and(
          lt(schema.stories.expiresAt, new Date()),
          eq(schema.stories.isPinned, false),
          eq(schema.stories.isArchived, false),
        ),
      )
  }
}
