import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { STORY_PATTERNS } from '@phantom/contracts'
import { CurrentUser, JwtPayload } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'

const CreateStorySchema = z.object({
  mediaId: z.string().uuid(),
  caption: z.string().max(2048).optional(),
  privacy: z.enum(['everyone', 'contacts', 'close_friends', 'selected_users']).default('everyone'),
  selectedUserIds: z.array(z.string().uuid()).optional(),
  entities: z.array(z.any()).optional(),
})

@Controller('stories')
export class StoriesController {
  constructor(
    @Inject('STORY_SERVICE') private readonly storyClient: ClientProxy,
  ) {}

  @Get('feed')
  getFeed(
    @Query('cursor') cursor: string,
    @Query('limit') limit: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.storyClient.send(STORY_PATTERNS.GET_FEED, { viewerId: user.sub, cursor, limit: +limit || 20 }),
    )
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateStorySchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.CREATE, { ...dto, userId: user.sub }))
  }

  @Get('users/:userId')
  getByUser(@Param('userId') userId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.GET_BY_USER, { userId, viewerId: user.sub }))
  }

  @Delete(':storyId')
  delete(@Param('storyId') storyId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.DELETE, { storyId, userId: user.sub }))
  }

  @Post(':storyId/archive')
  archive(@Param('storyId') storyId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.ARCHIVE, { storyId, userId: user.sub }))
  }

  @Patch(':storyId/pin')
  togglePin(
    @Param('storyId') storyId: string,
    @Body() dto: { isPinned: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.storyClient.send(STORY_PATTERNS.PIN, { storyId, userId: user.sub, isPinned: dto.isPinned }),
    )
  }

  @Post(':storyId/view')
  recordView(@Param('storyId') storyId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.VIEW, { storyId, viewerId: user.sub }))
  }

  @Get(':storyId/viewers')
  getViewers(@Param('storyId') storyId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.storyClient.send(STORY_PATTERNS.GET_VIEWERS, { storyId, userId: user.sub }))
  }

  @Post(':storyId/react')
  react(
    @Param('storyId') storyId: string,
    @Body() dto: { emoji: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.storyClient.send(STORY_PATTERNS.REACT, { storyId, viewerId: user.sub, emoji: dto.emoji }),
    )
  }
}
