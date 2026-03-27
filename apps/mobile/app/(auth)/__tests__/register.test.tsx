import React from 'react'
import { render, fireEvent, waitFor, act } from '@testing-library/react-native'
import RegisterScreen from '../register'
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

const mockRegister = jest.fn()
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

beforeEach(() => {
  jest.clearAllMocks()
  mockUseAuthStore.mockImplementation((selector: any) =>
    selector({ register: mockRegister }),
  )
})

// Helper: press the "Create Account" button (last match — the button, not the heading)
function pressCreateAccount(getAllByText: ReturnType<typeof render>['getAllByText']) {
  const matches = getAllByText('Create Account')
  fireEvent.press(matches[matches.length - 1])
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RegisterScreen — form step', () => {
  it('renders the Create Account heading', () => {
    const { getAllByText } = render(<RegisterScreen />)
    // First match is the heading Text, second is the Button label
    expect(getAllByText('Create Account')[0]).toBeTruthy()
  })

  it('renders Display Name and Device Name inputs', () => {
    const { getByText } = render(<RegisterScreen />)
    expect(getByText('Display Name')).toBeTruthy()
    expect(getByText('Device Name (optional)')).toBeTruthy()
  })

  it('shows validation error when submitting with empty display name', async () => {
    const { getAllByText, getByText } = render(<RegisterScreen />)

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    expect(getByText('Name is required')).toBeTruthy()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows validation error when name is too short', async () => {
    const { getAllByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    // The first TextInput is Display Name
    fireEvent.changeText(inputs[0], 'A')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    expect(getAllByText('Name must be at least 2 characters')[0]).toBeTruthy()
  })

  it('calls register with trimmed displayName on valid submit', async () => {
    mockRegister.mockResolvedValue({ anonymousToken: 'abc123'.repeat(11) })

    const { getAllByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], '  Alice  ')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('Alice', undefined)
    })
  })

  it('navigates back when Back is pressed', () => {
    const { router } = require('expo-router')
    const { getByText } = render(<RegisterScreen />)

    fireEvent.press(getByText('Back'))

    expect(router.back).toHaveBeenCalled()
  })
})

describe('RegisterScreen — backup step', () => {
  it('shows the backup token screen after successful registration', async () => {
    const fakeToken = 'deadbeef'.repeat(8)
    mockRegister.mockResolvedValue({ anonymousToken: fakeToken })

    const { getAllByText, getByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], 'Alice')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    await waitFor(() => {
      expect(getByText('Save your key')).toBeTruthy()
    })
    expect(getByText(fakeToken)).toBeTruthy()
  })

  it('shows warning message on backup screen', async () => {
    const fakeToken = 'deadbeef'.repeat(8)
    mockRegister.mockResolvedValue({ anonymousToken: fakeToken })

    const { getAllByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], 'Alice')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    await waitFor(() => {
      expect(getAllByText(/PhantomMsgr has no servers storing your identity/)[0]).toBeTruthy()
    })
  })

  it('copies token to clipboard when Copy to Clipboard is pressed', async () => {
    const fakeToken = 'deadbeef'.repeat(8)
    mockRegister.mockResolvedValue({ anonymousToken: fakeToken })
    const Clipboard = require('expo-clipboard')

    const { getAllByText, getByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], 'Alice')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    await waitFor(() => getByText("Copy to Clipboard"))

    await act(async () => {
      fireEvent.press(getByText('Copy to Clipboard'))
    })

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(fakeToken)
  })

  it('navigates to chats when Continue is pressed', async () => {
    const fakeToken = 'deadbeef'.repeat(8)
    mockRegister.mockResolvedValue({ anonymousToken: fakeToken })
    const { router } = require('expo-router')

    const { getAllByText, getByText, UNSAFE_getAllByType } = render(<RegisterScreen />)
    const { TextInput } = require('react-native')
    const inputs = UNSAFE_getAllByType(TextInput)

    fireEvent.changeText(inputs[0], 'Alice')

    await act(async () => {
      pressCreateAccount(getAllByText)
    })

    await waitFor(() => getByText("I've saved it — Continue"))

    fireEvent.press(getByText("I've saved it — Continue"))

    expect(router.replace).toHaveBeenCalledWith('/(app)/(tabs)/chats')
  })
})
