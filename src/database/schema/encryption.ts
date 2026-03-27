/**
 * End-to-End Encryption — Signal Protocol key storage.
 *
 * The backend is a "dumb pipe": it stores and distributes public keys only.
 * Private keys NEVER leave the client device.
 *
 * Flow (X3DH key agreement):
 *   1. Alice registers her key bundle (IK + SPK + OPKs).
 *   2. Bob fetches Alice's key bundle.
 *   3. Both derive a shared secret on device — server never sees it.
 *   4. Messages are encrypted client-side; server stores opaque blobs.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { users } from './users'

// ─── User Key Bundles ──────────────────────────────────────────────────────────
// One row per user (device). Multi-device support → one row per device.

export const userKeyBundles = pgTable(
  'user_key_bundles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Optional device identifier for multi-device support
    deviceId: text('device_id').notNull().default('primary'),

    // ── Identity Key (IK) ─────────────────────────────────────────────────────
    // Long-lived Curve25519 public key, base64url-encoded.
    // Equivalent to a fingerprint — users can verify out-of-band.
    identityKey: text('identity_key').notNull(),

    // ── Signed PreKey (SPK) ───────────────────────────────────────────────────
    // Medium-term key, rotated every ~7 days. Signed by IK so recipients
    // can verify authenticity without contacting the server.
    signedPreKeyId: integer('signed_prekey_id').notNull(),
    signedPreKey: text('signed_prekey').notNull(),
    // Ed25519 signature of SPK by IK — base64url
    signedPreKeySignature: text('signed_prekey_signature').notNull(),

    // ── Registration ID ───────────────────────────────────────────────────────
    // Random 14-bit number used to detect re-registration.
    registrationId: integer('registration_id').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    uniqueIndex('uq_user_device_key').on(t.userId, t.deviceId),
    index('idx_key_bundles_user_id').on(t.userId),
  ],
)

// ─── One-Time PreKeys (OPKs) ──────────────────────────────────────────────────
// Ephemeral Curve25519 keys — consumed one per new session initiation.
// When exhausted, X3DH falls back to SPK (slightly weaker forward secrecy).

export const oneTimePreKeys = pgTable(
  'one_time_prekeys',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    deviceId: text('device_id').notNull().default('primary'),

    // Monotonically incrementing ID per user
    keyId: integer('key_id').notNull(),

    // Curve25519 public key, base64url-encoded
    publicKey: text('public_key').notNull(),

    // True once claimed by a session initiator — never reused
    isUsed: boolean('is_used').default(false).notNull(),

    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    primaryKey({ name: 'pk_otpk', columns: [t.userId, t.deviceId, t.keyId] }),
    index('idx_otpk_user_unused').on(t.userId, t.isUsed),
  ],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const userKeyBundlesRelations = relations(userKeyBundles, ({ one }) => ({
  user: one(users, { fields: [userKeyBundles.userId], references: [users.id] }),
}))

export const oneTimePreKeysRelations = relations(oneTimePreKeys, ({ one }) => ({
  user: one(users, { fields: [oneTimePreKeys.userId], references: [users.id] }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserKeyBundle = typeof userKeyBundles.$inferSelect
export type NewUserKeyBundle = typeof userKeyBundles.$inferInsert
export type OneTimePreKey = typeof oneTimePreKeys.$inferSelect
