import React, { useEffect } from 'react'
import { View } from 'react-native'
import { Stack, Redirect } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'
import { useCryptoStore } from '@/store/crypto.store'
import { OfflineBanner } from '@/components/ui/OfflineBanner'
import { useNotificationNavigation } from '@/hooks/useNotifications'

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const initializeCrypto = useCryptoStore((s) => s.initialize)

  // Wire up notification tap navigation
  useNotificationNavigation()

  // Initialize E2E crypto key pair once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeCrypto()
    }
  }, [isAuthenticated, initializeCrypto])

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0f0f0f' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="story-viewer"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            animationDuration: 200,
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="media-viewer"
          options={{
            presentation: 'fullScreenModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="new-chat"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="local-chat/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <OfflineBanner />
    </View>
  )
}
