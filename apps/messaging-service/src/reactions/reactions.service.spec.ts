import { Test, TestingModule } from '@nestjs/testing'
import { ReactionsService } from './reactions.service'
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
  delete: jest.fn().mockReturnThis(),
  onConflictDoUpdate: jest.fn().mockResolvedValue([]),
}

const mockRedis = {
  publish: jest.fn().mockResolvedValue(1),
}

describe('ReactionsService', () => {
  let service: ReactionsService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReactionsService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile()

    service = module.get<ReactionsService>(ReactionsService)
  })

  // ─── addReaction ───────────────────────────────────────────────────────────

  describe('addReaction', () => {
    it('upserts reaction, updates message reactions cache, and publishes event', async () => {
      const reactionRows = [{ emoji: '👍' }, { emoji: '👍' }, { emoji: '❤️' }]
      const message = { chatId: 'chat-1' }
      const members = [{ userId: 'user-1' }, { userId: 'user-2' }]

      // insert upsert
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          onConflictDoUpdate: jest.fn().mockResolvedValue([]),
        }),
      })
      // buildReactionCounts select
      const selectSpy = jest.fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(reactionRows) }) }) // reaction rows
        .mockReturnValueOnce({ // update messages
          from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([message]) }) }),
        })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(members) }) })

      mockDb.select.mockImplementation(selectSpy)
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      const result = await service.addReaction({ messageId: 'msg-1', userId: 'user-1', emoji: '👍' })

      expect(result.reactions).toEqual({ '👍': 2, '❤️': 1 })
      expect(mockRedis.publish).toHaveBeenCalledWith('message.reaction.added', expect.any(String))
    })
  })

  // ─── removeReaction ────────────────────────────────────────────────────────

  describe('removeReaction', () => {
    it('deletes reaction and rebuilds reaction counts', async () => {
      const reactionRows = [{ emoji: '❤️' }]

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      })
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(reactionRows) }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      const result = await service.removeReaction('msg-1', 'user-1')

      expect(result.reactions).toEqual({ '❤️': 1 })
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('returns empty reactions when all reactions are removed', async () => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      })
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      const result = await service.removeReaction('msg-1', 'user-1')

      expect(result.reactions).toEqual({})
    })
  })
})
