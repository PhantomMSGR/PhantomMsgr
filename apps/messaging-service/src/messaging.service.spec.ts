import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { MessagingService } from './messaging.service'
import { TtlService } from './ttl/ttl.service'
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
  orderBy: jest.fn().mockReturnThis(),
  $count: jest.fn().mockResolvedValue(1),
}

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  publish: jest.fn().mockResolvedValue(1),
}

const mockTtlService = {
  scheduleExpiry: jest.fn().mockResolvedValue(undefined),
}

const baseMessage = {
  id: 'msg-1',
  chatId: 'chat-1',
  senderId: 'user-1',
  type: 'text',
  text: 'Hello',
  mediaId: null,
  replyToMessageId: null,
  isDeleted: false,
  isEdited: false,
  editedAt: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
}

describe('MessagingService', () => {
  let service: MessagingService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: TtlService, useValue: mockTtlService },
      ],
    }).compile()

    service = module.get<MessagingService>(MessagingService)
  })

  // ─── sendMessage ───────────────────────────────────────────────────────────

  describe('sendMessage', () => {
    it('inserts a message, updates chat, and publishes event', async () => {
      const activeMember = { role: 'member', canSendMessages: true }
      const members = [{ userId: 'user-1' }, { userId: 'user-2' }]

      mockDb.select
        // 1st: membership check → .from().where().limit()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([activeMember]),
            }),
          }),
        })
        // 2nd: chat members for fanout → .from().where()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(members),
          }),
        })

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([baseMessage]),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      })

      const result = await service.sendMessage({
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Hello',
      })

      expect(result).toEqual(baseMessage)
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'message.created',
        expect.any(String),
      )
    })

    it('schedules TTL when ttlSeconds is provided', async () => {
      const msgWithTtl = { ...baseMessage, ttlSeconds: 60, ttlExpiresAt: new Date() }
      const activeMember = { role: 'member', canSendMessages: true }

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([activeMember]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
        })

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([msgWithTtl]),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      await service.sendMessage({
        chatId: 'chat-1',
        senderId: 'user-1',
        text: 'Disappearing',
        ttlSeconds: 60,
      })

      expect(mockTtlService.scheduleExpiry).toHaveBeenCalledWith('msg-1', 60)
    })

    it('does not schedule TTL when ttlSeconds is not provided', async () => {
      const activeMember = { role: 'member', canSendMessages: true }

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([activeMember]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
        })

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([baseMessage]),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })

      await service.sendMessage({ chatId: 'chat-1', senderId: 'user-1', text: 'Hello' })

      expect(mockTtlService.scheduleExpiry).not.toHaveBeenCalled()
    })
  })

  // ─── editMessage ───────────────────────────────────────────────────────────

  describe('editMessage', () => {
    it('updates message text and publishes edited event', async () => {
      const updatedMsg = { ...baseMessage, text: 'Edited', isEdited: true, editedAt: new Date() }
      const members = [{ userId: 'user-1' }]

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValueOnce([baseMessage]),
          }),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedMsg]),
          }),
        }),
      })
      // members query
      const selectSpy = jest.fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([baseMessage]) }) }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(members) }) })
      mockDb.select.mockImplementation(selectSpy)

      const result = await service.editMessage({
        messageId: 'msg-1',
        userId: 'user-1',
        text: 'Edited',
      })

      expect(result).toEqual(updatedMsg)
      expect(mockRedis.publish).toHaveBeenCalledWith('message.edited', expect.any(String))
    })

    it('throws 404 when message is not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

      await expect(
        service.editMessage({ messageId: 'bad-id', userId: 'user-1', text: 'X' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user tries to edit another user message', async () => {
      const otherMessage = { ...baseMessage, senderId: 'user-2' }
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([otherMessage]),
          }),
        }),
      })

      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'user-1', text: 'Hacked' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 410 when message is already deleted', async () => {
      const deletedMsg = { ...baseMessage, isDeleted: true }
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([deletedMsg]),
          }),
        }),
      })

      await expect(
        service.editMessage({ messageId: 'msg-1', userId: 'user-1', text: 'X' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── deleteMessage ─────────────────────────────────────────────────────────

  describe('deleteMessage', () => {
    it('deletes own message for everyone and publishes event', async () => {
      const members = [{ userId: 'user-1' }]

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([baseMessage]),
          }),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })
      // Second select for members
      const selectSpy = jest.fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([baseMessage]) }) }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(members) }) })
      mockDb.select.mockImplementation(selectSpy)

      const result = await service.deleteMessage({
        messageId: 'msg-1',
        userId: 'user-1',
        forEveryone: true,
      })

      expect(result).toEqual({ ok: true })
      expect(mockRedis.publish).toHaveBeenCalledWith('message.deleted', expect.any(String))
    })

    it('throws 404 when message is not found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

      await expect(
        service.deleteMessage({ messageId: 'bad-id', userId: 'user-1' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user tries to delete for everyone a message they do not own', async () => {
      const otherMessage = { ...baseMessage, senderId: 'user-2' }
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([otherMessage]),
          }),
        }),
      })

      await expect(
        service.deleteMessage({ messageId: 'msg-1', userId: 'user-1', forEveryone: true }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('allows delete for own message only (forEveryone=false)', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([baseMessage]),
          }),
        }),
      })
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
      })
      const selectSpy = jest.fn()
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([baseMessage]) }) }) })
        .mockReturnValueOnce({ from: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }) })
      mockDb.select.mockImplementation(selectSpy)

      const result = await service.deleteMessage({ messageId: 'msg-1', userId: 'user-1', forEveryone: false })
      expect(result).toEqual({ ok: true })
    })
  })

  // ─── getHistory ────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns messages with cursor pagination', async () => {
      const messages = Array.from({ length: 5 }, (_, i) => ({
        ...baseMessage,
        id: `msg-${i}`,
        createdAt: new Date(`2024-01-0${5 - i}T00:00:00Z`),
      }))

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(messages),
            }),
          }),
        }),
      })

      const result = await service.getHistory({ chatId: 'chat-1', userId: 'user-1', limit: 10 })

      expect(result.items).toHaveLength(5)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('returns hasMore=true when results exceed limit', async () => {
      const messages = Array.from({ length: 6 }, (_, i) => ({
        ...baseMessage,
        id: `msg-${i}`,
        createdAt: new Date(`2024-01-0${6 - i}T00:00:00Z`),
      }))

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(messages),
            }),
          }),
        }),
      })

      const result = await service.getHistory({ chatId: 'chat-1', userId: 'user-1', limit: 5 })

      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).not.toBeNull()
      expect(result.items).toHaveLength(5)
    })
  })

  // ─── getMessageById ────────────────────────────────────────────────────────

  describe('getMessageById', () => {
    it('returns message when found', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([baseMessage]),
          }),
        }),
      })

      const result = await service.getMessageById('msg-1', 'user-1')
      expect(result).toEqual(baseMessage)
    })

    it('throws 404 when message is not found or deleted', async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

      await expect(service.getMessageById('bad-id', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── onMediaProcessed ──────────────────────────────────────────────────────

  describe('onMediaProcessed', () => {
    it('updates media row with processed data', async () => {
      const mockSet = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) })
      mockDb.update.mockReturnValue({ set: mockSet })

      await service.onMediaProcessed({
        mediaId: 'media-1',
        thumbnailKey: 'thumb/key',
        thumbnailUrl: 'https://cdn.example.com/thumb',
        width: 1920,
        height: 1080,
        duration: null,
        waveform: null,
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ thumbnailKey: 'thumb/key', width: 1920 }),
      )
    })
  })
})
