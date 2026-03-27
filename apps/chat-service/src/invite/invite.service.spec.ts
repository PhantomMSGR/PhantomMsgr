import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { InviteService } from './invite.service'
import { MembershipService } from '../membership/membership.service'
import { DRIZZLE } from '@phantom/database'

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
  $count: jest.fn().mockResolvedValue(1),
}

const mockMembershipService = {
  getMember: jest.fn(),
  isMember: jest.fn(),
}

describe('InviteService', () => {
  let service: InviteService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: MembershipService, useValue: mockMembershipService },
      ],
    }).compile()

    service = module.get<InviteService>(InviteService)
  })

  // ─── createInvite ──────────────────────────────────────────────────────────

  describe('createInvite', () => {
    it('creates an invite when user has canAddUsers permission', async () => {
      const member = { role: 'admin', canAddUsers: true }
      const invite = {
        id: 'invite-1',
        chatId: 'chat-1',
        createdBy: 'user-1',
        inviteHash: 'abc123',
        isRevoked: false,
        usesCount: 0,
      }

      mockMembershipService.getMember.mockResolvedValue(member)
      mockDb.returning.mockResolvedValue([invite])

      const result = await service.createInvite({
        chatId: 'chat-1',
        createdBy: 'user-1',
        maxUses: 10,
      })

      expect(result).toEqual(invite)
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('throws 403 when user does not have canAddUsers', async () => {
      const member = { role: 'member', canAddUsers: false }
      mockMembershipService.getMember.mockResolvedValue(member)

      await expect(
        service.createInvite({ chatId: 'chat-1', createdBy: 'user-1' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user is not a member at all', async () => {
      mockMembershipService.getMember.mockResolvedValue(null)

      await expect(
        service.createInvite({ chatId: 'chat-1', createdBy: 'stranger' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── joinByInvite ──────────────────────────────────────────────────────────

  describe('joinByInvite', () => {
    const validInvite = {
      id: 'invite-1',
      chatId: 'chat-1',
      createdBy: 'user-1',
      inviteHash: 'valid-hash',
      isRevoked: false,
      expiresAt: null,
      maxUses: null,
      usesCount: 0,
    }

    it('joins a chat via valid invite', async () => {
      mockDb.limit.mockResolvedValue([validInvite])
      mockMembershipService.isMember.mockResolvedValue(false)
      mockDb.transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx: any = {
          insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
          update: jest.fn().mockReturnValue({ set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) }),
        }
        return fn(tx)
      })

      const result = await service.joinByInvite('valid-hash', 'user-2')

      expect(result).toEqual({ chatId: 'chat-1', ok: true })
    })

    it('throws 404 when invite hash is not found', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.joinByInvite('bad-hash', 'user-2')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 410 when invite is revoked', async () => {
      mockDb.limit.mockResolvedValue([{ ...validInvite, isRevoked: true }])

      await expect(service.joinByInvite('valid-hash', 'user-2')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 410 when invite is expired', async () => {
      const expiredInvite = { ...validInvite, expiresAt: new Date(Date.now() - 1000) }
      mockDb.limit.mockResolvedValue([expiredInvite])

      await expect(service.joinByInvite('valid-hash', 'user-2')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 410 when invite has reached its use limit', async () => {
      const fullInvite = { ...validInvite, maxUses: 5, usesCount: 5 }
      mockDb.limit.mockResolvedValue([fullInvite])

      await expect(service.joinByInvite('valid-hash', 'user-2')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 409 when user is already a member', async () => {
      mockDb.limit.mockResolvedValue([validInvite])
      mockMembershipService.isMember.mockResolvedValue(true)

      await expect(service.joinByInvite('valid-hash', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── revokeInvite ──────────────────────────────────────────────────────────

  describe('revokeInvite', () => {
    it('revokes an invite when user has canAddUsers', async () => {
      const invite = { id: 'invite-1', chatId: 'chat-1', isRevoked: false }
      const member = { role: 'admin', canAddUsers: true }

      mockDb.limit.mockResolvedValue([invite])
      mockMembershipService.getMember.mockResolvedValue(member)

      const result = await service.revokeInvite('invite-1', 'user-1')

      expect(mockDb.update).toHaveBeenCalled()
      expect(result).toEqual({ ok: true })
    })

    it('throws 404 when invite is not found', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.revokeInvite('nonexistent', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user lacks canAddUsers', async () => {
      const invite = { id: 'invite-1', chatId: 'chat-1', isRevoked: false }
      const member = { role: 'member', canAddUsers: false }

      mockDb.limit.mockResolvedValue([invite])
      mockMembershipService.getMember.mockResolvedValue(member)

      await expect(service.revokeInvite('invite-1', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })
  })
})
