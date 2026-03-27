import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import RecoverScreen from '../recover'
import { useAuthStore } from '@/store/auth.store'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/store/auth.store', () => ({
  useAuthStore: jest.fn(),
}))

jest.mock('@/api/client', () => ({
  setAccessToken: jest.fn(),
  getAccessToken: jest.fn(() => null),
  onForceLogout: jest.fn(() => () => {}),
}))

const mockRecover = jest.fn()
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

const VALID_TOKEN = 'abcdef01'.repeat(8) // 64 hex chars

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector: any) =>
    selector({ recover: mockRecover }),
  )
})

// Helper: press the submit "Recover Account" button (last Text match — the button)
function pressRecoverButton(getAllByText: ReturnType<typeof render>['getAllByText']) {
  const matches = getAllByText('Recover Account')
  fireEvent.press(matches[matches.length - 1])
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RecoverScreen', () => {
  it('renders the Recover Account heading', () => {
    const { getAllByText } = render(<RecoverScreen />)
    // First match is the heading Text, second is the Button label
    expect(getAllByText('Recover Account')[0]).toBeTruthy()
  })

  it('renders the Recovery Token and Device Name inputs', () => {
    const { getByText } = render(<RecoverScreen />)
    expect(getByText('Recovery Token')).toBeTruthy()
    expect(getByText('Device Name (optional)')).toBeTruthy()
  })

  it('renders the Paste from Clipboard button', () => {
    const { getByText } = render(<RecoverScreen />)
    expect(getByText('Paste from Clipboard')).toBeTruthy()
  })

  it('shows error when submitting with empty token', async () => {
    const { getAllByText, getByText } = render(<RecoverScreen />)

    await act(async () => {
      pressRecoverButton(getAllByText)
    })

    expect(getByText('Token is required')).toBeTruthy()
    expect(mockRecover).not.toHaveBeenCalled()
  })

  it('shows error when token is not 64 chars', async () => {
    const { getAllByText, getByText, UNSAFE_getAllByType } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], 'tooshort')

    await act(async () => {
      pressRecoverButton(getAllByText)
    })

    expect(getByText('Token must be exactly 64 characters')).toBeTruthy()
  })

  it('shows error when token contains non-hex characters', async () => {
    const { getAllByText, getByText, UNSAFE_getAllByType } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    // 64 chars but with invalid hex character 'z'
    fireEvent.changeText(inputs[0], 'z'.repeat(64))

    await act(async () => {
      pressRecoverButton(getAllByText)
    })

    expect(getByText('Token must be a hex string')).toBeTruthy()
  })

  it('calls recover with the valid token', async () => {
    mockRecover.mockResolvedValue(undefined)

    const { getAllByText, UNSAFE_getAllByType } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], VALID_TOKEN)

    await act(async () => {
      pressRecoverButton(getAllByText)
    })

    await waitFor(() => {
      // deviceName is empty → component passes undefined
      expect(mockRecover).toHaveBeenCalledWith(VALID_TOKEN, undefined)
    })
  })

  it('navigates to chats on successful recovery', async () => {
    mockRecover.mockResolvedValue(undefined)
    const { router } = require('expo-router')

    const { getAllByText, UNSAFE_getAllByType } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], VALID_TOKEN)

    await act(async () => {
      pressRecoverButton(getAllByText)
    })

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(app)/(tabs)/chats')
    })
  })

  it('pastes from clipboard when Paste button is pressed', async () => {
    const Clipboard = require('expo-clipboard')
    Clipboard.getStringAsync.mockResolvedValue(VALID_TOKEN)

    const { getByText, UNSAFE_getAllByType } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')

    await act(async () => {
      fireEvent.press(getByText('Paste from Clipboard'))
    })

    const inputs = UNSAFE_getAllByType(TextInput)
    expect(inputs[0].props.value).toBe(VALID_TOKEN)
  })

  it('clears error when token changes', async () => {
    const { getAllByText, getByText, UNSAFE_getAllByType, queryByText } = render(<RecoverScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    // Trigger validation error
    await act(async () => {
      pressRecoverButton(getAllByText)
    })
    expect(getByText('Token is required')).toBeTruthy()

    // Now type something — error should clear
    fireEvent.changeText(inputs[0], 'abc')
    expect(queryByText('Token is required')).toBeNull()
  })

  it('navigates back when Back is pressed', () => {
    const { router } = require('expo-router')
    const { getByText } = render(<RecoverScreen />)

    fireEvent.press(getByText('Back'))

    expect(router.back).toHaveBeenCalled()
  })
})
