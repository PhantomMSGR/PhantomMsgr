// Вынесено отдельно чтобы разорвать circular dep: chats <-> messages
import { pgTable, uuid, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { chats } from './chats'
import { messages } from './messages'
import { users } from './users'

export const pinnedMessages = pgTable(
  'pinned_messages',
  {
    chatId: uuid('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),

    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),

    pinnedBy: uuid('pinned_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    pinnedAt: timestamp('pinned_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.chatId, t.messageId] })],
)

export const pinnedMessagesRelations = relations(pinnedMessages, ({ one }) => ({
  chat: one(chats, {
    fields: [pinnedMessages.chatId],
    references: [chats.id],
  }),
  message: one(messages, {
    fields: [pinnedMessages.messageId],
    references: [messages.id],
  }),
  pinnedByUser: one(users, {
    fields: [pinnedMessages.pinnedBy],
    references: [users.id],
  }),
}))

export type PinnedMessage = typeof pinnedMessages.$inferSelect
