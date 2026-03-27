/**
 * Zustand store for E2E encryption state.
 *
 * Responsibilities:
 *  - Generate/load our key pair from SecureStore on initialize()
 *  - Publish our public key to the server
 *  - Cache other users' public keys (fetched on demand)
 *  - Expose encrypt() / decrypt() helpers that chat screen can call
 */
import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import {
  generateKeyPair,
  keyPairToStrings,
  keyPairFromStrings,
  publicKeyFromString,
  encryptMessage,
  decryptMessage,
  type KeyPair,
} from '@/lib/crypto'
import { keysApi } from '@/api/keys'

const SK_PUB = 'phantom_e2e_pk'
const SK_SEC = 'phantom_e2e_sk'

interface CryptoState {
  keyPair: KeyPair | null
  knownPublicKeys: Record<string, Uint8Array>  // userId → publicKey bytes
  isReady: boolean

  initialize: () => Promise<void>
  getOrFetchPublicKey: (userId: string) => Promise<Uint8Array | null>
  encrypt: (plaintext: string, recipientUserId: string) => Promise<string | null>
  decrypt: (wireText: string, senderUserId: string) => Promise<string | null>
}

export const useCryptoStore = create<CryptoState>((set, get) => ({
  keyPair: null,
  knownPublicKeys: {},
  isReady: false,

  // ── initialize ─────────────────────────────────────────────────────────────
  // Called after login. Loads or generates the key pair and publishes public key.

  initialize: async () => {
    try {
      const storedPk = await SecureStore.getItemAsync(SK_PUB)
      const storedSk = await SecureStore.getItemAsync(SK_SEC)

      let kp: KeyPair
      if (storedPk && storedSk) {
        kp = keyPairFromStrings(storedPk, storedSk)
      } else {
        kp = generateKeyPair()
        const { publicKey, secretKey } = keyPairToStrings(kp)
        await SecureStore.setItemAsync(SK_PUB, publicKey)
        await SecureStore.setItemAsync(SK_SEC, secretKey)
      }

      // Publish our public key to the server (idempotent)
      const { publicKey } = keyPairToStrings(kp)
      await keysApi.publishPublicKey(publicKey).catch(() => {
        // Non-fatal — we can still send/receive if we have a cached key
        console.warn('[crypto] Failed to publish public key')
      })

      set({ keyPair: kp, isReady: true })
    } catch (err) {
      console.warn('[crypto] initialize error:', err)
      set({ isReady: false })
    }
  },

  // ── getOrFetchPublicKey ────────────────────────────────────────────────────

  getOrFetchPublicKey: async (userId: string) => {
    const cached = get().knownPublicKeys[userId]
    if (cached) return cached

    try {
      const b64 = await keysApi.getPublicKey(userId)
      const pubKey = publicKeyFromString(b64)
      set((s) => ({ knownPublicKeys: { ...s.knownPublicKeys, [userId]: pubKey } }))
      return pubKey
    } catch {
      return null
    }
  },

  // ── encrypt ────────────────────────────────────────────────────────────────

  encrypt: async (plaintext: string, recipientUserId: string) => {
    const { keyPair, getOrFetchPublicKey } = get()
    if (!keyPair) return null

    const recipientPK = await getOrFetchPublicKey(recipientUserId)
    if (!recipientPK) return null

    return encryptMessage(plaintext, recipientPK, keyPair.secretKey)
  },

  // ── decrypt ────────────────────────────────────────────────────────────────

  decrypt: async (wireText: string, senderUserId: string) => {
    const { keyPair, getOrFetchPublicKey } = get()
    if (!keyPair) return null

    const senderPK = await getOrFetchPublicKey(senderUserId)
    if (!senderPK) return null

    return decryptMessage(wireText, senderPK, keyPair.secretKey)
  },
}))
