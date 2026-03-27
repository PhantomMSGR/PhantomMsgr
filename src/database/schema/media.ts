import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { mediaTypeEnum } from './enums'
import { users } from './users'

// Единая таблица для всех медиафайлов: фото, видео, голосовые,
// документы, стикеры, аватарки, медиа историй
export const media = pgTable('media', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  uploaderId: uuid('uploader_id').references(() => users.id, {
    onDelete: 'set null',
  }),

  type: mediaTypeEnum('type').notNull(),

  // S3 / MinIO ключ для хранилища
  storageKey: text('storage_key').notNull(),
  url: text('url').notNull(),

  // Превью для видео и документов
  thumbnailKey: text('thumbnail_key'),
  thumbnailUrl: text('thumbnail_url'),

  fileName: text('file_name'),
  mimeType: text('mime_type').notNull(),

  // bigint: файлы могут быть > 2GB
  fileSize: bigint('file_size', { mode: 'number' }).notNull(),

  // Для фото и видео
  width: integer('width'),
  height: integer('height'),

  // Для аудио / видео (в секундах)
  duration: integer('duration'),

  // Визуализация волны для голосовых сообщений (массив чисел 0-255)
  waveform: jsonb('waveform').$type<number[]>(),

  isAnimated: boolean('is_animated').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert
