import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  jsonb,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { storyPrivacyEnum } from './enums'
import { users } from './users'
import { media } from './media'
import { type MessageEntity } from './messages'

// ─── Stories ──────────────────────────────────────────────────────────────────

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  mediaId: uuid('media_id')
    .notNull()
    .references(() => media.id, { onDelete: 'cascade' }),

  caption: text('caption'),
  // Форматирование подписи (те же entities что в сообщениях)
  entities: jsonb('entities').$type<MessageEntity[]>(),

  privacy: storyPrivacyEnum('privacy').default('everyone').notNull(),

  viewsCount: integer('views_count').default(0).notNull(),
  reactionsCount: integer('reactions_count').default(0).notNull(),

  // Закреплённая история (остаётся в профиле после 24ч)
  isPinned: boolean('is_pinned').default(false).notNull(),

  // Архив (не виден другим, но доступен владельцу)
  isArchived: boolean('is_archived').default(false).notNull(),

  // По умолчанию история живёт 24 часа
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ─── Story Views ──────────────────────────────────────────────────────────────

export const storyViews = pgTable(
  'story_views',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    viewerId: uuid('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Реакция на историю (эмодзи)
    reactionEmoji: text('reaction_emoji'),

    viewedAt: timestamp('viewed_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.viewerId] })],
)

// ─── Story Privacy Exceptions ─────────────────────────────────────────────────
// При privacy = 'selected_users': список пользователей КОТОРЫМ видно
// При privacy = 'close_friends': список "близких друзей"

export const storyPrivacyExceptions = pgTable(
  'story_privacy_exceptions',
  {
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.storyId, t.userId] })],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  media: one(media, {
    fields: [stories.mediaId],
    references: [media.id],
  }),
  views: many(storyViews),
  privacyExceptions: many(storyPrivacyExceptions),
}))

export const storyViewsRelations = relations(storyViews, ({ one }) => ({
  story: one(stories, {
    fields: [storyViews.storyId],
    references: [stories.id],
  }),
  viewer: one(users, {
    fields: [storyViews.viewerId],
    references: [users.id],
  }),
}))

export const storyPrivacyExceptionsRelations = relations(
  storyPrivacyExceptions,
  ({ one }) => ({
    story: one(stories, {
      fields: [storyPrivacyExceptions.storyId],
      references: [stories.id],
    }),
    user: one(users, {
      fields: [storyPrivacyExceptions.userId],
      references: [users.id],
    }),
  }),
)

// ─── Types ────────────────────────────────────────────────────────────────────

export type Story = typeof stories.$inferSelect
export type NewStory = typeof stories.$inferInsert
export type StoryView = typeof storyViews.$inferSelect
