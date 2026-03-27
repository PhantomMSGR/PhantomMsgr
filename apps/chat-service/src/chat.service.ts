import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, desc, eq, getTableColumns, inArray, lt, ne } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { randomBytes } from 'crypto'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../src/database/schema'
import { MembershipService } from './membership/membership.service'

@Injectable()
export class ChatService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly membershipService: MembershipService,
  ) {}

  async createChat(dto: {
    type: 'direct' | 'group' | 'channel' | 'saved'
    title?: string
    description?: string
    createdBy: string
    memberIds?: string[]
    avatarEmoji?: string | null
    avatarColor?: string | null
  }) {
    const inviteHash = randomBytes(16).toString('hex')

    const [chat] = await this.db.transaction(async (tx) => {
      const [newChat] = await tx
        .insert(schema.chats)
        .values({
          type: dto.type,
          title: dto.title,
          description: dto.description,
          createdBy: dto.createdBy,
          inviteHash,
          avatarEmoji: dto.avatarEmoji,
          avatarColor: dto.avatarColor,
        })
        .returning()

      // Creator becomes owner (including for saved chats — user must be a member to send messages)
      await tx.insert(schema.chatMembers).values({
        chatId: newChat.id,
        userId: dto.createdBy,
        role: 'owner',
        canAddUsers: true,
        canPinMessages: true,
        canManageChat: true,
        canDeleteMessages: true,
        canBanUsers: true,
      })

      // Add initial members (for direct chats and groups)
      if (dto.memberIds?.length) {
        await tx.insert(schema.chatMembers).values(
          dto.memberIds.map((uid) => ({
            chatId: newChat.id,
            userId: uid,
            invitedBy: dto.createdBy,
          })),
        )
      }

      // Update member count
      const totalMembers = (dto.memberIds?.length ?? 0) + 1
      await tx
        .update(schema.chats)
        .set({ memberCount: totalMembers })
        .where(eq(schema.chats.id, newChat.id))

      return [newChat]
    })

    return chat
  }

  async getChatById(chatId: string, userId: string) {
    const [chat] = await this.db
      .select()
      .from(schema.chats)
      .where(eq(schema.chats.id, chatId))
      .limit(1)

    if (!chat) throw new RpcException({ status: 404, message: 'Chat not found' })

    // Verify membership for private chats
    if (!chat.isPublic) {
      const isMember = await this.membershipService.isMember(chatId, userId)
      if (!isMember) throw new RpcException({ status: 403, message: 'Not a member' })
    }

    // Resolve peer name for direct chats
    if (chat.type === 'direct') {
      const [peer] = await this.db
        .select({ displayName: schema.users.displayName, username: schema.users.username })
        .from(schema.chatMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.chatMembers.userId))
        .where(and(eq(schema.chatMembers.chatId, chatId), ne(schema.chatMembers.userId, userId)))
        .limit(1)
      return { ...chat, peerName: peer?.displayName ?? null, peerUsername: peer?.username ?? null }
    }

    return chat
  }

  async getUserChats(userId: string, cursor?: string, limit = 20) {
    const baseWhere = and(
      eq(schema.chatMembers.userId, userId),
      inArray(schema.chatMembers.role, ['owner', 'admin', 'member']),
    )

    const rows = await this.db
      .select({
        ...getTableColumns(schema.chats),
        lastMessageText: schema.messages.text,
        lastMessageType: schema.messages.type,
        lastMessageAt: schema.messages.createdAt,
        isArchived: schema.chatMembers.isArchived,
        isMuted: schema.chatMembers.isMuted,
        muteUntil: schema.chatMembers.muteUntil,
        isPinned: schema.chatMembers.isPinned,
        unreadCount: schema.chatMembers.unreadCount,
      })
      .from(schema.chatMembers)
      .innerJoin(schema.chats, eq(schema.chats.id, schema.chatMembers.chatId))
      .leftJoin(schema.messages, eq(schema.messages.id, schema.chats.lastMessageId))
      .where(
        cursor
          ? and(baseWhere, lt(schema.chats.updatedAt, new Date(cursor)))
          : baseWhere,
      )
      .orderBy(desc(schema.chats.updatedAt))
      .limit(limit + 1)

    if (!rows.length) return { items: [], nextCursor: null, hasMore: false }

    const hasMore = rows.length > limit
    const items = rows.slice(0, limit)
    const nextCursor = hasMore ? items[items.length - 1].updatedAt.toISOString() : null

    // Resolve peer names for direct chats
    const directChatIds = items.filter((c) => c.type === 'direct').map((c) => c.id)
    const peerMap = new Map<string, { displayName: string; username: string | null }>()
    if (directChatIds.length > 0) {
      const peers = await this.db
        .select({
          chatId: schema.chatMembers.chatId,
          displayName: schema.users.displayName,
          username: schema.users.username,
        })
        .from(schema.chatMembers)
        .innerJoin(schema.users, eq(schema.users.id, schema.chatMembers.userId))
        .where(and(inArray(schema.chatMembers.chatId, directChatIds), ne(schema.chatMembers.userId, userId)))
      for (const p of peers) peerMap.set(p.chatId, { displayName: p.displayName, username: p.username })
    }

    const enriched = items.map((chat) =>
      chat.type === 'direct'
        ? { ...chat, peerName: peerMap.get(chat.id)?.displayName ?? null, peerUsername: peerMap.get(chat.id)?.username ?? null }
        : chat,
    )

    return { items: enriched, nextCursor, hasMore }
  }

  async updateChat(dto: {
    chatId: string
    userId: string
    title?: string
    description?: string
    isPublic?: boolean
    slowModeDelay?: number | null
    avatarEmoji?: string | null
    avatarColor?: string | null
    avatarMediaId?: string | null
  }) {
    const member = await this.membershipService.getMember(dto.chatId, dto.userId)
    if (!member?.canManageChat) {
      throw new RpcException({ status: 403, message: 'No permission to manage chat' })
    }

    const [updated] = await this.db
      .update(schema.chats)
      .set({
        title: dto.title,
        description: dto.description,
        isPublic: dto.isPublic,
        slowModeDelay: dto.slowModeDelay,
        avatarEmoji: dto.avatarEmoji,
        avatarColor: dto.avatarColor,
        avatarMediaId: dto.avatarMediaId,
        updatedAt: new Date(),
      })
      .where(eq(schema.chats.id, dto.chatId))
      .returning()

    return updated
  }

  async deleteChat(chatId: string, userId: string) {
    const member = await this.membershipService.getMember(chatId, userId)
    if (member?.role !== 'owner') {
      throw new RpcException({ status: 403, message: 'Only owner can delete chat' })
    }

    await this.db.delete(schema.chats).where(eq(schema.chats.id, chatId))
    return { ok: true }
  }
}
