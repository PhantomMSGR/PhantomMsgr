import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { CHAT_PATTERNS } from '@phantom/contracts'
import { CurrentUser, JwtPayload } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'

const CreateChatSchema = z.object({
  type: z.enum(['direct', 'group', 'channel', 'saved']),
  title: z.string().min(1).max(128).optional(),
  description: z.string().max(255).optional(),
  memberIds: z.array(z.string().uuid()).max(200).optional(),
  avatarEmoji: z.string().max(8).optional().nullable(),
  avatarColor: z.string().max(32).optional().nullable(),
})

const UpdateChatSchema = z.object({
  title: z.string().min(1).max(128).optional(),
  description: z.string().max(255).optional(),
  isPublic: z.boolean().optional(),
  slowModeDelay: z.number().int().min(0).nullable().optional(),
  avatarEmoji: z.string().max(8).optional().nullable(),
  avatarColor: z.string().max(32).optional().nullable(),
  avatarMediaId: z.string().uuid().optional().nullable(),
})

const UpdateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
})

const BanMemberSchema = z.object({
  bannedUntil: z.string().datetime().optional(),
})

const UpdateMemberSettingsSchema = z.object({
  isArchived: z.boolean().optional(),
  isMuted: z.boolean().optional(),
  muteUntil: z.string().datetime().nullable().optional(),
  isPinned: z.boolean().optional(),
})

const CreateInviteSchema = z.object({
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  requiresApproval: z.boolean().optional(),
})

@Controller('chats')
export class ChatsController {
  constructor(
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  @Post()
  create(@Body(new ZodValidationPipe(CreateChatSchema)) dto: any, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.CREATE, { ...dto, createdBy: user.sub }))
  }

  @Get()
  getList(@Query('cursor') cursor: string, @Query('limit') limit: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.GET_LIST, { userId: user.sub, cursor, limit: +limit || 20 }),
    )
  }

  @Get(':chatId')
  getById(@Param('chatId') chatId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.GET_BY_ID, { chatId, userId: user.sub }))
  }

  @Patch(':chatId')
  update(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(UpdateChatSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.UPDATE, { chatId, userId: user.sub, ...dto }))
  }

  @Delete(':chatId')
  delete(@Param('chatId') chatId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.DELETE, { chatId, userId: user.sub }))
  }

  @Patch(':chatId/members/me')
  updateMemberSettings(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(UpdateMemberSettingsSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.UPDATE_MEMBER_SETTINGS, { chatId, userId: user.sub, ...dto }),
    )
  }

  @Get(':chatId/members')
  getMembers(@Param('chatId') chatId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.GET_MEMBERS, { chatId, userId: user.sub }))
  }

  @Post(':chatId/members/:targetUserId')
  addMember(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.ADD_MEMBER, { chatId, targetUserId, requestingUserId: user.sub }),
    )
  }

  @Delete(':chatId/members/:targetUserId')
  removeMember(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.REMOVE_MEMBER, { chatId, targetUserId, requestingUserId: user.sub }),
    )
  }

  @Patch(':chatId/members/:targetUserId/role')
  updateMemberRole(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.UPDATE_MEMBER_ROLE, { chatId, targetUserId, requestingUserId: user.sub, ...dto }),
    )
  }

  @Post(':chatId/members/:targetUserId/ban')
  banMember(
    @Param('chatId') chatId: string,
    @Param('targetUserId') targetUserId: string,
    @Body(new ZodValidationPipe(BanMemberSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(
      this.chatClient.send(CHAT_PATTERNS.BAN_MEMBER, { chatId, targetUserId, requestingUserId: user.sub, ...dto }),
    )
  }

  @Post(':chatId/invites')
  createInvite(
    @Param('chatId') chatId: string,
    @Body(new ZodValidationPipe(CreateInviteSchema)) dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.CREATE_INVITE, { chatId, createdBy: user.sub, ...dto }))
  }

  @Post('join/:inviteHash')
  joinByInvite(@Param('inviteHash') inviteHash: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.chatClient.send(CHAT_PATTERNS.JOIN_BY_INVITE, { inviteHash, userId: user.sub }))
  }
}
