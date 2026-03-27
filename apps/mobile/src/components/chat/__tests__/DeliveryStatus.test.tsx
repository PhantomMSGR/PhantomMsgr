import React from 'react'
import { render } from '@testing-library/react-native'
import { DeliveryStatus } from '../DeliveryStatus'

// Ionicons is mocked as a View with testID="icon-{name}" in jest.setup.ts

describe('DeliveryStatus', () => {
  it('renders the clock icon for "sending"', () => {
    const { getByTestId } = render(<DeliveryStatus status="sending" />)
    expect(getByTestId('icon-time-outline')).toBeTruthy()
  })

  it('renders the checkmark icon for "sent"', () => {
    const { getAllByTestId } = render(<DeliveryStatus status="sent" />)
    // AnimatedChecks renders two layers (gray + blue) with the same icon
    expect(getAllByTestId('icon-checkmark').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the double-checkmark icon for "delivered"', () => {
    const { getAllByTestId } = render(<DeliveryStatus status="delivered" />)
    expect(getAllByTestId('icon-checkmark-done').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the double-checkmark icon for "read"', () => {
    const { getAllByTestId } = render(<DeliveryStatus status="read" />)
    expect(getAllByTestId('icon-checkmark-done').length).toBeGreaterThanOrEqual(1)
  })

  it('renders the alert icon for "failed"', () => {
    const { getByTestId } = render(<DeliveryStatus status="failed" />)
    expect(getByTestId('icon-alert-circle')).toBeTruthy()
  })

  it('does not show the clock icon for "sent"', () => {
    const { queryByTestId } = render(<DeliveryStatus status="sent" />)
    expect(queryByTestId('icon-time-outline')).toBeNull()
  })

  it('does not show the clock icon for "delivered"', () => {
    const { queryByTestId } = render(<DeliveryStatus status="delivered" />)
    expect(queryByTestId('icon-time-outline')).toBeNull()
  })

  it('renders without crashing for all statuses', () => {
    const statuses = ['sending', 'sent', 'delivered', 'read', 'failed'] as const
    statuses.forEach((status) => {
      const { toJSON } = render(<DeliveryStatus status={status} />)
      expect(toJSON()).toBeTruthy()
    })
  })
})
