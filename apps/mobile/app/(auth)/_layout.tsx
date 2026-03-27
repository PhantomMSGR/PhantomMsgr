import React from 'react'
import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // If already logged in, redirect to the main app
  if (isAuthenticated) {
    return <Redirect href="/(app)/(tabs)/chats" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0f0f0f' },
        animation: 'slide_from_right',
      }}
    />
  )
}
