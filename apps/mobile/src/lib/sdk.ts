import * as SecureStore from 'expo-secure-store'
import { createPhantomSdk, type TokenStorage } from '@phantom/sdk'

const KEYS = {
  REFRESH_TOKEN: 'phantom_refresh_token',
  ANONYMOUS_TOKEN: 'phantom_anonymous_token',
}

export const mobileTokenStorage: TokenStorage = {
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
  setRefreshToken: (token) => SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, token),
  deleteRefreshToken: () => SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
  getAnonymousToken: () => SecureStore.getItemAsync(KEYS.ANONYMOUS_TOKEN),
  setAnonymousToken: (token) => SecureStore.setItemAsync(KEYS.ANONYMOUS_TOKEN, token),
  deleteAnonymousToken: () => SecureStore.deleteItemAsync(KEYS.ANONYMOUS_TOKEN),
}

export const sdk = createPhantomSdk({
  baseURL: (process.env.EXPO_PUBLIC_API_URL as string | undefined) ?? 'http://localhost:3000/api/v1',
  storage: mobileTokenStorage,
})
