import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, count, eq, notInArray } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'
import type { ChatMember } from '../../../../src/database/schema'
import { PermissionsService } from './permissions.service'

type PermissionKey = keyof Pick<
  ChatMember,
  | 'canSendMessages'
  | 'canSendMedia'
  | 'canSendPolls'
  | 'canAddUsers'
  | 'canPinMessages'
  | 'canManageChat'
  | 'canDeleteMessages'
  | 'canBanUsers'
>

@Injectable()
export class MembershipService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async getMember(chatId: string, userId: string): Promise<ChatMember | null> {
    const [member] = await this.db
      .select()
      .from(schema.chatMembers)
      .where(
        and(
          eq(schema.chatMembers.chatId, chatId),
          eq(schema.chatMembers.userId, userId),
        ),
      )
      .limit(1)
    return member ?? null
  }

  async isMember(chatId: string, userId: string): Promise<boolean> {
    const member = await this.getMember(chatId, userId)
    return !!member && !['left', 'banned'].includes(member.role)
  }

  async checkPermission(chatId: string, userId: string, permission: PermissionKey) {
    const member = await this.getMember(chatId, userId)
    const ok = this.permissionsService.hasPermission(member, permission)
    return { allowed: ok }
  }

  async getMembers(chatId: string, requestingUserId: string) {
    const isMember = await this.isMember(chatId, requestingUserId)
    if (!isMember) throw new RpcException({ status: 403, message: 'Not a member' })

    return this.db
      .select({
        userId: schema.chatMembers.userId,
        role: schema.chatMembers.role,
        joinedAt: schema.chatMembers.joinedAt,
        customTitle: schema.chatMembers.customTitle,
      })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, chatId))
  }

  async addMember(dto: { chatId: string; targetUserId: string; requestingUserId: string }) {
    const requester = await this.getMember(dto.chatId, dto.requestingUserId)
    if (!this.permissionsService.hasPermission(requester, 'canAddUsers')) {
      throw new RpcException({ status: 403, message: 'No permission to add users' })
    }

    // Prevent adding a currently-banned user
    const existing = await this.getMember(dto.chatId, dto.targetUserId)
    if (existing?.role === 'banned') {
      const stillBanned = !existing.bannedUntil || existing.bannedUntil > new Date()
      if (stillBanned) {
        throw new RpcException({ status: 403, message: 'User is banned from this chat' })
      }
    }

    await this.db
      .insert(schema.chatMembers)
      .values({
        chatId: dto.chatId,
        userId: dto.targetUserId,
        invitedBy: dto.requestingUserId,
        ...this.permissionsService.getDefaultPermissions('member'),
      })
      .onConflictDoUpdate({
        target: [schema.chatMembers.chatId, schema.chatMembers.userId],
        set: { role: 'member', leftAt: null, ...this.permissionsService.getDefaultPermissions('member') },
      })

    const [{ value: memberCount }] = await this.db
      .select({ value: count() })
      .from(schema.chatMembers)
      .where(eq(schema.chatMembers.chatId, dto.chatId))

    await this.db
      .update(schema.chats)
      .set({ memberCount })
      .where(eq(schema.chats.id, dto.chatId))

    return { ok: true }
  }

  async removeMember(dto: { chatId: string; targetUserId: string; requestingUserId: string }) {
    // Allow self-leave or requester with canBanUsers
    const isSelf = dto.targetUserId === dto.requestingUserId
    if (!isSelf) {
      const requester = await this.getMember(dto.chatId, dto.requestingUserId)
      if (!this.permissionsService.hasPermission(requester, 'canBanUsers')) {
        throw new RpcException({ status: 403, message: 'No permission to remove members' })
      }
    }

    await this.db
      .update(schema.chatMembers)
      .set({ role: 'left', leftAt: new Date() })
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.targetUserId),
        ),
      )

    // Sync member count (active members only)
    const [{ value: memberCount }] = await this.db
      .select({ value: count() })
      .from(schema.chatMembers)
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          notInArray(schema.chatMembers.role, ['left', 'banned']),
        ),
      )

    await this.db
      .update(schema.chats)
      .set({ memberCount })
      .where(eq(schema.chats.id, dto.chatId))

    return { ok: true }
  }

  async updateRole(dto: { chatId: string; targetUserId: string; requestingUserId: string; role: 'admin' | 'member' }) {
    const requester = await this.getMember(dto.chatId, dto.requestingUserId)
    if (requester?.role !== 'owner') {
      throw new RpcException({ status: 403, message: 'Only owner can change roles' })
    }

    const permissions = this.permissionsService.getDefaultPermissions(dto.role)

    await this.db
      .update(schema.chatMembers)
      .set({ role: dto.role, ...permissions })
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.targetUserId),
        ),
      )

    return { ok: true }
  }

  async updateMemberSettings(dto: {
    chatId: string
    userId: string
    isArchived?: boolean
    isMuted?: boolean
    muteUntil?: string | null
    isPinned?: boolean
  }) {
    const member = await this.getMember(dto.chatId, dto.userId)
    if (!member) throw new RpcException({ status: 403, message: 'Not a member' })

    const update: Record<string, unknown> = {}
    if (dto.isArchived !== undefined) update.isArchived = dto.isArchived
    if (dto.isMuted !== undefined) update.isMuted = dto.isMuted
    if ('muteUntil' in dto) update.muteUntil = dto.muteUntil ? new Date(dto.muteUntil) : null
    if (dto.isPinned !== undefined) {
      update.isPinned = dto.isPinned
      update.pinnedAt = dto.isPinned ? new Date() : null
    }

    await this.db
      .update(schema.chatMembers)
      .set(update)
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.userId),
        ),
      )

    return { ok: true }
  }

  async banMember(dto: {
    chatId: string
    targetUserId: string
    requestingUserId: string
    bannedUntil?: Date | null
  }) {
    const requester = await this.getMember(dto.chatId, dto.requestingUserId)
    if (!this.permissionsService.hasPermission(requester, 'canBanUsers')) {
      throw new RpcException({ status: 403, message: 'No permission to ban' })
    }

    await this.db
      .update(schema.chatMembers)
      .set({
        role: 'banned',
        bannedUntil: dto.bannedUntil ?? null,
        leftAt: new Date(),
      })
      .where(
        and(
          eq(schema.chatMembers.chatId, dto.chatId),
          eq(schema.chatMembers.userId, dto.targetUserId),
        ),
      )

    return { ok: true }
  }
}
