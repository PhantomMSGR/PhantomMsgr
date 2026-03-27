import React from 'react'
import { render } from '@testing-library/react-native'
import { DateSeparator } from '../DateSeparator'

describe('DateSeparator', () => {
  it('renders the date string', () => {
    const { getByText } = render(<DateSeparator date="Today" />)
    expect(getByText('Today')).toBeTruthy()
  })

  it('renders any date label passed in', () => {
    const { getByText } = render(<DateSeparator date="January 15, 2024" />)
    expect(getByText('January 15, 2024')).toBeTruthy()
  })

  it('renders Yesterday', () => {
    const { getByText } = render(<DateSeparator date="Yesterday" />)
    expect(getByText('Yesterday')).toBeTruthy()
  })

  it('renders a weekday name', () => {
    const { getByText } = render(<DateSeparator date="Monday" />)
    expect(getByText('Monday')).toBeTruthy()
  })

  it('matches snapshot', () => {
    const { toJSON } = render(<DateSeparator date="Today" />)
    expect(toJSON()).toMatchSnapshot()
  })
})
