import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { MESSAGING_PATTERNS } from '@phantom/contracts'
import { CurrentUser, JwtPayload } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'

const SendMessageSchema = z.object({
  type: z.enum(['text', 'photo', 'video', 'audio', 'voice', 'video_note', 'document', 'sticker', 'gif', 'location']).default('text'),
  text: z.string().max(4096).optional(),
  mediaId: z.string().uuid().optional(),
  replyToMessageId: z.string().uuid().optional(),
  forwardFromMessageId: z.string().uuid().optional(),
  forwardFromChatId: z.string().uuid().optional(),
  ttlSeconds: z.number().int().positive().max(604800).optional(),
  entities: z.array(z.any()).optional(),
})

const EditMessageSchema = z.object({
  text: z.string().max(4096),
  entities: z.array(z.any()).optional(),
})

const SendPollSchema = z.object({
  question: z.string().min(1).max(300),
  options: z.array(z.string().min(1).max(100)).min(2).max(10),
  type: z.enum(['regular', 'quiz']).default('regular'),
  isAnonymous: z.boolean().default(true),
  allowsMultipleAnswers: z.boolean().default(false),
  correctOptionIndex: z.number().int().optional(),
  explanation: z.string().max(200).optional(),
})

@Controller('chats/:chatId/messages')
export class MessagesController {
  constructor(
    @Inject('MESSAGING_SERVICE') private readonly messagingClient: ClientProxy,
  ) {}

  @Get('pinned')
  getPinned(
    @Param('chatId') chatId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.GET_PINNED, { chatId }),
    )
  }

  @Get()
  getHistory(
    @Param('chatId') chatId: string,
    @Query('cursor') cursor: string,
    @Query('limit') limit: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.GET_HISTORY, {
        chatId, userId: user.sub, cursor, limit: +limit || 20,
      }),
    )
  }

  @Post()
  send(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(SendMessageSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.SEND, { chatId, senderId: user.sub, ...dto }),
    )
  }

  @Post('poll')
  sendPoll(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(SendPollSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.SEND_POLL, { chatId, senderId: user.sub, ...dto }),
    )
  }

  @Patch(':messageId')
  edit(
    @Param('messageId') messageId: string,
    @Body(new ZodValidationPipe(EditMessageSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.EDIT, { messageId, userId: user.sub, ...dto }),
    )
  }

  @Delete(':messageId')
  delete(
    @Param('messageId') messageId: string,
    @Query('forEveryone') forEveryone: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.DELETE, {
        messageId, userId: user.sub, forEveryone: forEveryone === 'true',
      }),
    )
  }

  @Post(':messageId/react')
  addReaction(
    @Param('messageId') messageId: string,
    @Body() dto: { emoji: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.ADD_REACTION, { messageId, userId: user.sub, emoji: dto.emoji }),
    )
  }

  @Delete(':messageId/react')
  removeReaction(@Param('messageId') messageId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.REMOVE_REACTION, { messageId, userId: user.sub }),
    )
  }

  @Post(':messageId/read')
  markRead(
    @Param('chatId') chatId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.MARK_READ, { chatId, messageId, userId: user.sub }),
    )
  }

  @Post(':messageId/pin')
  pin(@Param('chatId') chatId: string, @Param('messageId') messageId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.PIN, { chatId, messageId, userId: user.sub }),
    )
  }

  @Delete(':messageId/pin')
  unpin(@Param('chatId') chatId: string, @Param('messageId') messageId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.messagingClient.send(MESSAGING_PATTERNS.UNPIN, { chatId, messageId, userId: user.sub }),
    )
  }
}
