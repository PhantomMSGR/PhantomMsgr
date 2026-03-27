import React from 'react'
import { render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('renders initials from a single-word name', () => {
    const { getByText } = render(<Avatar name="Alice" />)
    expect(getByText('A')).toBeTruthy()
  })

  it('renders two initials from a multi-word name', () => {
    const { getByText } = render(<Avatar name="Alice Bob" />)
    expect(getByText('AB')).toBeTruthy()
  })

  it('uses at most 2 initials even for long names', () => {
    const { getByText } = render(<Avatar name="Alice Bob Carol" />)
    expect(getByText('AB')).toBeTruthy()
  })

  it('uppercases initials', () => {
    const { getByText } = render(<Avatar name="alice bob" />)
    expect(getByText('AB')).toBeTruthy()
  })

  it('shows online indicator when online=true', () => {
    const { UNSAFE_getAllByType } = render(<Avatar name="Alice" online />)
    const { View } = require('react-native')
    // Style may be an array — use StyleSheet.flatten to get a merged object
    const views = UNSAFE_getAllByType(View)
    const greenDot = views.find(
      (v: any) => StyleSheet.flatten(v.props.style)?.backgroundColor === '#22c55e',
    )
    expect(greenDot).toBeTruthy()
  })

  it('does not show online indicator by default', () => {
    const { UNSAFE_getAllByType } = render(<Avatar name="Alice" />)
    const { View } = require('react-native')
    const views = UNSAFE_getAllByType(View)
    const greenDot = views.find(
      (v: any) => StyleSheet.flatten(v.props.style)?.backgroundColor === '#22c55e',
    )
    expect(greenDot).toBeUndefined()
  })

  it('generates a stable hue for the same name', () => {
    const { toJSON: toJSON1 } = render(<Avatar name="Charlie" />)
    const { toJSON: toJSON2 } = render(<Avatar name="Charlie" />)
    expect(JSON.stringify(toJSON1())).toBe(JSON.stringify(toJSON2()))
  })

  it('generates different hues for different names', () => {
    const { toJSON: toJSON1 } = render(<Avatar name="Alice" />)
    const { toJSON: toJSON2 } = render(<Avatar name="Bob" />)
    // The rendered background colors should differ (different hues)
    expect(JSON.stringify(toJSON1())).not.toBe(JSON.stringify(toJSON2()))
  })

  it('renders without crashing when mediaUrl is provided', () => {
    const { toJSON } = render(
      <Avatar name="Alice" mediaUrl="https://example.com/pic.jpg" />,
    )
    expect(toJSON()).toBeTruthy()
  })
})
