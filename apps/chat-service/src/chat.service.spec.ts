import { Test, TestingModule } from '@nestjs/testing'
import { RpcException } from '@nestjs/microservices'
import { ChatService } from './chat.service'
import { MembershipService } from './membership/membership.service'
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
  orderBy: jest.fn().mockReturnThis(),
  transaction: jest.fn(),
  $count: jest.fn().mockResolvedValue(1),
}

const mockMembershipService = {
  isMember: jest.fn(),
  getMember: jest.fn(),
}

const baseChat = {
  id: 'chat-1',
  type: 'group',
  title: 'Test Group',
  description: 'A test group',
  isPublic: false,
  createdBy: 'user-1',
  inviteHash: 'abc123',
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  memberCount: 1,
}

describe('ChatService', () => {
  let service: ChatService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: DRIZZLE, useValue: mockDb },
        { provide: MembershipService, useValue: mockMembershipService },
      ],
    }).compile()

    service = module.get<ChatService>(ChatService)
  })

  // ─── createChat ────────────────────────────────────────────────────────────

  describe('createChat', () => {
    it('creates a group chat with owner membership', async () => {
      const newChat = { ...baseChat, id: 'chat-new' }
      mockDb.transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx: any = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValueOnce([newChat]).mockResolvedValue([]),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([]),
            }),
          }),
        }
        return fn(tx)
      })

      const result = await service.createChat({
        type: 'group',
        title: 'Test Group',
        createdBy: 'user-1',
      })

      expect(result).toEqual(newChat)
    })

    it('creates a saved chat without creator membership', async () => {
      const savedChat = { ...baseChat, id: 'saved-1', type: 'saved', createdBy: null }
      mockDb.transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx: any = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValueOnce([savedChat]).mockResolvedValue([]),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([]),
            }),
          }),
        }
        return fn(tx)
      })

      const result = await service.createChat({
        type: 'saved',
        createdBy: 'user-1',
      })

      expect(result.type).toBe('saved')
    })

    it('creates a group chat with initial members', async () => {
      const newChat = { ...baseChat, id: 'chat-members' }
      mockDb.transaction.mockImplementation(async (fn: (tx: any) => any) => {
        const tx: any = {
          insert: jest.fn().mockReturnValue({
            values: jest.fn().mockReturnValue({
              returning: jest.fn().mockResolvedValueOnce([newChat]).mockResolvedValue([]),
            }),
          }),
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([]),
            }),
          }),
        }
        return fn(tx)
      })

      const result = await service.createChat({
        type: 'group',
        createdBy: 'user-1',
        memberIds: ['user-2', 'user-3'],
      })

      expect(result).toEqual(newChat)
    })
  })

  // ─── getChatById ───────────────────────────────────────────────────────────

  describe('getChatById', () => {
    it('returns a public chat without membership check', async () => {
      const chat = { ...baseChat, isPublic: true }
      mockDb.limit.mockResolvedValue([chat])

      const result = await service.getChatById('chat-1', 'user-2')

      expect(mockMembershipService.isMember).not.toHaveBeenCalled()
      expect(result).toEqual(chat)
    })

    it('returns a private chat when user is a member', async () => {
      const chat = { ...baseChat, isPublic: false }
      mockDb.limit.mockResolvedValue([chat])
      mockMembershipService.isMember.mockResolvedValue(true)

      const result = await service.getChatById('chat-1', 'user-1')

      expect(result).toEqual(chat)
    })

    it('throws 404 when chat does not exist', async () => {
      mockDb.limit.mockResolvedValue([])

      await expect(service.getChatById('nonexistent', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user is not a member of a private chat', async () => {
      const chat = { ...baseChat, isPublic: false }
      mockDb.limit.mockResolvedValue([chat])
      mockMembershipService.isMember.mockResolvedValue(false)

      await expect(service.getChatById('chat-1', 'stranger')).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── getUserChats ──────────────────────────────────────────────────────────

  describe('getUserChats', () => {
    it('returns empty result when user is in no chats', async () => {
      mockDb.where.mockResolvedValue([]) // memberRows

      const result = await service.getUserChats('user-1')

      expect(result).toEqual({ items: [], nextCursor: null, hasMore: false })
    })

    it('returns chats with cursor-based pagination', async () => {
      const memberRows = [{ chatId: 'chat-1' }, { chatId: 'chat-2' }]
      const chats = [
        { ...baseChat, id: 'chat-1', updatedAt: new Date('2024-01-02T00:00:00Z') },
        { ...baseChat, id: 'chat-2', updatedAt: new Date('2024-01-01T00:00:00Z') },
      ]

      // First call: memberRows, second call: chats
      mockDb.where
        .mockResolvedValueOnce(memberRows)
        .mockReturnThis()
      mockDb.orderBy.mockReturnThis()
      mockDb.limit.mockResolvedValue(chats)

      const result = await service.getUserChats('user-1', undefined, 20)

      expect(result.items).toHaveLength(2)
      expect(result.hasMore).toBe(false)
    })

    it('sets hasMore and nextCursor when results exceed limit', async () => {
      const memberRows = [{ chatId: 'chat-1' }]

      // Build 3 chats, but limit is 2 — so hasMore should be true
      const chats = Array.from({ length: 3 }, (_, i) => ({
        ...baseChat,
        id: `chat-${i}`,
        updatedAt: new Date(`2024-01-0${3 - i}T00:00:00Z`),
      }))

      mockDb.where
        .mockResolvedValueOnce(memberRows)
        .mockReturnThis()
      mockDb.orderBy.mockReturnThis()
      mockDb.limit.mockResolvedValue(chats)

      const result = await service.getUserChats('user-1', undefined, 2)

      expect(result.hasMore).toBe(true)
      expect(result.nextCursor).not.toBeNull()
      expect(result.items).toHaveLength(2)
    })
  })

  // ─── updateChat ────────────────────────────────────────────────────────────

  describe('updateChat', () => {
    it('updates chat when user has canManageChat permission', async () => {
      const member = { role: 'admin', canManageChat: true }
      const updated = { ...baseChat, title: 'New Title' }

      mockMembershipService.getMember.mockResolvedValue(member)
      mockDb.returning.mockResolvedValue([updated])

      const result = await service.updateChat({
        chatId: 'chat-1',
        userId: 'user-1',
        title: 'New Title',
      })

      expect(result).toEqual(updated)
    })

    it('throws 403 when user lacks canManageChat permission', async () => {
      const member = { role: 'member', canManageChat: false }
      mockMembershipService.getMember.mockResolvedValue(member)

      await expect(
        service.updateChat({ chatId: 'chat-1', userId: 'user-1', title: 'New Title' }),
      ).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user is not a member', async () => {
      mockMembershipService.getMember.mockResolvedValue(null)

      await expect(
        service.updateChat({ chatId: 'chat-1', userId: 'stranger', title: 'Hack' }),
      ).rejects.toBeInstanceOf(RpcException)
    })
  })

  // ─── deleteChat ────────────────────────────────────────────────────────────

  describe('deleteChat', () => {
    it('deletes chat when user is owner', async () => {
      const member = { role: 'owner' }
      mockMembershipService.getMember.mockResolvedValue(member)

      const result = await service.deleteChat('chat-1', 'user-1')

      expect(mockDb.delete).toHaveBeenCalled()
      expect(result).toEqual({ ok: true })
    })

    it('throws 403 when user is not owner', async () => {
      const member = { role: 'admin' }
      mockMembershipService.getMember.mockResolvedValue(member)

      await expect(service.deleteChat('chat-1', 'user-1')).rejects.toBeInstanceOf(RpcException)
    })

    it('throws 403 when user is not a member', async () => {
      mockMembershipService.getMember.mockResolvedValue(null)

      await expect(service.deleteChat('chat-1', 'stranger')).rejects.toBeInstanceOf(RpcException)
    })
  })
})
