import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MESSAGE_EVENTS } from '@phantom/contracts'
import type { ReadUpdatedEvent } from '@phantom/contracts'
import * as schema from '../../../../src/database/schema'

@Injectable()
export class ReadsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async markRead(dto: { chatId: string; userId: string; messageId: string }) {
    // Upsert read receipt
    await this.db
      .insert(schema.messageReads)
      .values({ messageId: dto.messageId, userId: dto.userId })
      .onConflictDoNothing()

    // Reset unread count in chatMembers
    await this.db
      .update(schema.chatMembers)
      .set({ lastReadMessageId: dto.messageId, unreadCount: 0 })
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.userId),
        ),
      )

    const event: ReadUpdatedEvent = {
      chatId: dto.chatId,
      userId: dto.userId,
      lastReadMessageId: dto.messageId,
      unreadCount: 0,
    }

    await this.redis.publish(MESSAGE_EVENTS.READ_UPDATED, JSON.stringify(event))

    return { ok: true }
  }
}
