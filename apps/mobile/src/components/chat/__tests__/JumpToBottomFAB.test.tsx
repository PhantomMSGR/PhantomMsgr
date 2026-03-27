import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { JumpToBottomFAB } from '../JumpToBottomFAB'

describe('JumpToBottomFAB', () => {
  it('renders without crashing when visible', () => {
    const { toJSON } = render(
      <JumpToBottomFAB visible unreadCount={0} onPress={jest.fn()} />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it('renders without crashing when hidden', () => {
    const { toJSON } = render(
      <JumpToBottomFAB visible={false} unreadCount={0} onPress={jest.fn()} />,
    )
    expect(toJSON()).toBeTruthy()
  })

  it('calls onPress when the button is pressed', () => {
    const onPress = jest.fn()
    const { getByTestId } = render(
      <JumpToBottomFAB visible unreadCount={0} onPress={onPress} />,
    )
    fireEvent.press(getByTestId('icon-chevron-down'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('shows unread count badge when unreadCount > 0', () => {
    const { getByText } = render(
      <JumpToBottomFAB visible unreadCount={7} onPress={jest.fn()} />,
    )
    expect(getByText('7')).toBeTruthy()
  })

  it('caps unread badge at 99+', () => {
    const { getByText } = render(
      <JumpToBottomFAB visible unreadCount={200} onPress={jest.fn()} />,
    )
    expect(getByText('99+')).toBeTruthy()
  })

  it('does not show badge when unreadCount is 0', () => {
    const { queryByText } = render(
      <JumpToBottomFAB visible unreadCount={0} onPress={jest.fn()} />,
    )
    expect(queryByText('0')).toBeNull()
  })

  it('renders the chevron-down icon', () => {
    const { getByTestId } = render(
      <JumpToBottomFAB visible unreadCount={0} onPress={jest.fn()} />,
    )
    expect(getByTestId('icon-chevron-down')).toBeTruthy()
  })
})
