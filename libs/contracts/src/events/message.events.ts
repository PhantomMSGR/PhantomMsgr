export const MESSAGE_EVENTS = {
  CREATED:          'message.created',
  EDITED:           'message.edited',
  DELETED:          'message.deleted',
  REACTION_ADDED:   'message.reaction.added',
  REACTION_REMOVED: 'message.reaction.removed',
  READ_UPDATED:     'message.read.updated',
  PINNED:           'message.pinned',
  UNPINNED:         'message.unpinned',
  TYPING_START:     'message.typing.start',
  TYPING_STOP:      'message.typing.stop',
} as const

export interface MessageCreatedEvent {
  messageId: string
  chatId: string
  senderId: string | null
  type: string
  text: string | null
  mediaId: string | null
  replyToMessageId: string | null
  createdAt: string
  memberIds: string[]
}

export interface MessageEditedEvent {
  messageId: string
  chatId: string
  text: string | null
  entities: unknown
  editedAt: string
  memberIds: string[]
}

export interface MessageDeletedEvent {
  messageId: string
  chatId: string
  deleteForEveryone: boolean
  memberIds: string[]
}

export interface ReactionEvent {
  messageId: string
  chatId: string
  userId: string
  emoji: string
  reactions: Record<string, number>
  memberIds: string[]
}

export interface ReadUpdatedEvent {
  chatId: string
  userId: string
  lastReadMessageId: string
  unreadCount: number
}

export interface TypingEvent {
  chatId: string
  userId: string
  displayName: string
}
