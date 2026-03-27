import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { SessionService } from './session.service'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'

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
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
}

describe('SessionService', () => {
  let service: SessionService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<SessionService>(SessionService)
  })

  // ─── createSession ─────────────────────────────────────────────────────────

  describe('createSession', () => {
    it('inserts a new session and returns it', async () => {
      const session = {
        id: 'session-1',
        userId: 'user-1',
        tokenHash: '',
        platform: 'ios',
        deviceName: 'iPhone',
      }
      mockDb.returning.mockResolvedValue([session])

      const result = await service.createSession('user-1', { platform: 'ios', deviceName: 'iPhone' })

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', platform: 'ios', deviceName: 'iPhone' }),
      )
      expect(result).toEqual(session)
    })

    it('creates a session without optional fields', async () => {
      const session = { id: 'session-2', userId: 'user-1', tokenHash: '', platform: undefined, deviceName: undefined }
      mockDb.returning.mockResolvedValue([session])

      const result = await service.createSession('user-1', {})

      expect(result.id).toBe('session-2')
    })
  })

  // ─── revokeSession ─────────────────────────────────────────────────────────

  describe('revokeSession', () => {
    it('marks session inactive, sets revocation key, and removes active key', async () => {
      const session = { id: 'session-1', userId: 'user-1', isActive: true }
      mockDb.limit.mockResolvedValue([session])

      await service.revokeSession('session-1')

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockDb.set).toHaveBeenCalledWith({ isActive: false })
      expect(mockRedis.set).toHaveBeenCalledWith(
        'session:revoked:session-1',
        '1',
        'EX',
        expect.any(Number),
      )
      expect(mockRedis.del).toHaveBeenCalledWith('session:active:session-1')
    })

    it('throws 404 when session does not exist', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.revokeSession('nonexistent-session')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when requesting user does not own the session', async () => {
      const session = { id: 'session-1', userId: 'owner-user', isActive: true }
      mockDb.limit.mockResolvedValue([session])

      await expect(service.revokeSession('session-1', 'other-user')).rejects.toBeInstanceOf(RpcException)
    })

    it('allows owner to revoke their own session', async () => {
      const session = { id: 'session-1', userId: 'user-1', isActive: true }
      mockDb.limit.mockResolvedValue([session])

      await expect(service.revokeSession('session-1', 'user-1')).resolves.toBeUndefined()
    })
  })

  // ─── getUserSessions ───────────────────────────────────────────────────────

  describe('getUserSessions', () => {
    it('returns all active sessions for the user', async () => {
      const sessions = [
        { id: 's-1', deviceName: 'iPhone', platform: 'ios' },
        { id: 's-2', deviceName: 'Chrome', platform: 'web' },
      ]
      // getUserSessions returns a query builder (promise-like), mock the chain
      const queryResult = Promise.resolve(sessions)
      mockDb.where.mockReturnValue(queryResult)

      const result = await service.getUserSessions('user-1')

      expect(result).toEqual(sessions)
    })
  })
})
