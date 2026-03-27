import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { MembershipService } from './membership.service'
import { PermissionsService } from './permissions.service'
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
  $count: jest.fn().mockResolvedValue(2),
  onConflictDoUpdate: jest.fn().mockResolvedValue([]),
}

// Real PermissionsService — it has no dependencies
let permissionsService: PermissionsService

describe('MembershipService', () => {
  let service: MembershipService

  beforeEach(async () => {
    jest.clearAllMocks()
    // Re-apply default implementations (clearAllMocks doesn't reset them)
    mockDb.select.mockReturnThis()
    mockDb.from.mockReturnThis()
    mockDb.where.mockReturnThis()
    mockDb.limit.mockResolvedValue([])
    mockDb.insert.mockReturnThis()
    mockDb.values.mockReturnThis()
    mockDb.returning.mockResolvedValue([])
    mockDb.update.mockReturnThis()
    mockDb.set.mockReturnThis()
    mockDb.$count.mockResolvedValue(2)
    mockDb.onConflictDoUpdate.mockResolvedValue([])

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipService,
        PermissionsService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile()

    service = module.get<MembershipService>(MembershipService)
    permissionsService = module.get<PermissionsService>(PermissionsService)
  })

  // ─── getMember ─────────────────────────────────────────────────────────────

  describe('getMember', () => {
    it('returns a member when found', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'member', canSendMessages: true }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.getMember('chat-1', 'user-1')

      expect(result).toEqual(member)
    })

    it('returns null when member is not found', async () => {
      mockDb.limit.mockResolvedValue([])

      const result = await service.getMember('chat-1', 'stranger')

      expect(result).toBeNull()
    })
  })

  // ─── isMember ──────────────────────────────────────────────────────────────

  describe('isMember', () => {
    it('returns true for an active member', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'member' }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.isMember('chat-1', 'user-1')

      expect(result).toBe(true)
    })

    it('returns false when member has left', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'left' }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.isMember('chat-1', 'user-1')

      expect(result).toBe(false)
    })

    it('returns false when member is banned', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'banned' }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.isMember('chat-1', 'user-1')

      expect(result).toBe(false)
    })

    it('returns false when not a member at all', async () => {
      mockDb.limit.mockResolvedValue([])

      const result = await service.isMember('chat-1', 'stranger')

      expect(result).toBe(false)
    })
  })

  // ─── checkPermission ───────────────────────────────────────────────────────

  describe('checkPermission', () => {
    it('returns allowed true for member with permission', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'owner', canBanUsers: true }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.checkPermission('chat-1', 'user-1', 'canBanUsers')

      expect(result).toEqual({ allowed: true })
    })

    it('returns allowed false when member lacks permission', async () => {
      const member = { chatId: 'chat-1', userId: 'user-1', role: 'member', canBanUsers: false }
      mockDb.limit.mockResolvedValue([member])

      const result = await service.checkPermission('chat-1', 'user-1', 'canBanUsers')

      expect(result).toEqual({ allowed: false })
    })

    it('returns allowed false when not a member', async () => {
      mockDb.limit.mockResolvedValue([])

      const result = await service.checkPermission('chat-1', 'stranger', 'canSendMessages')

      expect(result).toEqual({ allowed: false })
    })
  })

  // ─── getMembers ────────────────────────────────────────────────────────────

  describe('getMembers', () => {
    it('returns members when requester is a member', async () => {
      const activeMember = { chatId: 'chat-1', userId: 'user-1', role: 'member' }
      const members = [activeMember, { chatId: 'chat-1', userId: 'user-2', role: 'admin' }]

      mockDb.select
        // First call: getMember (isMember check) — needs .from().where().limit()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([activeMember]),
            }),
          }),
        })
        // Second call: getMembers — returns directly from .from().where()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(members),
          }),
        })

      const result = await service.getMembers('chat-1', 'user-1')

      expect(result).toEqual(members)
    })

    it('throws 403 when requester is not a member', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.getMembers('chat-1', 'stranger')).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── addMember ─────────────────────────────────────────────────────────────

  describe('addMember', () => {
    it('adds a member when requester has canAddUsers', async () => {
      const requester = { chatId: 'chat-1', userId: 'admin-1', role: 'admin', canAddUsers: true }

      mockDb.select
        // 1st: getMember (requester permission check)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([requester]),
            }),
          }),
        })
        // 2nd: getMember (banned check for targetUserId — not banned)
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        // 3rd: count() query after insert
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ value: 1 }]),
          }),
        })

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue([]),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      const result = await service.addMember({
        chatId: 'chat-1',
        targetUserId: 'user-2',
        requestingUserId: 'admin-1',
      })

      expect(result).toEqual({ ok: true })
    })

    it('throws 403 when requester lacks canAddUsers', async () => {
      const requester = { chatId: 'chat-1', userId: 'user-1', role: 'member', canAddUsers: false }
      mockDb.limit.mockResolvedValue([requester])

      await expect(
        service.addMember({ chatId: 'chat-1', targetUserId: 'user-2', requestingUserId: 'user-1' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when requester is not a member', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(
        service.addMember({ chatId: 'chat-1', targetUserId: 'user-2', requestingUserId: 'stranger' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── removeMember ──────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('allows user to leave the chat themselves', async () => {
      // Self-leave: no permission check. Needs update + count select + update
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ value: 1 }]),
        }),
      })

      const result = await service.removeMember({
        chatId: 'chat-1',
        targetUserId: 'user-1',
        requestingUserId: 'user-1',
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(result).toEqual({ ok: true })
    })

    it('allows admin with canBanUsers to remove another member', async () => {
      const requester = { chatId: 'chat-1', userId: 'admin-1', role: 'owner', canBanUsers: true }

      mockDb.select
        // getMember for permission check
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([requester]),
            }),
          }),
        })
        // count() after update
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ value: 1 }]),
          }),
        })

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      const result = await service.removeMember({
        chatId: 'chat-1',
        targetUserId: 'user-2',
        requestingUserId: 'admin-1',
      })

      expect(result).toEqual({ ok: true })
    })

    it('throws 403 when requester cannot ban users', async () => {
      const requester = { chatId: 'chat-1', userId: 'user-1', role: 'member', canBanUsers: false }
      mockDb.limit.mockResolvedValue([requester])

      await expect(
        service.removeMember({ chatId: 'chat-1', targetUserId: 'user-2', requestingUserId: 'user-1' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── updateRole ────────────────────────────────────────────────────────────

  describe('updateRole', () => {
    it('updates role when requester is owner', async () => {
      const owner = { chatId: 'chat-1', userId: 'owner-1', role: 'owner' }
      mockDb.limit.mockResolvedValue([owner])

      const result = await service.updateRole({
        chatId: 'chat-1',
        targetUserId: 'user-2',
        requestingUserId: 'owner-1',
        role: 'admin',
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(result).toEqual({ ok: true })
    })

    it('throws 403 when requester is not owner', async () => {
      const admin = { chatId: 'chat-1', userId: 'admin-1', role: 'admin' }
      mockDb.limit.mockResolvedValue([admin])

      await expect(
        service.updateRole({ chatId: 'chat-1', targetUserId: 'user-2', requestingUserId: 'admin-1', role: 'admin' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── banMember ─────────────────────────────────────────────────────────────

  describe('banMember', () => {
    it('bans member when requester has canBanUsers', async () => {
      const requester = { chatId: 'chat-1', userId: 'owner-1', role: 'owner', canBanUsers: true }
      mockDb.limit.mockResolvedValue([requester])

      const result = await service.banMember({
        chatId: 'chat-1',
        targetUserId: 'user-2',
        requestingUserId: 'owner-1',
      })

      expect(result).toEqual({ ok: true })
    })

    it('throws 403 when requester lacks canBanUsers', async () => {
      const requester = { chatId: 'chat-1', userId: 'admin-1', role: 'admin', canBanUsers: false }
      mockDb.limit.mockResolvedValue([requester])

      await expect(
        service.banMember({ chatId: 'chat-1', targetUserId: 'user-2', requestingUserId: 'admin-1' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('bans member with an expiry date', async () => {
      const requester = { chatId: 'chat-1', userId: 'owner-1', role: 'owner', canBanUsers: true }
      mockDb.limit.mockResolvedValue([requester])

      const bannedUntil = new Date(Date.now() + 86400 * 1000)
      const result = await service.banMember({
        chatId: 'chat-1',
        targetUserId: 'user-2',
        requestingUserId: 'owner-1',
        bannedUntil,
      })

      expect(result).toEqual({ ok: true })
    })
  })
})
