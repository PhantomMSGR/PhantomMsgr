import React from 'react'
import { View } from 'react-native'
import { useToastStore, type ToastItem } from '@/store/toast.store'
import { ToastItem as ToastItemComponent } from './Toast'

interface ToastProviderProps {
  children: React.ReactNode
}

function ToastLayer() {
  const queue = useToastStore((s) => s.queue)
  const dismiss = useToastStore((s) => s.dismiss)
  const current = queue[queue.length - 1] as ToastItem | undefined

  if (!current) return null

  return (
    <ToastItemComponent
      key={current.id}
      id={current.id}
      message={current.message}
      type={current.type}
      duration={current.duration}
      onDismissById={dismiss}
    />
  )
}

/**
 * Wrap your root navigator with this.
 * Renders the Toast layer absolutely above all content.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ToastLayer />
    </View>
  )
}

ToastProvider.displayName = 'ToastProvider'
