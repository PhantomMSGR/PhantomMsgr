import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
})
import { chatTypeEnum, memberRoleEnum } from './enums'
import { users } from './users'
import { media } from './media'

// ─── Chats ────────────────────────────────────────────────────────────────────
// Единая таблица: личка, группа, канал, "Избранное"

export const chats = pgTable('chats', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  type: chatTypeEnum('type').notNull(),

  // Только для групп и каналов
  title: text('title'),
  description: text('description'),

  avatarMediaId: uuid('avatar_media_id').references(() => media.id, {
    onDelete: 'set null',
  }),

  // Emoji + color avatar (alternative to photo)
  avatarEmoji: text('avatar_emoji'),
  avatarColor: text('avatar_color'),

  // null для "Избранного" (saved)
  createdBy: uuid('created_by').references(() => users.id, {
    onDelete: 'set null',
  }),

  // Публичные группы/каналы имеют username (@phantom_news)
  username: text('username').unique(),
  isPublic: boolean('is_public').default(false).notNull(),

  // Пригласительная ссылка (hash часть)
  inviteHash: text('invite_hash').unique(),

  memberCount: integer('member_count').default(0).notNull(),
  messageCount: integer('message_count').default(0).notNull(),

  // Кешированный ID последнего сообщения для списка чатов
  lastMessageId: uuid('last_message_id'),

  // Официальный верифицированный канал
  isVerified: boolean('is_verified').default(false).notNull(),

  // Замедленный режим в группах (секунды между сообщениями)
  slowModeDelay: integer('slow_mode_delay'),

  // Канал может быть связан с группой обсуждений
  linkedChatId: uuid('linked_chat_id'),

  // FTS для поиска публичных групп/каналов по названию
  searchVector: tsvector('search_vector'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
},
(t) => [
  index('idx_chats_updated_at').on(t.updatedAt),
  index('idx_chats_search').using('gin', t.searchVector),
  // Partial index: только публичные чаты для поиска
  index('idx_chats_public').on(t.type).where(sql`is_public = true`),
])

// ─── Chat Members ─────────────────────────────────────────────────────────────

export const chatMembers = pgTable(
  'chat_members',
  {
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    role: memberRoleEnum('role').default('member').notNull(),

    joinedAt: timestamp('joined_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),

    invitedBy: uuid('invited_by').references(() => users.id, {
      onDelete: 'set null',
    }),

    // Когда покинул чат (для истории)
    leftAt: timestamp('left_at', { withTimezone: true }),

    // Бан до определённой даты (null = навсегда)
    bannedUntil: timestamp('banned_until', { withTimezone: true }),

    // Мьют уведомлений
    isMuted: boolean('is_muted').default(false).notNull(),
    muteUntil: timestamp('mute_until', { withTimezone: true }),

    // Последнее прочитанное сообщение
    lastReadMessageId: uuid('last_read_message_id'),
    unreadCount: integer('unread_count').default(0).notNull(),

    // Чат закреплён в списке
    isPinned: boolean('is_pinned').default(false).notNull(),
    pinnedAt: timestamp('pinned_at', { withTimezone: true }),

    // Чат в архиве
    isArchived: boolean('is_archived').default(false).notNull(),

    // Кастомный заголовок для администратора ("Основатель", "Модератор")
    customTitle: text('custom_title'),

    // Права для restricted / admin
    canSendMessages: boolean('can_send_messages').default(true).notNull(),
    canSendMedia: boolean('can_send_media').default(true).notNull(),
    canSendPolls: boolean('can_send_polls').default(true).notNull(),
    canAddUsers: boolean('can_add_users').default(false).notNull(),
    canPinMessages: boolean('can_pin_messages').default(false).notNull(),
    canManageChat: boolean('can_manage_chat').default(false).notNull(),
    canDeleteMessages: boolean('can_delete_messages').default(false).notNull(),
    canBanUsers: boolean('can_ban_users').default(false).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.chatId, t.userId] }),
    // Получить все чаты пользователя — самый частый запрос списка чатов
    index('idx_chat_members_user_id').on(t.userId),
    // Partial: только активные участники (не left/banned)
    index('idx_chat_members_active').on(t.chatId).where(
      sql`role NOT IN ('left', 'banned')`,
    ),
  ],
)

// ─── Chat Invite Links ────────────────────────────────────────────────────────

export const chatInvites = pgTable('chat_invites', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Уникальный хеш ссылки
  inviteHash: text('invite_hash').notNull().unique(),

  // null = безлимитно
  maxUses: integer('max_uses'),
  usesCount: integer('uses_count').default(0).notNull(),

  expiresAt: timestamp('expires_at', { withTimezone: true }),
  isRevoked: boolean('is_revoked').default(false).notNull(),

  // Требовать одобрения администратора
  requiresApproval: boolean('requires_approval').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const chatsRelations = relations(chats, ({ one, many }) => ({
  avatar: one(media, {
    fields: [chats.avatarMediaId],
    references: [media.id],
  }),
  creator: one(users, {
    fields: [chats.createdBy],
    references: [users.id],
  }),
  linkedChat: one(chats, {
    fields: [chats.linkedChatId],
    references: [chats.id],
    relationName: 'linked',
  }),
  members: many(chatMembers),
  invites: many(chatInvites),
}))

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  user: one(users, {
    fields: [chatMembers.userId],
    references: [users.id],
  }),
  inviter: one(users, {
    fields: [chatMembers.invitedBy],
    references: [users.id],
  }),
}))

export const chatInvitesRelations = relations(chatInvites, ({ one }) => ({
  chat: one(chats, {
    fields: [chatInvites.chatId],
    references: [chats.id],
  }),
  creator: one(users, {
    fields: [chatInvites.createdBy],
    references: [users.id],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type Chat = typeof chats.$inferSelect
export type NewChat = typeof chats.$inferInsert
export type ChatMember = typeof chatMembers.$inferSelect
export type NewChatMember = typeof chatMembers.$inferInsert
export type ChatInvite = typeof chatInvites.$inferSelect
export type NewChatInvite = typeof chatInvites.$inferInsert
