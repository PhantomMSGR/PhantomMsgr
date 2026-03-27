import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MESSAGE_EVENTS } from '@phantom/contracts'
import type { MessageDeletedEvent } from '@phantom/contracts'
import * as schema from '../../../../src/database/schema'

@Injectable()
@Processor('message-ttl')
export class TtlService {
  constructor(
    @InjectQueue('message-ttl') private readonly ttlQueue: Queue,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async scheduleExpiry(messageId: string, ttlSeconds: number) {
    await this.ttlQueue.add(
      'expire',
      { messageId },
      { delay: ttlSeconds * 1000, attempts: 3, backoff: 1000 },
    )
  }

  @Process('expire')
  async handleExpiry(job: Job<{ messageId: string }>) {
    const { messageId } = job.data

    const [message] = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, messageId))
      .limit(1)

    if (!message || message.isDeleted) return

    await this.db
      .update(schema.messages)
      .set({ isDeleted: true, deletedAt: new Date(), deleteForEveryone: true })
      .where(eq(schema.messages.id, messageId))

    const members = await this.db
      .select({ userId: schema.chatMembers.userId })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, message.chatId))

    const event: MessageDeletedEvent = {
      messageId,
      chatId: message.chatId,
      deleteForEveryone: true,
      memberIds: members.map((m) => m.userId),
    }

    await this.redis.publish(MESSAGE_EVENTS.DELETED, JSON.stringify(event))
  }
}
