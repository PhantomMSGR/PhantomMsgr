import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, eq, desc } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'

@Injectable()
export class PinsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  private async assertCanPin(chatId: string, userId: string) {
    const [member] = await this.db
      .select()
      .from(schema.chatMembers)
      .where(and(eq(schema.chatMembers.chatId, chatId), eq(schema.chatMembers.userId, userId)))
      .limit(1)

    if (!member || ['left', 'banned'].includes(member.role)) {
      throw new RpcException({ status: 403, message: 'Not a member of this chat' })
    }
    if (!member.canPinMessages) {
      throw new RpcException({ status: 403, message: 'No permission to pin messages' })
    }
  }

  async pinMessage(dto: { chatId: string; messageId: string; userId: string }) {
    await this.assertCanPin(dto.chatId, dto.userId)

    await this.db
      .insert(schema.pinnedMessages)
      .values({
        chatId: dto.chatId,
        messageId: dto.messageId,
        pinnedBy: dto.userId,
      })
      .onConflictDoNothing()

    return { ok: true }
  }

  async unpinMessage(dto: { chatId: string; messageId: string; userId: string }) {
    await this.assertCanPin(dto.chatId, dto.userId)

    await this.db
      .delete(schema.pinnedMessages)
      .where(eq(schema.pinnedMessages.messageId, dto.messageId))

    return { ok: true }
  }

  async getPinnedMessages(chatId: string) {
    const rows = await this.db
      .select({ message: schema.messages, media: schema.media })
      .from(schema.pinnedMessages)
      .innerJoin(schema.messages, eq(schema.messages.id, schema.pinnedMessages.messageId))
      .leftJoin(schema.media, eq(schema.messages.mediaId, schema.media.id))
      .where(eq(schema.pinnedMessages.chatId, chatId))
      .orderBy(desc(schema.pinnedMessages.pinnedAt))
    return rows.map((r) => ({ ...r.message, media: r.media ?? null }))
  }
}
