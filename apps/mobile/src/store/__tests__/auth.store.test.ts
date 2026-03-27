import { act } from '@testing-library/react-native'
import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from '../auth.store'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/api/auth', () => ({
  authApi: {
    register: jest.fn(),
    recover: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  },
}))

jest.mock('@/api/users', () => ({
  usersApi: {
    getMe: jest.fn(),
  },
}))

jest.mock('@/api/client', () => ({
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(() => null),
  onForceLogout: jest.fn(() => () => {}),
}))

jest.mock('@/config', () => ({
  SECURE_STORE_KEYS: {
    ANONYMOUS_TOKEN: 'phantom_anonymous_token',
    REFRESH_TOKEN: 'phantom_refresh_token',
  },
}))

// ─── Typed helpers ────────────────────────────────────────────────────────────

import { authApi } from '@/api/auth'
import { usersApi } from '@/api/users'
import { setAccessToken } from '@/api/client'

const mockedAuthApi = authApi as jest.Mocked<typeof authApi>
const mockedUsersApi = usersApi as jest.Mocked<typeof usersApi>
const mockedSetAccessToken = setAccessToken as jest.Mock
const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>

const FAKE_USER = {
  id: 'user-1',
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
}

const FAKE_SESSION = {
  id: 'sess-1',
  deviceName: 'iPhone',
  platform: 'ios' as const,
  appVersion: null,
  ipAddress: null,
  isActive: true,
  lastActiveAt: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
}

const FAKE_AUTH_RESPONSE = {
  user: { ...FAKE_USER, anonymousToken: 'abcdef01'.repeat(8) },
  session: FAKE_SESSION,
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
  ;(mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null)
  ;(mockedSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined)
  ;(mockedSecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined)
})

describe('initialize', () => {
  it('sets isInitializing=false when no stored refresh token', async () => {
    ;(mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null)

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isInitializing).toBe(false)
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
  })

  it('restores session when refresh token is stored', async () => {
    ;(mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-refresh')
    mockedAuthApi.refresh.mockResolvedValue(FAKE_AUTH_RESPONSE)
    mockedUsersApi.getMe.mockResolvedValue(FAKE_USER)

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_USER)
    expect(state.isInitializing).toBe(false)
    expect(mockedSetAccessToken).toHaveBeenCalledWith('access-token')
  })

  it('clears tokens and sets unauthenticated when refresh fails', async () => {
    ;(mockedSecureStore.getItemAsync as jest.Mock).mockResolvedValue('bad-token')
    mockedAuthApi.refresh.mockRejectedValue(new Error('Unauthorized'))

    await act(async () => {
      await useAuthStore.getState().initialize()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.isInitializing).toBe(false)
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled()
  })
})

describe('register', () => {
  it('registers, stores tokens, and returns anonymousToken', async () => {
    mockedAuthApi.register.mockResolvedValue(FAKE_AUTH_RESPONSE)

    let result: { anonymousToken: string } | undefined
    await act(async () => {
      result = await useAuthStore.getState().register('Alice', 'iPhone')
    })

    expect(result?.anonymousToken).toBe(FAKE_AUTH_RESPONSE.user.anonymousToken)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_AUTH_RESPONSE.user)
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'phantom_refresh_token',
      'refresh-token',
    )
  })

  it('propagates API errors', async () => {
    mockedAuthApi.register.mockRejectedValue(new Error('Server error'))

    await expect(
      act(async () => { await useAuthStore.getState().register('Alice') }),
    ).rejects.toThrow('Server error')
  })
})

describe('recover', () => {
  it('recovers account and authenticates', async () => {
    mockedAuthApi.recover.mockResolvedValue(FAKE_AUTH_RESPONSE)
    const token = 'abcdef01'.repeat(8)

    await act(async () => {
      await useAuthStore.getState().recover(token)
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(FAKE_AUTH_RESPONSE.user)
    expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
      'phantom_anonymous_token',
      token,
    )
  })
})

describe('logout', () => {
  it('clears state and tokens', async () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true })
    mockedAuthApi.logout.mockResolvedValue(undefined)

    await act(async () => {
      await useAuthStore.getState().logout()
    })

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(mockedSetAccessToken).toHaveBeenCalledWith(null)
    expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('phantom_refresh_token')
  })

  it('still clears state even if API call fails', async () => {
    useAuthStore.setState({ user: FAKE_USER, isAuthenticated: true })
    mockedAuthApi.logout.mockRejectedValue(new Error('Network'))

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
