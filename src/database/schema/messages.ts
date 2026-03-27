import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  jsonb,
  unique,
  index,
  customType,
  AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'

// PostgreSQL tsvector for full-text search
const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
})
import { messageTypeEnum } from './enums'
import { users } from './users'
import { media } from './media'
import { chats } from './chats'
// chats.ts больше не импортирует messages.ts → circular dep устранён

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  chatId: uuid('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  // null для системных сообщений (пользователь вступил, изменил название и т.д.)
  senderId: uuid('sender_id').references(() => users.id, {
    onDelete: 'set null',
  }),

  type: messageTypeEnum('type').default('text').notNull(),

  // Текстовое содержимое
  text: text('text'),

  // Медиафайл (фото, видео, документ и т.д.)
  mediaId: uuid('media_id').references(() => media.id, {
    onDelete: 'set null',
  }),

  // Ответ на сообщение
  replyToMessageId: uuid('reply_to_message_id').references(
    (): AnyPgColumn => messages.id,
    { onDelete: 'set null' },
  ),

  // Пересланное сообщение
  forwardFromMessageId: uuid('forward_from_message_id'),
  forwardFromChatId: uuid('forward_from_chat_id'),
  // Анонимный пересыл — имя отправителя без ссылки на аккаунт
  forwardSenderName: text('forward_sender_name'),

  isEdited: boolean('is_edited').default(false).notNull(),
  editedAt: timestamp('edited_at', { withTimezone: true }),

  isDeleted: boolean('is_deleted').default(false).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  // Удалено для всех или только для себя
  deleteForEveryone: boolean('delete_for_everyone').default(false).notNull(),

  // Самоуничтожающееся сообщение (секунды)
  ttlSeconds: integer('ttl_seconds'),
  ttlExpiresAt: timestamp('ttl_expires_at', { withTimezone: true }),

  // Для каналов: счётчик просмотров
  viewsCount: integer('views_count').default(0).notNull(),
  forwardsCount: integer('forwards_count').default(0).notNull(),
  repliesCount: integer('replies_count').default(0).notNull(),

  // Кешированный счётчик реакций { "❤️": 5, "👍": 3 }
  reactions: jsonb('reactions').$type<Record<string, number>>(),

  // Форматирование текста: bold, italic, code, links, mentions, spoiler
  // Массив entities совместимый с Telegram Bot API
  entities: jsonb('entities').$type<MessageEntity[]>(),

  // ── E2E Encryption ────────────────────────────────────────────────────────
  // Когда isEncrypted = true, text = null, encryptedPayload содержит
  // base64url(AES-256-GCM(plaintext)) зашифрованный на стороне клиента.
  // Сервер хранит непрозрачный blob и НИКОГДА его не расшифровывает.
  isEncrypted: boolean('is_encrypted').default(false).notNull(),
  encryptedPayload: text('encrypted_payload'),
  // ID устройства отправителя (для multi-device)
  senderDeviceId: text('sender_device_id'),

  // ── Full-text search ──────────────────────────────────────────────────────
  // Автоматически обновляется триггером в БД.
  // NULL для зашифрованных сообщений (нечего индексировать).
  searchVector: tsvector('search_vector'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
},
(t) => [
  // Основной индекс для пагинации истории чата — самый горячий запрос
  index('idx_messages_chat_created').on(t.chatId, t.createdAt),
  // Поиск по отправителю
  index('idx_messages_sender').on(t.senderId),
  // Full-text search — GIN индекс для tsvector
  index('idx_messages_search').using('gin', t.searchVector),
  // TTL: поиск просроченных сообщений
  index('idx_messages_ttl').on(t.ttlExpiresAt),
])

// ─── Message Reads (прочитанность) ───────────────────────────────────────────

export const messageReads = pgTable(
  'message_reads',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    readAt: timestamp('read_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.messageId, t.userId] })],
)

// ─── Message Reactions ────────────────────────────────────────────────────────

export const messageReactions = pgTable(
  'message_reactions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    emoji: text('emoji').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [
    // Один пользователь — одна реакция на сообщение
    unique('uq_reaction_per_user').on(t.messageId, t.userId),
  ],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  media: one(media, {
    fields: [messages.mediaId],
    references: [media.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
    relationName: 'replies',
  }),
  replies: many(messages, { relationName: 'replies' }),
  reads: many(messageReads),
  reactionsList: many(messageReactions),
}))

export const messageReadsRelations = relations(messageReads, ({ one }) => ({
  message: one(messages, {
    fields: [messageReads.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReads.userId],
    references: [users.id],
  }),
}))

export const messageReactionsRelations = relations(
  messageReactions,
  ({ one }) => ({
    message: one(messages, {
      fields: [messageReactions.messageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageReactions.userId],
      references: [users.id],
    }),
  }),
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessageEntity {
  type:
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'mention'
    | 'spoiler'
    | 'blockquote'
  offset: number
  length: number
  url?: string      // для text_link
  language?: string // для pre (блок кода)
}

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type MessageRead = typeof messageReads.$inferSelect
export type MessageReaction = typeof messageReactions.$inferSelect
