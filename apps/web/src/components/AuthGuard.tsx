import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Center, Loader } from '@mantine/core'
import { useAuthStore } from '@/store/auth.store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitializing = useAuthStore((s) => s.isInitializing)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => { initialize() }, [initialize])

  if (isInitializing) {
    return (
      <Center h="100vh" bg="dark.9">
        <Loader color="blue" size="md" />
      </Center>
    )
  }

  if (!isAuthenticated) return <Navigate to="/welcome" replace />

  return <>{children}</>
}
