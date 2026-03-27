import React from 'react'
import { Text, View } from 'react-native'

interface Props {
  /** 'header' = pill shown in chat header; 'message' = tiny inline icon */
  variant?: 'header' | 'message'
}

export function E2EBadge({ variant = 'header' }: Props) {
  if (variant === 'message') {
    return (
      <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>🔒</Text>
    )
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(34,197,94,0.12)',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(34,197,94,0.25)',
      }}
    >
      <Text style={{ fontSize: 11 }}>🔒</Text>
      <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '600' }}>E2E Encrypted</Text>
    </View>
  )
}
