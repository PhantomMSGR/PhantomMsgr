import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'
import { MembershipService } from '../membership/membership.service'

@Injectable()
export class InviteService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly membershipService: MembershipService,
  ) {}

  async createInvite(dto: {
    chatId: string
    createdBy: string
    maxUses?: number
    expiresAt?: Date
    requiresApproval?: boolean
  }) {
    const member = await this.membershipService.getMember(dto.chatId, dto.createdBy)
    if (!member?.canAddUsers) {
      throw new RpcException({ status: 403, message: 'No permission to create invites' })
    }

    const inviteHash = randomBytes(16).toString('hex')

    const [invite] = await this.db
      .insert(schema.chatInvites)
      .values({
        chatId: dto.chatId,
        createdBy: dto.createdBy,
        inviteHash,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt,
        requiresApproval: dto.requiresApproval ?? false,
      })
      .returning()

    return invite
  }

  async joinByInvite(inviteHash: string, userId: string) {
    const [invite] = await this.db
      .select()
      .from(schema.chatInvites)
      .where(eq(schema.chatInvites.inviteHash, inviteHash))
      .limit(1)

    if (!invite) throw new RpcException({ status: 404, message: 'Invite not found' })
    if (invite.isRevoked) throw new RpcException({ status: 410, message: 'Invite revoked' })
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new RpcException({ status: 410, message: 'Invite expired' })
    }
    if (invite.maxUses && invite.usesCount >= invite.maxUses) {
      throw new RpcException({ status: 410, message: 'Invite usage limit reached' })
    }

    const alreadyMember = await this.membershipService.isMember(invite.chatId, userId)
    if (alreadyMember) throw new RpcException({ status: 409, message: 'Already a member' })

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.chatMembers).values({
        chatId: invite.chatId,
        userId,
        invitedBy: invite.createdBy,
      })

      await tx
        .update(schema.chatInvites)
        .set({ usesCount: invite.usesCount + 1 })
        .where(eq(schema.chatInvites.id, invite.id))
    })

    return { chatId: invite.chatId, ok: true }
  }

  async revokeInvite(inviteId: string, userId: string) {
    const [invite] = await this.db
      .select()
      .from(schema.chatInvites)
      .where(eq(schema.chatInvites.id, inviteId))
      .limit(1)

    if (!invite) throw new RpcException({ status: 404, message: 'Invite not found' })

    const member = await this.membershipService.getMember(invite.chatId, userId)
    if (!member?.canAddUsers) {
      throw new RpcException({ status: 403, message: 'No permission' })
    }

    await this.db
      .update(schema.chatInvites)
      .set({ isRevoked: true })
      .where(eq(schema.chatInvites.id, inviteId))

    return { ok: true }
  }
}
