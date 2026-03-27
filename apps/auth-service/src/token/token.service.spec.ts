import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import { RpcException } from '@nestjs/microservices'
import { TokenService } from './token.service'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'

jest.mock('@phantom/auth', () => ({
  hashToken: jest.fn((t: string) => `hashed:${t}`),
}))

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  sadd: jest.fn().mockResolvedValue(1),
  srem: jest.fn().mockResolvedValue(1),
  scard: jest.fn().mockResolvedValue(0),
  publish: jest.fn().mockResolvedValue(1),
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-access-token'),
}

describe('TokenService', () => {
  let service: TokenService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile()

    service = module.get<TokenService>(TokenService)
  })

  // ─── issueTokens ───────────────────────────────────────────────────────────

  describe('issueTokens', () => {
    it('signs access token, stores hash in DB, caches in Redis, and returns tokens', async () => {
      const result = await service.issueTokens('user-1', 'session-1')

      expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: 'user-1', sid: 'session-1' })
      expect(result.accessToken).toBe('signed-access-token')
      expect(typeof result.refreshToken).toBe('string')
      expect(result.refreshToken.length).toBeGreaterThan(0)
      expect(result.expiresAt).toBeInstanceOf(Date)

      // DB: updates session with token hash
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalled()

      // Redis: caches the active session
      expect(mockRedis.set).toHaveBeenCalledWith(
        `session:active:session-1`,
        'user-1',
        'EX',
        expect.any(Number),
      )
    })

    it('generates a unique refresh token on each call', async () => {
      const result1 = await service.issueTokens('user-1', 'session-1')
      const result2 = await service.issueTokens('user-1', 'session-1')

      expect(result1.refreshToken).not.toBe(result2.refreshToken)
    })
  })

  // ─── rotateRefreshToken ────────────────────────────────────────────────────

  describe('rotateRefreshToken', () => {
    it('returns new tokens when a valid active session is found', async () => {
      const session = { id: 'session-1', userId: 'user-1', isActive: true, tokenHash: 'hashed:old-token' }
      mockDb.limit.mockResolvedValue([session])

      const result = await service.rotateRefreshToken('old-token')

      expect(mockRedis.del).toHaveBeenCalledWith('session:active:session-1')
      expect(result.accessToken).toBe('signed-access-token')
      expect(typeof result.refreshToken).toBe('string')
    })

    it('throws RpcException 401 when no session is found for token hash', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.rotateRefreshToken('invalid-token')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws RpcException 401 when session is inactive', async () => {
      const session = { id: 'session-1', userId: 'user-1', isActive: false }
      mockDb.limit.mockResolvedValue([session])

      await expect(service.rotateRefreshToken('revoked-token')).rejects.toBeInstanceOf(RpcException)
    })
  })
})
