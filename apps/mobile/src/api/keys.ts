import { apiClient } from './client'

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data
}

export const keysApi = {
  /** Publish our own public key to the server (idempotent). */
  publishPublicKey: async (publicKey: string): Promise<void> => {
    await apiClient.post('/users/me/public-key', { publicKey })
  },

  /** Fetch another user's public key (returns base64 string). */
  getPublicKey: async (userId: string): Promise<string> => {
    const res = await apiClient.get(`/users/${userId}/public-key`)
    return (unwrap(res) as { publicKey: string }).publicKey
  },
}
