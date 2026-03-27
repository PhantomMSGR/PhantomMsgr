import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { AuthService } from './auth.service'
import { TokenService } from './token/token.service'
import { SessionService } from './session/session.service'
import { DRIZZLE } from '@phantom/database'

// Mock @phantom/auth so generateAnonymousToken is predictable
jest.mock('@phantom/auth', () => ({
  generateAnonymousToken: jest.fn().mockReturnValue('mock-anon-token-hex'),
  hashToken: jest.fn((t: string) => `hashed:${t}`),
}))

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

const mockTokenService = {
  issueTokens: jest.fn(),
  rotateRefreshToken: jest.fn(),
}

const mockSessionService = {
  createSession: jest.fn(),
  revokeSession: jest.fn(),
  getUserSessions: jest.fn(),
}

describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: TokenService, useValue: mockTokenService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates user, session, and issues tokens on success', async () => {
      const newUser = { id: 'user-1', displayName: 'Alice', anonymousToken: 'mock-anon-token-hex' }
      const session = { id: 'session-1', deviceName: 'iPhone', platform: 'ios' }
      const tokens = { accessToken: 'at', refreshToken: 'rt', expiresAt: new Date() }

      // transaction calls the callback with a tx object
      mockDb.transaction.mockImplementation(async (fn: (tx: typeof mockDb) => any) => {
        const tx = {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          returning: jest.fn().mockResolvedValue([newUser]),
        }
        // userSettings and userStatus inserts return nothing meaningful
        const txChain = {
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockResolvedValue([]),
        }
        tx.returning.mockResolvedValueOnce([newUser])
        // Subsequent insert().values() for userSettings / userStatus
        Object.assign(tx, {
          insert: jest.fn((table: unknown) => ({
            values: jest.fn().mockResolvedValue([]),
            returning: jest.fn().mockResolvedValue([newUser]),
          })),
        })
        return fn(tx)
      })

      mockSessionService.createSession.mockResolvedValue(session)
      mockTokenService.issueTokens.mockResolvedValue(tokens)

      // Provide a simpler transaction mock that directly returns the user
      mockDb.transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx: any = {}
        tx.insert = jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValueOnce([newUser]).mockResolvedValue([]),
          }),
        })
        return fn(tx)
      })

      const result = await service.register({
        displayName: 'Alice',
        platform: 'ios',
        deviceName: 'iPhone',
      })

      expect(result.user.id).toBe('user-1')
      expect(result.user.displayName).toBe('Alice')
      expect(result.user.anonymousToken).toBe('mock-anon-token-hex')
      expect(result.session.id).toBe('session-1')
      expect(result.accessToken).toBe('at')
      expect(result.refreshToken).toBe('rt')
      expect(mockSessionService.createSession).toHaveBeenCalledWith('user-1', {
        platform: 'ios',
        deviceName: 'iPhone',
      })
      expect(mockTokenService.issueTokens).toHaveBeenCalledWith('user-1', 'session-1')
    })
  })

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('delegates to tokenService.rotateRefreshToken', async () => {
      const tokens = { accessToken: 'new-at', refreshToken: 'new-rt', expiresAt: new Date() }
      mockTokenService.rotateRefreshToken.mockResolvedValue(tokens)

      const result = await service.refresh('old-refresh-token')

      expect(mockTokenService.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token')
      expect(result).toEqual(tokens)
    })
  })

  // ─── recover ───────────────────────────────────────────────────────────────

  describe('recover', () => {
    it('returns user, session and tokens when anonymous token is valid', async () => {
      const user = { id: 'user-2', displayName: 'Bob', anonymousToken: 'valid-token', isDeleted: false }
      const session = { id: 'session-2' }
      const tokens = { accessToken: 'at2', refreshToken: 'rt2', expiresAt: new Date() }

      mockDb.limit.mockResolvedValue([user])
      mockSessionService.createSession.mockResolvedValue(session)
      mockTokenService.issueTokens.mockResolvedValue(tokens)

      const result = await service.recover({ anonymousToken: 'valid-token', platform: 'web' })

      expect(result.user.id).toBe('user-2')
      expect(result.session.id).toBe('session-2')
      expect(result.accessToken).toBe('at2')
    })

    it('throws 401 when anonymous token is not found', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(
        service.recover({ anonymousToken: 'bad-token', platform: 'web' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when account is deleted', async () => {
      const user = { id: 'user-3', displayName: 'Gone', anonymousToken: 'valid-token', isDeleted: true }
      mockDb.limit.mockResolvedValue([user])

      await expect(
        service.recover({ anonymousToken: 'valid-token', platform: 'web' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes the session and returns ok', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined)

      const result = await service.logout('session-1')

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-1')
      expect(result).toEqual({ ok: true })
    })
  })

  // ─── verify2fa ─────────────────────────────────────────────────────────────

  describe('verify2fa', () => {
    it('returns verified when 2FA is enabled', async () => {
      const settings = { userId: 'user-1', twoFactorEnabled: true }
      mockDb.limit.mockResolvedValue([settings])

      const result = await service.verify2fa('user-1', '123456')

      expect(result).toEqual({ verified: true })
    })

    it('throws 400 when 2FA is not enabled', async () => {
      const settings = { userId: 'user-1', twoFactorEnabled: false }
      mockDb.limit.mockResolvedValue([settings])

      await expect(service.verify2fa('user-1', '000000')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 400 when settings are missing', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.verify2fa('user-1', '000000')).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── getSessions ───────────────────────────────────────────────────────────

  describe('getSessions', () => {
    it('delegates to sessionService.getUserSessions', async () => {
      const sessions = [{ id: 's-1' }, { id: 's-2' }]
      mockSessionService.getUserSessions.mockResolvedValue(sessions)

      const result = await service.getSessions('user-1')

      expect(mockSessionService.getUserSessions).toHaveBeenCalledWith('user-1')
      expect(result).toEqual(sessions)
    })
  })

  // ─── revokeSession ─────────────────────────────────────────────────────────

  describe('revokeSession', () => {
    it('revokes session for requesting user and returns ok', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined)

      const result = await service.revokeSession('session-1', 'user-1')

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith('session-1', 'user-1')
      expect(result).toEqual({ ok: true })
    })
  })
})
