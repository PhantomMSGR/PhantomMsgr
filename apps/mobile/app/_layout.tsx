import '@/polyfills'
import React, { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, asyncStoragePersister } from '@/lib/queryClient'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { useAuthStore } from '@/store/auth.store'
import { useSocketStore } from '@/store/socket.store'
import { getAccessToken } from '@/api/client'

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const connect = useSocketStore((s) => s.connect)
  const disconnect = useSocketStore((s) => s.disconnect)

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {})
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isAuthenticated) {
      const token = getAccessToken()
      if (token) connect(token)
    } else {
      disconnect()
    }
  }, [isAuthenticated, connect, disconnect])

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f0f0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    )
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
        <StatusBar style="light" backgroundColor="#0f0f0f" />
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="+not-found" />
          </Stack>
        </ToastProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  )
}
