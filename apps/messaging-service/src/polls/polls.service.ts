import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'

@Injectable()
export class PollsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async createPoll(dto: {
    chatId: string
    senderId: string
    question: string
    options: string[]
    type?: 'regular' | 'quiz'
    isAnonymous?: boolean
    allowsMultipleAnswers?: boolean
    correctOptionIndex?: number
    explanation?: string
    closeDate?: Date
  }) {
    return this.db.transaction(async (tx) => {
      // Create the message first
      const [message] = await tx
        .insert(schema.messages)
        .values({
          chatId: dto.chatId,
          senderId: dto.senderId,
          type: 'poll',
        })
        .returning()

      // Create the poll
      const [poll] = await tx
        .insert(schema.polls)
        .values({
          messageId: message.id,
          question: dto.question,
          type: dto.type ?? 'regular',
          isAnonymous: dto.isAnonymous ?? true,
          allowsMultipleAnswers: dto.allowsMultipleAnswers ?? false,
          correctOptionIndex: dto.correctOptionIndex,
          explanation: dto.explanation,
          closeDate: dto.closeDate,
        })
        .returning()

      // Create options
      const options = await tx
        .insert(schema.pollOptions)
        .values(
          dto.options.map((text, i) => ({
            pollId: poll.id,
            text,
            orderIndex: i,
          })),
        )
        .returning()

      return { message, poll, options }
    })
  }

  async vote(dto: { pollId: string; optionId: number; userId: string }) {
    const [poll] = await this.db
      .select()
      .from(schema.polls)
      .where(eq(schema.polls.id, dto.pollId))
      .limit(1)

    if (!poll) throw new RpcException({ status: 404, message: 'Poll not found' })
    if (poll.isClosed) throw new RpcException({ status: 410, message: 'Poll is closed' })

    // Check if already voted (for non-multiple choice)
    if (!poll.allowsMultipleAnswers) {
      const [existing] = await this.db
        .select()
        .from(schema.pollVotes)
        .where(
          and(
            eq(schema.pollVotes.pollId, dto.pollId),
            eq(schema.pollVotes.userId, dto.userId),
          ),
        )
        .limit(1)

      if (existing) throw new RpcException({ status: 409, message: 'Already voted' })
    }

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.pollVotes).values(dto)
      await tx
        .update(schema.pollOptions)
        .set({ voterCount: this.db.$count(schema.pollVotes, eq(schema.pollVotes.optionId, dto.optionId)) as any })
        .where(eq(schema.pollOptions.id, dto.optionId))
      await tx
        .update(schema.polls)
        .set({ totalVoterCount: poll.totalVoterCount + 1 })
        .where(eq(schema.polls.id, dto.pollId))
    })

    return { ok: true }
  }
}
