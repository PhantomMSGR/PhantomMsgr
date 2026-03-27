import { authApi } from '../auth'

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

const FAKE_USER = {
  id: 'u1',
  username: null,
  displayName: 'Alice',
  bio: null,
  avatarMediaId: null,
  isPremium: false,
  isVerified: false,
  isBot: false,
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  anonymousToken: 'abc'.repeat(22),
}

const FAKE_SESSION = {
  id: 's1',
  deviceName: 'Phone',
  platform: 'ios',
  appVersion: null,
  ipAddress: null,
  isActive: true,
  lastActiveAt: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
}

const FAKE_AUTH = {
  user: FAKE_USER,
  session: FAKE_SESSION,
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 900,
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => { jest.clearAllMocks() })

describe('authApi.register', () => {
  it('posts to /auth/register and unwraps data', async () => {
    mockApiClient.post.mockResolvedValue(wrap(FAKE_AUTH))

    const result = await authApi.register({
      displayName: 'Alice',
      platform: 'ios',
      deviceName: 'iPhone',
    })

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/register', {
      displayName: 'Alice',
      platform: 'ios',
      deviceName: 'iPhone',
    })
    expect(result).toEqual(FAKE_AUTH)
  })
})

describe('authApi.recover', () => {
  it('posts to /auth/recover', async () => {
    mockApiClient.post.mockResolvedValue(wrap(FAKE_AUTH))

    const result = await authApi.recover({
      anonymousToken: 'abc'.repeat(22),
      platform: 'android',
    })

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/recover', {
      anonymousToken: 'abc'.repeat(22),
      platform: 'android',
    })
    expect(result).toEqual(FAKE_AUTH)
  })
})

describe('authApi.refresh', () => {
  it('posts to /auth/refresh with refreshToken', async () => {
    mockApiClient.post.mockResolvedValue(wrap(FAKE_AUTH))

    const result = await authApi.refresh('my-refresh-token')

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'my-refresh-token',
    })
    expect(result.accessToken).toBe('at')
  })
})

describe('authApi.logout', () => {
  it('posts to /auth/logout', async () => {
    mockApiClient.post.mockResolvedValue({ data: {} })

    await authApi.logout()

    expect(mockApiClient.post).toHaveBeenCalledWith('/auth/logout')
  })
})

describe('authApi.getSessions', () => {
  it('gets /auth/sessions and returns unwrapped array', async () => {
    const sessions = [FAKE_SESSION]
    mockApiClient.get.mockResolvedValue(wrap(sessions))

    const result = await authApi.getSessions()

    expect(mockApiClient.get).toHaveBeenCalledWith('/auth/sessions')
    expect(result).toEqual(sessions)
  })
})

describe('authApi.revokeSession', () => {
  it('deletes /auth/sessions/:id', async () => {
    mockApiClient.delete.mockResolvedValue({ data: {} })

    await authApi.revokeSession('sess-123')

    expect(mockApiClient.delete).toHaveBeenCalledWith('/auth/sessions/sess-123')
  })
})
