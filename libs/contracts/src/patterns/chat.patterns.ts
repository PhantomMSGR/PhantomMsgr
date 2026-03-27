export const CHAT_PATTERNS = {
  CREATE:             { cmd: 'chat.create' },
  GET_BY_ID:          { cmd: 'chat.getById' },
  GET_LIST:           { cmd: 'chat.list' },
  UPDATE:             { cmd: 'chat.update' },
  DELETE:             { cmd: 'chat.delete' },

  GET_MEMBERS:        { cmd: 'chat.members.list' },
  ADD_MEMBER:         { cmd: 'chat.members.add' },
  REMOVE_MEMBER:      { cmd: 'chat.members.remove' },
  UPDATE_MEMBER_ROLE: { cmd: 'chat.members.role.update' },
  BAN_MEMBER:         { cmd: 'chat.members.ban' },

  CREATE_INVITE:      { cmd: 'chat.invite.create' },
  JOIN_BY_INVITE:     { cmd: 'chat.invite.join' },
  REVOKE_INVITE:      { cmd: 'chat.invite.revoke' },
  GET_INVITES:        { cmd: 'chat.invite.list' },

  UPDATE_MEMBER_SETTINGS: { cmd: 'chat.members.settings.update' },

  CHECK_PERMISSION:   { cmd: 'chat.permission.check' },
} as const
