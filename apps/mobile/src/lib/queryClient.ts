import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 24h gcTime so persisted data survives app restarts
      gcTime: 24 * 60 * 60_000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

/**
 * AsyncStorage persister — keeps the React Query cache on disk.
 * Wrap your root with <PersistQueryClientProvider> using this persister.
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'PHANTOM_RQ_CACHE',
  // Throttle writes to avoid excessive I/O
  throttleTime: 1_000,
})
