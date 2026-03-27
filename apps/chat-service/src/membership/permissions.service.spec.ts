import { Test, TestingModule } from '@nestjs/testing'
import { PermissionsService } from './permissions.service'

describe('PermissionsService', () => {
  let service: PermissionsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionsService],
    }).compile()

    service = module.get<PermissionsService>(PermissionsService)
  })

  // ─── getDefaultPermissions ────────────────────────────────────────────────

  describe('getDefaultPermissions', () => {
    it('returns all permissions true for owner', () => {
      const perms = service.getDefaultPermissions('owner')

      expect(perms.canSendMessages).toBe(true)
      expect(perms.canSendMedia).toBe(true)
      expect(perms.canSendPolls).toBe(true)
      expect(perms.canAddUsers).toBe(true)
      expect(perms.canPinMessages).toBe(true)
      expect(perms.canManageChat).toBe(true)
      expect(perms.canDeleteMessages).toBe(true)
      expect(perms.canBanUsers).toBe(true)
    })

    it('returns admin permissions with canBanUsers false', () => {
      const perms = service.getDefaultPermissions('admin')

      expect(perms.canSendMessages).toBe(true)
      expect(perms.canManageChat).toBe(true)
      expect(perms.canBanUsers).toBe(false)
    })

    it('returns member permissions with only send permissions', () => {
      const perms = service.getDefaultPermissions('member')

      expect(perms.canSendMessages).toBe(true)
      expect(perms.canSendMedia).toBe(true)
      expect(perms.canSendPolls).toBe(true)
      expect(perms.canAddUsers).toBe(false)
      expect(perms.canPinMessages).toBe(false)
      expect(perms.canManageChat).toBe(false)
      expect(perms.canDeleteMessages).toBe(false)
      expect(perms.canBanUsers).toBe(false)
    })

    it('returns all false for restricted role', () => {
      const perms = service.getDefaultPermissions('restricted')

      Object.values(perms).forEach((v) => expect(v).toBe(false))
    })

    it('returns all false for left role', () => {
      const perms = service.getDefaultPermissions('left')

      Object.values(perms).forEach((v) => expect(v).toBe(false))
    })

    it('returns all false for banned role', () => {
      const perms = service.getDefaultPermissions('banned')

      Object.values(perms).forEach((v) => expect(v).toBe(false))
    })
  })

  // ─── hasPermission ─────────────────────────────────────────────────────────

  describe('hasPermission', () => {
    it('returns false when member is null', () => {
      expect(service.hasPermission(null, 'canSendMessages')).toBe(false)
    })

    it('returns false for banned member', () => {
      const member = { role: 'banned', canSendMessages: true } as any
      expect(service.hasPermission(member, 'canSendMessages')).toBe(false)
    })

    it('returns false for left member', () => {
      const member = { role: 'left', canSendMessages: true } as any
      expect(service.hasPermission(member, 'canSendMessages')).toBe(false)
    })

    it('returns true for owner with canBanUsers', () => {
      const member = { role: 'owner', canBanUsers: true } as any
      expect(service.hasPermission(member, 'canBanUsers')).toBe(true)
    })

    it('returns false for member without canAddUsers', () => {
      const member = { role: 'member', canAddUsers: false } as any
      expect(service.hasPermission(member, 'canAddUsers')).toBe(false)
    })

    it('returns true for admin with canManageChat', () => {
      const member = { role: 'admin', canManageChat: true } as any
      expect(service.hasPermission(member, 'canManageChat')).toBe(true)
    })

    it('returns false when permission flag is false despite active role', () => {
      const member = { role: 'admin', canBanUsers: false } as any
      expect(service.hasPermission(member, 'canBanUsers')).toBe(false)
    })
  })
})
