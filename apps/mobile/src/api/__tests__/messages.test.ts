import { messagesApi } from '../messages'

// ─── Mock apiClient ───────────────────────────────────────────────────────────

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}

jest.mock('../client', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiClient.get(...args),
    post: (...args: any[]) => mockApiClient.post(...args),
    patch: (...args: any[]) => mockApiClient.patch(...args),
    delete: (...args: any[]) => mockApiClient.delete(...args),
  },
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(() => null),
  onForceLogout: jest.fn(() => () => {}),
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wrap<T>(data: T) {
  return { data: { data } }
}

const CHAT_ID = 'chat-1'
const MSG_ID = 'msg-1'

function fakeMessage(overrides = {}) {
  return {
    id: MSG_ID,
    chatId: CHAT_ID,
    senderId: 'user-1',
    type: 'text',
    text: 'Hello',
    mediaId: null,
    replyToMessageId: null,
    forwardFromMessageId: null,
    forwardFromChatId: null,
    forwardSenderName: null,
    isEdited: false,
    editedAt: null,
    isDeleted: false,
    deletedAt: null,
    deleteForEveryone: false,
    ttlSeconds: null,
    ttlExpiresAt: null,
    viewsCount: 0,
    forwardsCount: 0,
    repliesCount: 0,
    reactions: {},
    entities: [],
    isEncrypted: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { jest.clearAllMocks() })

describe('messagesApi.list', () => {
  it('fetches messages without cursor', async () => {
    const paginated = { items: [fakeMessage()], nextCursor: null, hasMore: false }
    mockApiClient.get.mockResolvedValue(wrap(paginated))

    const result = await messagesApi.list(CHAT_ID)

    expect(mockApiClient.get).toHaveBeenCalledWith(`/chats/${CHAT_ID}/messages`, {
      params: { limit: 30 },
    })
    expect(result).toEqual(paginated)
  })

  it('passes cursor and custom limit', async () => {
    const paginated = { items: [], nextCursor: null, hasMore: false }
    mockApiClient.get.mockResolvedValue(wrap(paginated))

    await messagesApi.list(CHAT_ID, 'cursor-xyz', 50)

    expect(mockApiClient.get).toHaveBeenCalledWith(`/chats/${CHAT_ID}/messages`, {
      params: { limit: 50, cursor: 'cursor-xyz' },
    })
  })
})

describe('messagesApi.send', () => {
  it('posts a text message and returns it', async () => {
    const message = fakeMessage()
    mockApiClient.post.mockResolvedValue(wrap(message))

    const result = await messagesApi.send(CHAT_ID, { text: 'Hello' })

    expect(mockApiClient.post).toHaveBeenCalledWith(`/chats/${CHAT_ID}/messages`, {
      type: 'text',
      text: 'Hello',
    })
    expect(result).toEqual(message)
  })
})

describe('messagesApi.edit', () => {
  it('patches message text', async () => {
    const edited = fakeMessage({ text: 'Edited', isEdited: true })
    mockApiClient.patch.mockResolvedValue(wrap(edited))

    const result = await messagesApi.edit(CHAT_ID, MSG_ID, { text: 'Edited' })

    expect(mockApiClient.patch).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}`,
      { text: 'Edited' },
    )
    expect(result.isEdited).toBe(true)
  })
})

describe('messagesApi.delete', () => {
  it('deletes for self by default', async () => {
    mockApiClient.delete.mockResolvedValue({ data: {} })

    await messagesApi.delete(CHAT_ID, MSG_ID)

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}`,
      { params: { forEveryone: 'false' } },
    )
  })

  it('deletes for everyone when flag is true', async () => {
    mockApiClient.delete.mockResolvedValue({ data: {} })

    await messagesApi.delete(CHAT_ID, MSG_ID, true)

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}`,
      { params: { forEveryone: 'true' } },
    )
  })
})

describe('messagesApi.react', () => {
  it('posts emoji reaction', async () => {
    const reactions = { '👍': 1 }
    mockApiClient.post.mockResolvedValue(wrap({ reactions }))

    const result = await messagesApi.react(CHAT_ID, MSG_ID, '👍')

    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}/react`,
      { emoji: '👍' },
    )
    expect(result.reactions).toEqual({ '👍': 1 })
  })
})

describe('messagesApi.removeReaction', () => {
  it('deletes reaction', async () => {
    mockApiClient.delete.mockResolvedValue(wrap({ reactions: {} }))

    const result = await messagesApi.removeReaction(CHAT_ID, MSG_ID)

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}/react`,
    )
    expect(result.reactions).toEqual({})
  })
})

describe('messagesApi.markRead', () => {
  it('posts to /read endpoint', async () => {
    mockApiClient.post.mockResolvedValue({ data: {} })

    await messagesApi.markRead(CHAT_ID, MSG_ID)

    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}/read`,
    )
  })
})

describe('messagesApi.pin', () => {
  it('posts to /pin endpoint', async () => {
    mockApiClient.post.mockResolvedValue({ data: {} })

    await messagesApi.pin(CHAT_ID, MSG_ID)

    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}/pin`,
    )
  })
})

describe('messagesApi.unpin', () => {
  it('deletes the pin', async () => {
    mockApiClient.delete.mockResolvedValue({ data: {} })

    await messagesApi.unpin(CHAT_ID, MSG_ID)

    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/chats/${CHAT_ID}/messages/${MSG_ID}/pin`,
    )
  })
})
