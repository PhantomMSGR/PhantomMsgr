import React from 'react'
import { View } from 'react-native'
import { Toast } from './Toast'

interface Props {
  children: React.ReactNode
}

/**
 * Wrap your root navigator with this.
 * Renders the Toast layer absolutely above all content.
 */
export function ToastProvider({ children }: Props) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <Toast />
    </View>
  )
}
