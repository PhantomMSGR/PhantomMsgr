import { createPhantomSdk } from '@phantom/sdk'
import { webTokenStorage } from './tokenStorage'

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

// Single SDK instance shared across the entire web app
export const sdk = createPhantomSdk({
  baseURL: API_BASE_URL,
  storage: webTokenStorage,
})
