import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
})
import { privacyLevelEnum, themeEnum, platformEnum } from './enums'
import { media } from './media'

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  // Необязательный username (для анонимных пользователей может отсутствовать)
  username: text('username').unique(),

  displayName: text('display_name').notNull(),
  bio: text('bio'),

  // FK на media — после создания таблицы media
  avatarMediaId: uuid('avatar_media_id'),

  // Emoji + color avatar (alternative to photo)
  avatarEmoji: text('avatar_emoji'),
  avatarColor: text('avatar_color'),

  // Анонимный токен — основной идентификатор без привязки к телефону/email
  anonymousToken: text('anonymous_token').notNull().unique(),

  isPremium: boolean('is_premium').default(false).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  isBot: boolean('is_bot').default(false).notNull(),
  isDeleted: boolean('is_deleted').default(false).notNull(),

  // FTS: для поиска пользователей по имени/username
  searchVector: tsvector('search_vector'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
},
(t) => [
  index('idx_users_search').using('gin', t.searchVector),
  // Partial index: только активные не-удалённые пользователи
  index('idx_users_active').on(t.createdAt).where(sql`is_deleted = false`),
])

// ─── User Status (online / last seen / custom status) ─────────────────────────

export const userStatus = pgTable('user_status', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  isOnline: boolean('is_online').default(false).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),

  // Кастомный статус как в Telegram Premium
  statusText: text('status_text'),
  statusEmoji: text('status_emoji'),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ─── User Settings ────────────────────────────────────────────────────────────

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Приватность
  privacyLastSeen: privacyLevelEnum('privacy_last_seen')
    .default('everyone')
    .notNull(),
  privacyProfilePhoto: privacyLevelEnum('privacy_profile_photo')
    .default('everyone')
    .notNull(),
  privacyOnlineStatus: privacyLevelEnum('privacy_online_status')
    .default('everyone')
    .notNull(),
  // Кто может пересылать сообщения с упоминанием отправителя
  privacyForwards: privacyLevelEnum('privacy_forwards')
    .default('everyone')
    .notNull(),
  // Кто может писать в личку
  privacyMessages: privacyLevelEnum('privacy_messages')
    .default('everyone')
    .notNull(),

  // Уведомления
  notifyMessages: boolean('notify_messages').default(true).notNull(),
  notifyGroups: boolean('notify_groups').default(true).notNull(),
  notifyChannels: boolean('notify_channels').default(true).notNull(),
  notifySound: boolean('notify_sound').default(true).notNull(),
  notifyVibration: boolean('notify_vibration').default(true).notNull(),
  notifyPreview: boolean('notify_preview').default(true).notNull(),

  // Автозагрузка на мобильных данных
  autoDownloadMobilePhotos: boolean('auto_download_mobile_photos')
    .default(true)
    .notNull(),
  autoDownloadMobileVideos: boolean('auto_download_mobile_videos')
    .default(false)
    .notNull(),
  autoDownloadMobileDocuments: boolean('auto_download_mobile_documents')
    .default(false)
    .notNull(),

  // Автозагрузка по Wi-Fi
  autoDownloadWifiPhotos: boolean('auto_download_wifi_photos')
    .default(true)
    .notNull(),
  autoDownloadWifiVideos: boolean('auto_download_wifi_videos')
    .default(true)
    .notNull(),
  autoDownloadWifiDocuments: boolean('auto_download_wifi_documents')
    .default(true)
    .notNull(),

  // Внешний вид
  theme: themeEnum('theme').default('auto').notNull(),
  language: text('language').default('en').notNull(),

  // Двухфакторная защита (PIN / пароль)
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorHint: text('two_factor_hint'),
  pinHash: text('pin_hash'),

  // Необязательная привязка телефона (хеш для восстановления)
  linkedPhoneHash: text('linked_phone_hash'),
})

// ─── Sessions (устройства) ────────────────────────────────────────────────────

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // JWT / refresh token (хешированный)
  tokenHash: text('token_hash').notNull().unique(),

  deviceName: text('device_name'),
  platform: platformEnum('platform'),
  appVersion: text('app_version'),

  // FCM / APNs токен для push-уведомлений
  pushToken: text('push_token'),

  // IP для отображения в настройках (не для слежки)
  ipAddress: text('ip_address'),

  isActive: boolean('is_active').default(true).notNull(),
  lastActiveAt: timestamp('last_active_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
},
(t) => [
  // Самый частый запрос: получить все активные сессии пользователя
  index('idx_sessions_user_active').on(t.userId, t.isActive),
])

// ─── Contacts (адресная книга + блокировки) ───────────────────────────────────

export const contacts = pgTable(
  'contacts',
  {
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    contactId: uuid('contact_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Пользователь может задать своё имя контакту
    customName: text('custom_name'),

    isBlocked: boolean('is_blocked').default(false).notNull(),

    addedAt: timestamp('added_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.ownerId, t.contactId] }),
    // Обратный поиск: кто добавил данного пользователя
    index('idx_contacts_contact_id').on(t.contactId),
  ],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  avatar: one(media, {
    fields: [users.avatarMediaId],
    references: [media.id],
  }),
  status: one(userStatus, {
    fields: [users.id],
    references: [userStatus.userId],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  sessions: many(sessions),
  contacts: many(contacts, { relationName: 'owner' }),
  addedByContacts: many(contacts, { relationName: 'contact' }),
}))

export const contactsRelations = relations(contacts, ({ one }) => ({
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
    relationName: 'owner',
  }),
  contact: one(users, {
    fields: [contacts.contactId],
    references: [users.id],
    relationName: 'contact',
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserStatus = typeof userStatus.$inferSelect
export type UserSettings = typeof userSettings.$inferSelect
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Contact = typeof contacts.$inferSelect
