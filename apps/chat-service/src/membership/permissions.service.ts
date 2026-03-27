import { Injectable } from '@nestjs/common'
import type { ChatMember } from '@phantom/database'

type PermissionKey = keyof Pick<
  ChatMember,
  | 'canSendMessages'
  | 'canSendMedia'
  | 'canSendPolls'
  | 'canAddUsers'
  | 'canPinMessages'
  | 'canManageChat'
  | 'canDeleteMessages'
  | 'canBanUsers'
>

@Injectable()
export class PermissionsService {
  /** Owners and admins get elevated permissions; members get only send permissions */
  getDefaultPermissions(role: 'owner' | 'admin' | 'member' | 'restricted' | 'left' | 'banned') {
    switch (role) {
      case 'owner':
        return {
          canSendMessages: true,
          canSendMedia: true,
          canSendPolls: true,
          canAddUsers: true,
          canPinMessages: true,
          canManageChat: true,
          canDeleteMessages: true,
          canBanUsers: true,
        }
      case 'admin':
        return {
          canSendMessages: true,
          canSendMedia: true,
          canSendPolls: true,
          canAddUsers: true,
          canPinMessages: true,
          canManageChat: true,
          canDeleteMessages: true,
          canBanUsers: false,
        }
      case 'member':
        return {
          canSendMessages: true,
          canSendMedia: true,
          canSendPolls: true,
          canAddUsers: false,
          canPinMessages: false,
          canManageChat: false,
          canDeleteMessages: false,
          canBanUsers: false,
        }
      default:
        return {
          canSendMessages: false,
          canSendMedia: false,
          canSendPolls: false,
          canAddUsers: false,
          canPinMessages: false,
          canManageChat: false,
          canDeleteMessages: false,
          canBanUsers: false,
        }
    }
  }

  hasPermission(member: ChatMember | null, permission: PermissionKey): boolean {
    if (!member) return false
    if (member.role === 'banned' || member.role === 'left') return false
    return member[permission] === true
  }
}
