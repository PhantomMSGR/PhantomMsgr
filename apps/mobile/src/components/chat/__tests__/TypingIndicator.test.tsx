import React from 'react'
import { render } from '@testing-library/react-native'
import { TypingIndicator } from '../TypingIndicator'

describe('TypingIndicator', () => {
  it('renders nothing when visible=false', () => {
    const { toJSON } = render(<TypingIndicator visible={false} />)
    expect(toJSON()).toBeNull()
  })

  it('renders when visible=true', () => {
    const { toJSON } = render(<TypingIndicator visible />)
    expect(toJSON()).toBeTruthy()
  })

  it('renders three animated dot views when visible', () => {
    const { UNSAFE_getAllByType } = render(<TypingIndicator visible />)
    const Animated = require('react-native-reanimated').default
    const dots = UNSAFE_getAllByType(Animated.View)
    // Container + 3 dots = at least 4 Animated.View nodes
    expect(dots.length).toBeGreaterThanOrEqual(4)
  })

  it('switches from hidden to visible without crashing', () => {
    const { rerender, toJSON } = render(<TypingIndicator visible={false} />)
    expect(toJSON()).toBeNull()

    rerender(<TypingIndicator visible />)
    expect(toJSON()).toBeTruthy()
  })
})
