import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { Toast } from '../Toast'
import { useToastStore } from '@/store/toast.store'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useToastStore.setState({ queue: [] })
}

function addToast(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
  act(() => {
    useToastStore.getState().show(message, type, 3000)
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers()
  resetStore()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('Toast', () => {
  it('renders nothing when queue is empty', () => {
    const { toJSON } = render(<Toast />)
    expect(toJSON()).toBeNull()
  })

  it('renders the latest toast message', () => {
    addToast('Hello world')
    const { getByText } = render(<Toast />)
    expect(getByText('Hello world')).toBeTruthy()
  })

  it('shows the most recently added toast when multiple exist', () => {
    addToast('First')
    addToast('Second')
    const { getByText, queryByText } = render(<Toast />)
    expect(getByText('Second')).toBeTruthy()
    expect(queryByText('First')).toBeNull()
  })

  it('displays the type icon for info', () => {
    addToast('Info message', 'info')
    const { getByTestId } = render(<Toast />)
    expect(getByTestId('icon-information-circle')).toBeTruthy()
  })

  it('displays the type icon for success', () => {
    addToast('Done!', 'success')
    const { getByTestId } = render(<Toast />)
    expect(getByTestId('icon-checkmark-circle')).toBeTruthy()
  })

  it('displays the type icon for error', () => {
    addToast('Oops', 'error')
    const { getByTestId } = render(<Toast />)
    expect(getByTestId('icon-close-circle')).toBeTruthy()
  })

  it('displays the type icon for warning', () => {
    addToast('Watch out', 'warning')
    const { getByTestId } = render(<Toast />)
    expect(getByTestId('icon-warning')).toBeTruthy()
  })

  it('dismisses toast when the close button is pressed', () => {
    addToast('Dismissable')
    const { getByTestId } = render(<Toast />)

    fireEvent.press(getByTestId('icon-close'))

    // After dismiss, queue should be empty
    expect(useToastStore.getState().queue).toHaveLength(0)
  })
})
