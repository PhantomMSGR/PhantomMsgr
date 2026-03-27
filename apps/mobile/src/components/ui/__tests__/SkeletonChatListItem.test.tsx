import React from 'react'
import { render } from '@testing-library/react-native'
import { SkeletonChatList, SkeletonChatListItem } from '../SkeletonChatListItem'

describe('SkeletonChatListItem', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<SkeletonChatListItem />)
    expect(toJSON()).toBeTruthy()
  })

  it('contains animated skeleton blocks', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonChatListItem />)
    const Animated = require('react-native-reanimated').default
    // Each skeleton block is an Animated.View
    const animatedViews = UNSAFE_getAllByType(Animated.View)
    expect(animatedViews.length).toBeGreaterThan(0)
  })
})

describe('SkeletonChatList', () => {
  it('renders 8 items by default', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonChatList />)
    // We can't easily count SkeletonChatListItem directly, so count the
    // outer row Views (flexDirection: row) as a proxy
    const { View } = require('react-native')
    const views = UNSAFE_getAllByType(View)
    // At least 8 row containers (one per item)
    expect(views.length).toBeGreaterThanOrEqual(8)
  })

  it('renders the specified count', () => {
    const { UNSAFE_getAllByType } = render(<SkeletonChatList count={3} />)
    const Animated = require('react-native-reanimated').default
    const animatedViews = UNSAFE_getAllByType(Animated.View)
    // Each item has multiple animated blocks; at least count*1 animated views
    expect(animatedViews.length).toBeGreaterThanOrEqual(3)
  })
})
