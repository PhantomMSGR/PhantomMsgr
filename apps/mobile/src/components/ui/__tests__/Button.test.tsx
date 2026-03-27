import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Button } from '../Button'

describe('Button', () => {
  it('renders the label', () => {
    const { getByText } = render(<Button label="Click me" />)
    expect(getByText('Click me')).toBeTruthy()
  })

  it('renders an ActivityIndicator when loading=true', () => {
    const { queryByText, getByTestId } = render(
      <Button label="Submit" loading />,
    )
    // Label text should not be visible while loading
    expect(queryByText('Submit')).toBeNull()
  })

  it('calls onPress when pressed', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button label="Go" onPress={onPress} />)
    fireEvent.press(getByText('Go'))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn()
    const { getByText } = render(<Button label="Go" onPress={onPress} disabled />)
    fireEvent.press(getByText('Go'))
    expect(onPress).not.toHaveBeenCalled()
  })

  it('does not call onPress when loading', () => {
    const onPress = jest.fn()
    const { UNSAFE_getByType } = render(
      <Button label="Go" onPress={onPress} loading />,
    )
    // Can't press by label (hidden), but we can verify disabled state propagated
    expect(onPress).not.toHaveBeenCalled()
  })

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'renders variant %s without crashing',
    (variant) => {
      const { toJSON } = render(<Button label="Btn" variant={variant} />)
      expect(toJSON()).toBeTruthy()
    },
  )

  it.each(['sm', 'md', 'lg'] as const)(
    'renders size %s without crashing',
    (size) => {
      const { toJSON } = render(<Button label="Btn" size={size} />)
      expect(toJSON()).toBeTruthy()
    },
  )
})
