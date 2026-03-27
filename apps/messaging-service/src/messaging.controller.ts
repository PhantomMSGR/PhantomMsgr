import { Controller } from '@nestjs/common'
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices'
import { MEDIA_EVENTS, MESSAGING_PATTERNS } from '@phantom/contracts'
import { MessagingService } from './messaging.service'
import { ReactionsService } from './reactions/reactions.service'
import { ReadsService } from './reads/reads.service'
import { PollsService } from './polls/polls.service'
import { PinsService } from './pins/pins.service'
import type { MediaProcessedEvent } from '@phantom/contracts'

@Controller()
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly reactionsService: ReactionsService,
    private readonly readsService: ReadsService,
    private readonly pollsService: PollsService,
    private readonly pinsService: PinsService,
  ) {}

  @MessagePattern(MESSAGING_PATTERNS.SEND)
  send(@Payload() dto: any) {
    return this.messagingService.sendMessage(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.EDIT)
  edit(@Payload() dto: any) {
    return this.messagingService.editMessage(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.DELETE)
  delete(@Payload() dto: any) {
    return this.messagingService.deleteMessage(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.GET_HISTORY)
  getHistory(@Payload() dto: { chatId: string; userId: string; cursor?: string; limit?: number }) {
    return this.messagingService.getHistory(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.GET_BY_ID)
  getById(@Payload() dto: { messageId: string; userId: string }) {
    return this.messagingService.getMessageById(dto.messageId, dto.userId)
  }

  @MessagePattern(MESSAGING_PATTERNS.ADD_REACTION)
  addReaction(@Payload() dto: { messageId: string; userId: string; emoji: string }) {
    return this.reactionsService.addReaction(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.REMOVE_REACTION)
  removeReaction(@Payload() dto: { messageId: string; userId: string }) {
    return this.reactionsService.removeReaction(dto.messageId, dto.userId)
  }

  @MessagePattern(MESSAGING_PATTERNS.MARK_READ)
  markRead(@Payload() dto: { chatId: string; userId: string; messageId: string }) {
    return this.readsService.markRead(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.SEND_POLL)
  sendPoll(@Payload() dto: any) {
    return this.pollsService.createPoll(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.VOTE_POLL)
  votePoll(@Payload() dto: { pollId: string; optionId: number; userId: string }) {
    return this.pollsService.vote(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.PIN)
  pin(@Payload() dto: { chatId: string; messageId: string; userId: string }) {
    return this.pinsService.pinMessage(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.UNPIN)
  unpin(@Payload() dto: { chatId: string; messageId: string; userId: string }) {
    return this.pinsService.unpinMessage(dto)
  }

  @MessagePattern(MESSAGING_PATTERNS.GET_PINNED)
  getPinned(@Payload() dto: { chatId: string }) {
    return this.pinsService.getPinnedMessages(dto.chatId)
  }

  // Consume event from media-service when a file finishes processing
  @EventPattern(MEDIA_EVENTS.PROCESSED)
  onMediaProcessed(@Payload() event: MediaProcessedEvent) {
    return this.messagingService.onMediaProcessed(event)
  }
}
