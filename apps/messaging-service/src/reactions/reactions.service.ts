import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MESSAGE_EVENTS } from '@phantom/contracts'
import type { ReactionEvent } from '@phantom/contracts'
import * as schema from '../../../../src/database/schema'

@Injectable()
export class ReactionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async addReaction(dto: { messageId: string; userId: string; emoji: string }) {
    // Upsert: one reaction per user per message
    await this.db
      .insert(schema.messageReactions)
      .values(dto)
      .onConflictDoUpdate({
        target: [schema.messageReactions.messageId, schema.messageReactions.userId],
        set: { emoji: dto.emoji, createdAt: new Date() },
      })

    const reactions = await this.buildReactionCounts(dto.messageId)

    // Update cache in messages table
    await this.db
      .update(schema.messages)
      .set({ reactions })
      .where(eq(schema.messages.id, dto.messageId))

    const [message] = await this.db
      .select({ chatId: schema.messages.chatId })
      .from(schema.messages)
      .where(eq(schema.messages.id, dto.messageId))
      .limit(1)

    const members = await this.db
      .select({ userId: schema.chatMembers.userId })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, message.chatId))

    const event: ReactionEvent = {
      messageId: dto.messageId,
      chatId: message.chatId,
      userId: dto.userId,
      emoji: dto.emoji,
      reactions,
      memberIds: members.map((m) => m.userId),
    }

    await this.redis.publish(MESSAGE_EVENTS.REACTION_ADDED, JSON.stringify(event))

    return { reactions }
  }

  async removeReaction(messageId: string, userId: string) {
    await this.db
      .delete(schema.messageReactions)
      .where(
        and(
          eq(schema.messageReactions.messageId, messageId),
          eq(schema.messageReactions.userId, userId),
        ),
      )

    const reactions = await this.buildReactionCounts(messageId)
    await this.db
      .update(schema.messages)
      .set({ reactions })
      .where(eq(schema.messages.id, messageId))

    return { reactions }
  }

  private async buildReactionCounts(messageId: string): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ emoji: schema.messageReactions.emoji })
      .from(schema.messageReactions)
      .where(eq(schema.messageReactions.messageId, messageId))

    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
      return acc
    }, {})
  }
}
