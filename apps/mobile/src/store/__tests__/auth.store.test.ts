import { act } from '@testing-library/react-native'
import { useAuthStore } from '../auth.store'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSdk = {
  onForceLogout: jest.fn(() => () => {}),
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(() => null),
  auth: {
    register: jest.fn(),
    recover: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  },
  users: {
    getMe: jest.fn(),
    deleteAccount: jest.fn(),
  },
}

const mockStorage = {
  getRefreshToken: jest.fn(),
  setRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  getAnonymousToken: jest.fn(),
  setAnonymousToken: jest.fn(),
  deleteAnonymousToken: jest.fn(),
}

jest.mock('@/lib/sdk', () => ({
  sdk: mockSdk,
  mobileTokenStorage: mockStorage,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FAKE_USER = {
  id: 'user-1',
  username: null,
  displayName: 'Alice',
  bio: null,
  avatarMediaId: null,
  avatarEmoji: null,
  avatarColor: null,
  isPremium: false,
  isVerified: false,
  isBot: false,
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const FAKE_AUTH_RESPONSE = {
  user: { ...FAKE_USER, anonymousToken: 'abcdef01'.repeat(8) },
  session: {
    id: 'sess-1',
    deviceName: 'iPhone',
    platform: 'ios' as const,
    appVersion: null,
    ipAddress: null,
    isActive: true,
    lastActiveAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
  },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiresIn: 900,
}

function resetStore() {
  useAuthStore.setState({ user: null, isAuthenticated: false, isInitializing: true })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  resetStore()
  mockStorage.getRefreshToken.mockResolvedValue(null)
  mockStorage.setRefreshToken.mockResolvedValue(undefined)
  mockStorage.deleteRefreshToken.mockResolvedValue(undefined)
  mockStorage.setAnonymousToken.mockResolvedValue(undefined)
  mockStorage.deleteAnonymousToken.mockResolvedValue(undefined)
})

describe('initialize', () => {
  it('sets isInitializing=false when no stored refresh token', async () => {
    mockStorage.getRefreshToken.mockResolvedValue(null)

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isInitializing).toBe(false)
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('restores session when refresh token is stored', async () => {
    mockStorage.getRefreshToken.mockResolvedValue('stored-refresh')
    mockSdk.auth.refresh.mockResolvedValue(FAKE_AUTH_RESPONSE)
    mockSdk.users.getMe.mockResolvedValue(FAKE_USER)

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_USER)
    expect(state.isInitializing).toBe(false)
    expect(mockSdk.setAccessToken).toHaveBeenCalledWith('access-token')
  })

  it('clears tokens and sets unauthenticated when refresh fails', async () => {
    mockStorage.getRefreshToken.mockResolvedValue('bad-token')
    mockSdk.auth.refresh.mockRejectedValue(new Error('Unauthorized'))

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.isInitializing).toBe(false)
    expect(mockStorage.deleteRefreshToken).toHaveBeenCalled()
  })
})

describe('register', () => {
  it('registers, stores tokens, and returns anonymousToken', async () => {
    mockSdk.auth.register.mockResolvedValue(FAKE_AUTH_RESPONSE)

    let result: { anonymousToken: string } | undefined
    await act(async () => {
      result = await useAuthStore.getState().register('Alice', 'iPhone')
    })

    expect(result?.anonymousToken).toBe(FAKE_AUTH_RESPONSE.user.anonymousToken)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_AUTH_RESPONSE.user)
    expect(mockStorage.setRefreshToken).toHaveBeenCalledWith('refresh-token')
  })

  it('propagates API errors', async () => {
    mockSdk.auth.register.mockRejectedValue(new Error('Server error'))

    await expect(
      act(async () => { await useAuthStore.getState().register('Alice') }),
    ).rejects.toThrow('Server error')
  })
})

describe('recover', () => {
  it('recovers account and authenticates', async () => {
    mockSdk.auth.recover.mockResolvedValue(FAKE_AUTH_RESPONSE)
    const token = 'abcdef01'.repeat(8)

    await act(async () => {
      await useAuthStore.getState().recover(token)
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_AUTH_RESPONSE.user)
    expect(mockStorage.setAnonymousToken).toHaveBeenCalledWith(token)
  })
})

describe('logout', () => {
  it('clears state and tokens', async () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true })
    mockSdk.auth.logout.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(mockSdk.setAccessToken).toHaveBeenCalledWith(null)
    expect(mockStorage.deleteRefreshToken).toHaveBeenCalled()
  })

  it('still clears state even if API call fails', async () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true })
    mockSdk.auth.logout.mockRejectedValue(new Error('Network'))

    await act(async () => {
      await useAuthStore.getState().logout()
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})

describe('updateUser', () => {
  it('merges partial update into current user', () => {
    useAuthStore.setState({ user: FAKE_USER })

    act(() => {
      useAuthStore.getState().updateUser({ displayName: 'Bob' })
    })

    expect(useAuthStore.getState().user?.displayName).toBe('Bob')
    expect(useAuthStore.getState().user?.id).toBe('user-1')
  })

  it('is a no-op when user is null', () => {
    useAuthStore.setState({ user: null })

    act(() => {
      useAuthStore.getState().updateUser({ displayName: 'Bob' })
    })

    expect(useAuthStore.getState().user).toBeNull()
  })
})
