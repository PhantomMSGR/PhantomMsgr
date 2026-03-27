import type { AxiosInstance } from 'axios'

function unwrap<T>(res: { data: { data: T } }): T {
  return res.data.data
}

export function createKeysApi(client: AxiosInstance) {
  return {
    /** Publish our own public key to the server (idempotent). */
    publishPublicKey: async (publicKey: string): Promise<void> => {
      await client.post('/users/me/public-key', { publicKey })
    },

    /** Fetch another user's public key (returns base64 string). */
    getPublicKey: async (userId: string): Promise<string> => {
      const res = await client.get(`/users/${userId}/public-key`)
      return (unwrap(res) as { publicKey: string }).publicKey
    },
  }
}
