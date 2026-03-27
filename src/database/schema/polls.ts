import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  primaryKey,
  serial,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { pollTypeEnum } from './enums'
import { users } from './users'
import { messages } from './messages'

// ─── Polls ────────────────────────────────────────────────────────────────────

export const polls = pgTable('polls', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),

  // Каждый опрос привязан к одному сообщению
  messageId: uuid('message_id')
    .notNull()
    .unique()
    .references(() => messages.id, { onDelete: 'cascade' }),

  question: text('question').notNull(),
  type: pollTypeEnum('type').default('regular').notNull(),

  // Анонимное голосование — не показывать кто за что проголосовал
  isAnonymous: boolean('is_anonymous').default(true).notNull(),

  // Можно выбрать несколько вариантов
  allowsMultipleAnswers: boolean('allows_multiple_answers')
    .default(false)
    .notNull(),

  // Только для quiz
  correctOptionIndex: integer('correct_option_index'),
  explanation: text('explanation'),

  closeDate: timestamp('close_date', { withTimezone: true }),
  isClosed: boolean('is_closed').default(false).notNull(),

  totalVoterCount: integer('total_voter_count').default(0).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

// ─── Poll Options ─────────────────────────────────────────────────────────────

export const pollOptions = pgTable('poll_options', {
  id: serial('id').primaryKey(),

  pollId: uuid('poll_id')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),

  text: text('text').notNull(),
  voterCount: integer('voter_count').default(0).notNull(),

  // Порядок отображения
  orderIndex: integer('order_index').notNull(),
})

// ─── Poll Votes ───────────────────────────────────────────────────────────────

export const pollVotes = pgTable(
  'poll_votes',
  {
    pollId: uuid('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),

    optionId: integer('option_id')
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    votedAt: timestamp('voted_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.optionId, t.userId] })],
)

// ─── Relations ────────────────────────────────────────────────────────────────

export const pollsRelations = relations(polls, ({ one, many }) => ({
  message: one(messages, {
    fields: [polls.messageId],
    references: [messages.id],
  }),
  options: many(pollOptions),
  votes: many(pollVotes),
}))

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, {
    fields: [pollOptions.pollId],
    references: [polls.id],
  }),
  votes: many(pollVotes),
}))

export const pollVotesRelations = relations(pollVotes, ({ one }) => ({
  poll: one(polls, {
    fields: [pollVotes.pollId],
    references: [polls.id],
  }),
  option: one(pollOptions, {
    fields: [pollVotes.optionId],
    references: [pollOptions.id],
  }),
  user: one(users, {
    fields: [pollVotes.userId],
    references: [users.id],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type Poll = typeof polls.$inferSelect
export type NewPoll = typeof polls.$inferInsert
export type PollOption = typeof pollOptions.$inferSelect
export type PollVote = typeof pollVotes.$inferSelect
