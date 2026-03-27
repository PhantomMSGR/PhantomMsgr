import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, desc, eq, lt, notInArray } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { MESSAGE_EVENTS } from '@phantom/contracts'
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  MediaProcessedEvent,
} from '@phantom/contracts'
import * as schema from '../../../src/database/schema'
import { TtlService } from './ttl/ttl.service'

@Injectable()
export class MessagingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly ttlService: TtlService,
  ) {}

  async sendMessage(dto: {
    chatId: string
    senderId: string
    type?: string
    text?: string
    mediaId?: string
    replyToMessageId?: string
    forwardFromMessageId?: string
    forwardFromChatId?: string
    ttlSeconds?: number
    entities?: unknown
  }) {
    // Verify sender is an active member with send permission
    let [member] = await this.db
      .select({ role: schema.chatMembers.role, canSendMessages: schema.chatMembers.canSendMessages })
      .from(schema.chatMembers)
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.senderId),
        ),
      )
      .limit(1)

    // Self-heal: saved chats created before the membership fix have no member record.
    // Auto-insert the sender as owner since saved chats are private personal spaces.
    if (!member) {
      const [chat] = await this.db
        .select({ type: schema.chats.type })
        .from(schema.chats)
        .where(eq(schema.chats.id, dto.chatId))
        .limit(1)

      if (chat?.type === 'saved') {
        await this.db.insert(schema.chatMembers).values({
          chatId: dto.chatId,
          userId: dto.senderId,
          role: 'owner',
          canSendMessages: true,
          canAddUsers: true,
          canPinMessages: true,
          canManageChat: true,
          canDeleteMessages: true,
          canBanUsers: true,
        })
        member = { role: 'owner', canSendMessages: true }
      }
    }

    if (!member || ['left', 'banned'].includes(member.role)) {
      throw new RpcException({ status: 403, message: 'Not a member of this chat' })
    }
    if (!member.canSendMessages) {
      throw new RpcException({ status: 403, message: 'Sending messages is disabled for you' })
    }

    const ttlExpiresAt = dto.ttlSeconds
      ? new Date(Date.now() + dto.ttlSeconds * 1000)
      : undefined

    const [message] = await this.db
      .insert(schema.messages)
      .values({
        chatId: dto.chatId,
        senderId: dto.senderId,
        type: (dto.type as any) ?? 'text',
        text: dto.text,
        mediaId: dto.mediaId,
        replyToMessageId: dto.replyToMessageId,
        forwardFromMessageId: dto.forwardFromMessageId,
        forwardFromChatId: dto.forwardFromChatId,
        ttlSeconds: dto.ttlSeconds,
        ttlExpiresAt,
        entities: dto.entities as any,
      })
      .returning()

    // Update chat's lastMessageId and updatedAt
    await this.db
      .update(schema.chats)
      .set({ lastMessageId: message.id, updatedAt: new Date() })
      .where(eq(schema.chats.id, dto.chatId))

    // Schedule self-destruction
    if (dto.ttlSeconds && ttlExpiresAt) {
      await this.ttlService.scheduleExpiry(message.id, dto.ttlSeconds)
    }

    // Get all chat members for real-time fanout
    const members = await this.db
      .select({ userId: schema.chatMembers.userId })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, dto.chatId))

    const memberIds = members.map((m) => m.userId)

    // Publish event for WebSocket fanout and notification-service
    const event: MessageCreatedEvent = {
      messageId: message.id,
      chatId: message.chatId,
      senderId: message.senderId,
      type: message.type,
      text: message.text,
      mediaId: message.mediaId,
      replyToMessageId: message.replyToMessageId,
      createdAt: message.createdAt.toISOString(),
      memberIds,
    }

    await this.redis.publish(MESSAGE_EVENTS.CREATED, JSON.stringify(event))

    // Attach media object so the client can render it immediately
    if (message.mediaId) {
      const [media] = await this.db
        .select()
        .from(schema.media)
        .where(eq(schema.media.id, message.mediaId))
        .limit(1)
      return { ...message, media: media ?? null }
    }

    return { ...message, media: null }
  }

  async editMessage(dto: {
    messageId: string
    userId: string
    text: string
    entities?: unknown
  }) {
    const [message] = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, dto.messageId))
      .limit(1)

    if (!message) throw new RpcException({ status: 404, message: 'Message not found' })
    if (message.senderId !== dto.userId) {
      throw new RpcException({ status: 403, message: 'Cannot edit another user\'s message' })
    }
    if (message.isDeleted) throw new RpcException({ status: 410, message: 'Message deleted' })

    const [updated] = await this.db
      .update(schema.messages)
      .set({ text: dto.text, entities: dto.entities as any, isEdited: true, editedAt: new Date() })
      .where(eq(schema.messages.id, dto.messageId))
      .returning()

    const members = await this.db
      .select({ userId: schema.chatMembers.userId })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, message.chatId))

    const event: MessageEditedEvent = {
      messageId: updated.id,
      chatId: updated.chatId,
      text: updated.text,
      entities: updated.entities,
      editedAt: updated.editedAt!.toISOString(),
      memberIds: members.map((m) => m.userId),
    }

    await this.redis.publish(MESSAGE_EVENTS.EDITED, JSON.stringify(event))

    return updated
  }

  async deleteMessage(dto: {
    messageId: string
    userId: string
    forEveryone?: boolean
  }) {
    const [message] = await this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, dto.messageId))
      .limit(1)

    if (!message) throw new RpcException({ status: 404, message: 'Message not found' })

    const canDelete =
      message.senderId === dto.userId ||
      dto.forEveryone === false // "delete for me" always allowed

    if (!canDelete) throw new RpcException({ status: 403, message: 'Forbidden' })

    await this.db
      .update(schema.messages)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        deleteForEveryone: dto.forEveryone ?? false,
      })
      .where(eq(schema.messages.id, dto.messageId))

    const members = await this.db
      .select({ userId: schema.chatMembers.userId })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, message.chatId))

    const event: MessageDeletedEvent = {
      messageId: dto.messageId,
      chatId: message.chatId,
      deleteForEveryone: dto.forEveryone ?? false,
      memberIds: members.map((m) => m.userId),
    }

    await this.redis.publish(MESSAGE_EVENTS.DELETED, JSON.stringify(event))

    return { ok: true }
  }

  async getHistory(dto: {
    chatId: string
    userId: string
    cursor?: string
    limit?: number
  }) {
    const limit = Math.min(dto.limit ?? 20, 100)

    const rows = await this.db
      .select({ message: schema.messages, media: schema.media })
      .from(schema.messages)
      .leftJoin(schema.media, eq(schema.messages.mediaId, schema.media.id))
      .where(
        dto.cursor
          ? and(
              eq(schema.messages.chatId, dto.chatId),
              eq(schema.messages.isDeleted, false),
              lt(schema.messages.createdAt, new Date(dto.cursor)),
            )
          : and(
              eq(schema.messages.chatId, dto.chatId),
              eq(schema.messages.isDeleted, false),
            ),
      )
      .orderBy(desc(schema.messages.createdAt))
      .limit(limit + 1)

    const hasMore = rows.length > limit
    const rawItems = rows.slice(0, limit)
    const items = rawItems.map((r) => ({ ...r.message, media: r.media ?? null }))

    return {
      items,
      nextCursor: hasMore ? rawItems[rawItems.length - 1].message.createdAt.toISOString() : null,
      hasMore,
    }
  }

  async getMessageById(messageId: string, _userId: string) {
    const [row] = await this.db
      .select({ message: schema.messages, media: schema.media })
      .from(schema.messages)
      .leftJoin(schema.media, eq(schema.messages.mediaId, schema.media.id))
      .where(and(eq(schema.messages.id, messageId), eq(schema.messages.isDeleted, false)))
      .limit(1)

    if (!row) throw new RpcException({ status: 404, message: 'Message not found' })
    return { ...row.message, media: row.media ?? null }
  }

  async onMediaProcessed(event: MediaProcessedEvent) {
    await this.db
      .update(schema.media)
      .set({
        thumbnailKey: event.thumbnailKey,
        thumbnailUrl: event.thumbnailUrl,
        width: event.width,
        height: event.height,
        duration: event.duration,
        waveform: event.waveform as any,
      })
      .where(eq(schema.media.id, event.mediaId))
  }
}
