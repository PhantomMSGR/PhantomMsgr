import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { STORY_PATTERNS } from '@phantom/contracts'
import { StoryService } from './story.service'

@Controller()
export class StoryController {
  constructor(private readonly storyService: StoryService) {}

  @MessagePattern(STORY_PATTERNS.CREATE)
  create(@Payload() dto: any) {
    return this.storyService.createStory(dto)
  }

  @MessagePattern(STORY_PATTERNS.GET_FEED)
  getFeed(@Payload() dto: { viewerId: string; cursor?: string; limit?: number }) {
    return this.storyService.getFeed(dto)
  }

  @MessagePattern(STORY_PATTERNS.GET_BY_USER)
  getByUser(@Payload() dto: { userId: string; viewerId: string }) {
    return this.storyService.getByUser(dto.userId, dto.viewerId)
  }

  @MessagePattern(STORY_PATTERNS.DELETE)
  delete(@Payload() dto: { storyId: string; userId: string }) {
    return this.storyService.deleteStory(dto.storyId, dto.userId)
  }

  @MessagePattern(STORY_PATTERNS.ARCHIVE)
  archive(@Payload() dto: { storyId: string; userId: string }) {
    return this.storyService.archiveStory(dto.storyId, dto.userId)
  }

  @MessagePattern(STORY_PATTERNS.PIN)
  pin(@Payload() dto: { storyId: string; userId: string; isPinned: boolean }) {
    return this.storyService.togglePin(dto.storyId, dto.userId, dto.isPinned)
  }

  @MessagePattern(STORY_PATTERNS.VIEW)
  view(@Payload() dto: { storyId: string; viewerId: string }) {
    return this.storyService.recordView(dto.storyId, dto.viewerId)
  }

  @MessagePattern(STORY_PATTERNS.GET_VIEWERS)
  getViewers(@Payload() dto: { storyId: string; userId: string }) {
    return this.storyService.getViewers(dto.storyId, dto.userId)
  }

  @MessagePattern(STORY_PATTERNS.REACT)
  react(@Payload() dto: { storyId: string; viewerId: string; emoji: string }) {
    return this.storyService.reactToStory(dto)
  }
}
