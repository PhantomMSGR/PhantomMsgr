import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { CHAT_PATTERNS } from '@phantom/contracts'
import { ChatService } from './chat.service'
import { MembershipService } from './membership/membership.service'
import { InviteService } from './invite/invite.service'

@Controller()
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly membershipService: MembershipService,
    private readonly inviteService: InviteService,
  ) {}

  @MessagePattern(CHAT_PATTERNS.CREATE)
  create(@Payload() dto: any) {
    return this.chatService.createChat(dto)
  }

  @MessagePattern(CHAT_PATTERNS.GET_BY_ID)
  getById(@Payload() dto: { chatId: string; userId: string }) {
    return this.chatService.getChatById(dto.chatId, dto.userId)
  }

  @MessagePattern(CHAT_PATTERNS.GET_LIST)
  getList(@Payload() dto: { userId: string; cursor?: string; limit?: number }) {
    return this.chatService.getUserChats(dto.userId, dto.cursor, dto.limit)
  }

  @MessagePattern(CHAT_PATTERNS.UPDATE)
  update(@Payload() dto: any) {
    return this.chatService.updateChat(dto)
  }

  @MessagePattern(CHAT_PATTERNS.DELETE)
  delete(@Payload() dto: { chatId: string; userId: string }) {
    return this.chatService.deleteChat(dto.chatId, dto.userId)
  }

  @MessagePattern(CHAT_PATTERNS.GET_MEMBERS)
  getMembers(@Payload() dto: { chatId: string; userId: string }) {
    return this.membershipService.getMembers(dto.chatId, dto.userId)
  }

  @MessagePattern(CHAT_PATTERNS.ADD_MEMBER)
  addMember(@Payload() dto: { chatId: string; targetUserId: string; requestingUserId: string }) {
    return this.membershipService.addMember(dto)
  }

  @MessagePattern(CHAT_PATTERNS.REMOVE_MEMBER)
  removeMember(@Payload() dto: { chatId: string; targetUserId: string; requestingUserId: string }) {
    return this.membershipService.removeMember(dto)
  }

  @MessagePattern(CHAT_PATTERNS.UPDATE_MEMBER_ROLE)
  updateMemberRole(@Payload() dto: any) {
    return this.membershipService.updateRole(dto)
  }

  @MessagePattern(CHAT_PATTERNS.BAN_MEMBER)
  banMember(@Payload() dto: any) {
    return this.membershipService.banMember(dto)
  }

  @MessagePattern(CHAT_PATTERNS.CREATE_INVITE)
  createInvite(@Payload() dto: any) {
    return this.inviteService.createInvite(dto)
  }

  @MessagePattern(CHAT_PATTERNS.JOIN_BY_INVITE)
  joinByInvite(@Payload() dto: { inviteHash: string; userId: string }) {
    return this.inviteService.joinByInvite(dto.inviteHash, dto.userId)
  }

  @MessagePattern(CHAT_PATTERNS.REVOKE_INVITE)
  revokeInvite(@Payload() dto: { inviteId: string; userId: string }) {
    return this.inviteService.revokeInvite(dto.inviteId, dto.userId)
  }

  @MessagePattern(CHAT_PATTERNS.UPDATE_MEMBER_SETTINGS)
  updateMemberSettings(@Payload() dto: any) {
    return this.membershipService.updateMemberSettings(dto)
  }

  @MessagePattern(CHAT_PATTERNS.CHECK_PERMISSION)
  checkPermission(@Payload() dto: { chatId: string; userId: string; permission: string }) {
    return this.membershipService.checkPermission(dto.chatId, dto.userId, dto.permission as any)
  }
}
