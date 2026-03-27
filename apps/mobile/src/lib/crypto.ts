/**
 * E2E encryption using TweetNaCl (Curve25519 + XSalsa20 + Poly1305).
 *
 * Wire format for encrypted messages:
 *   "e2e:" + base64( nonce(24) + ciphertext )
 */

// Polyfill crypto.getRandomValues for TweetNaCl on React Native (no Web Crypto API available)
import * as ExpoCrypto from 'expo-crypto'
if (typeof global.crypto === 'undefined') {
  ;(global as any).crypto = {}
}
if (typeof (global.crypto as any).getRandomValues === 'undefined') {
  ;(global.crypto as any).getRandomValues = (array: Uint8Array) => {
    const bytes = ExpoCrypto.getRandomBytes(array.length)
    array.set(bytes)
    return array
  }
}

import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'

export const E2E_PREFIX = 'e2e:'

// ─── Key management ───────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export function generateKeyPair(): KeyPair {
  return nacl.box.keyPair()
}

export function keyPairToStrings(kp: KeyPair): { publicKey: string; secretKey: string } {
  return {
    publicKey: encodeBase64(kp.publicKey),
    secretKey: encodeBase64(kp.secretKey),
  }
}

export function keyPairFromStrings(pk: string, sk: string): KeyPair {
  return {
    publicKey: decodeBase64(pk),
    secretKey: decodeBase64(sk),
  }
}

export function publicKeyToString(pk: Uint8Array): string {
  return encodeBase64(pk)
}

export function publicKeyFromString(pk: string): Uint8Array {
  return decodeBase64(pk)
}

// ─── Encrypt / Decrypt ────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message.
 * Returns the e2e: prefixed wire string.
 */
export function encryptMessage(
  plaintext: string,
  recipientPublicKey: Uint8Array,
  ourSecretKey: Uint8Array,
): string {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageBytes = decodeUTF8(plaintext)
  const ciphertext = nacl.box(messageBytes, nonce, recipientPublicKey, ourSecretKey)

  // Combine nonce + ciphertext into a single buffer
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce)
  combined.set(ciphertext, nonce.length)

  return E2E_PREFIX + encodeBase64(combined)
}

/**
 * Decrypt a wire-format message.
 * Returns the plaintext string, or null if decryption fails (wrong key / tampered).
 */
export function decryptMessage(
  wireText: string,
  senderPublicKey: Uint8Array,
  ourSecretKey: Uint8Array,
): string | null {
  if (!wireText.startsWith(E2E_PREFIX)) return null

  try {
    const combined = decodeBase64(wireText.slice(E2E_PREFIX.length))
    const nonce = combined.slice(0, nacl.box.nonceLength)
    const ciphertext = combined.slice(nacl.box.nonceLength)

    const plaintext = nacl.box.open(ciphertext, nonce, senderPublicKey, ourSecretKey)
    if (!plaintext) return null

    return encodeUTF8(plaintext)
  } catch {
    return null
  }
}

/** Check whether a message text is in E2E wire format */
export function isE2EMessage(text: string | null): boolean {
  return !!text?.startsWith(E2E_PREFIX)
}
