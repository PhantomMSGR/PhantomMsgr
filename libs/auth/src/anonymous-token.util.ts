import { randomBytes, createHash } from 'crypto'

/** Generates a 32-byte hex string used as the primary anonymous identity */
export function generateAnonymousToken(): string {
  return randomBytes(32).toString('hex')
}

/** SHA-256 hash for storing refresh tokens in DB */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
