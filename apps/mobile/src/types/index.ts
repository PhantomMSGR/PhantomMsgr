// ─── Enumerations ─────────────────────────────────────────────────────────────

export type Platform = 'ios' | 'android' | 'web' | 'desktop'

export type ChatType = 'direct' | 'group' | 'channel' | 'saved'

export type MemberRole = 'owner' | 'admin' | 'member' | 'restricted' | 'left' | 'banned'

export type MessageType =
  | 'text'
  | 'photo'
  | 'video'
  | 'audio'
  | 'voice'
  | 'video_note'
  | 'document'
  | 'sticker'
  | 'gif'
  | 'location'
  | 'contact'
  | 'poll'
  | 'system'
  | 'service'

export type MediaType =
  | 'photo'
  | 'video'
  | 'audio'
  | 'voice'
  | 'video_note'
  | 'document'
  | 'sticker'
  | 'gif'
  | 'avatar'
  | 'story'

export type StoryPrivacy = 'everyone' | 'contacts' | 'close_friends' | 'selected_users'
export type PrivacyLevel = 'everyone' | 'contacts' | 'nobody'
export type Theme = 'light' | 'dark' | 'auto'

// ─── Entities ─────────────────────────────────────────────────────────────────

export type EntityType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'code'
  | 'pre'
  | 'text_link'
  | 'mention'
  | 'spoiler'
  | 'blockquote'

export interface MessageEntity {
  type: EntityType
  offset: number
  length: number
  url?: string
  language?: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  username: string | null
  displayName: string
  bio: string | null
  avatarMediaId: string | null
  avatarEmoji: string | null
  avatarColor: string | null
  isPremium: boolean
  isVerified: boolean
  isBot: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  userId: string
  privacyLastSeen: PrivacyLevel
  privacyProfilePhoto: PrivacyLevel
  privacyOnlineStatus: PrivacyLevel
  privacyForwards: PrivacyLevel
  privacyMessages: PrivacyLevel
  notifyMessages: boolean
  notifyGroups: boolean
  notifyChannels: boolean
  notifySound: boolean
  notifyVibration: boolean
  notifyPreview: boolean
  autoDownloadMobilePhotos: boolean
  autoDownloadMobileVideos: boolean
  autoDownloadMobileDocuments: boolean
  autoDownloadWifiPhotos: boolean
  autoDownloadWifiVideos: boolean
  autoDownloadWifiDocuments: boolean
  theme: Theme
  language: string
  twoFactorEnabled: boolean
  twoFactorHint: string | null
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  deviceName: string | null
  platform: Platform
  appVersion: string | null
  ipAddress: string | null
  isActive: boolean
  lastActiveAt: string
  createdAt: string
}

export interface AuthResponse {
  user: User & { anonymousToken?: string }
  session: Session
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface Chat {
  id: string
  type: ChatType
  title: string | null
  description: string | null
  avatarMediaId: string | null
  avatarEmoji: string | null
  avatarColor: string | null
  createdBy: string | null
  username: string | null
  isPublic: boolean
  inviteHash: string | null
  memberCount: number
  messageCount: number
  lastMessageId: string | null
  lastMessageText?: string | null
  lastMessageType?: string | null
  lastMessageAt?: string | null
  peerName?: string | null
  peerUsername?: string | null
  isVerified: boolean
  slowModeDelay: number | null
  linkedChatId: string | null
  createdAt: string
  updatedAt: string
  // Member-specific fields (populated by chat list)
  isArchived?: boolean
  isMuted?: boolean
  muteUntil?: string | null
  isPinned?: boolean
  unreadCount?: number
  // Client-only — not persisted to DB
  savedType?: 'local' | 'remote'
}

export interface ChatMember {
  chatId: string
  userId: string
  role: MemberRole
  joinedAt: string
  invitedBy: string | null
  leftAt: string | null
  bannedUntil: string | null
  isMuted: boolean
  muteUntil: string | null
  lastReadMessageId: string | null
  unreadCount: number
  isPinned: boolean
  isArchived: boolean
  customTitle: string | null
  canSendMessages: boolean
  canSendMedia: boolean
  canSendPolls: boolean
  canAddUsers: boolean
  canPinMessages: boolean
  canManageChat: boolean
  canDeleteMessages: boolean
  canBanUsers: boolean
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  chatId: string
  senderId: string | null
  type: MessageType
  text: string | null
  mediaId: string | null
  media?: Media | null
  replyToMessageId: string | null
  forwardFromMessageId: string | null
  forwardFromChatId: string | null
  forwardSenderName: string | null
  isEdited: boolean
  editedAt: string | null
  isDeleted: boolean
  deletedAt: string | null
  deleteForEveryone: boolean
  ttlSeconds: number | null
  ttlExpiresAt: string | null
  viewsCount: number
  forwardsCount: number
  repliesCount: number
  reactions: Record<string, number>
  entities: MessageEntity[]
  isEncrypted: boolean
  createdAt: string
  updatedAt: string
}

// ─── Media ────────────────────────────────────────────────────────────────────

export interface Media {
  id: string
  uploaderId: string | null
  type: MediaType
  storageKey: string
  url: string
  thumbnailKey: string | null
  thumbnailUrl: string | null
  fileName: string | null
  mimeType: string
  fileSize: number
  width: number | null
  height: number | null
  duration: number | null
  waveform: number[] | null
  isAnimated: boolean
  createdAt: string
}

// ─── Story ────────────────────────────────────────────────────────────────────

export interface Story {
  id: string
  userId: string
  mediaId: string
  media?: Media | null
  caption: string | null
  entities: MessageEntity[]
  privacy: StoryPrivacy
  viewsCount: number
  reactionsCount: number
  isPinned: boolean
  isArchived: boolean
  expiresAt: string
  createdAt: string
}

// ─── Poll ─────────────────────────────────────────────────────────────────────

export interface PollOption {
  id: number
  text: string
  voterCount: number
  orderIndex: number
}

export interface Poll {
  id: string
  messageId: string
  question: string
  type: 'regular' | 'quiz'
  isAnonymous: boolean
  allowsMultipleAnswers: boolean
  correctOptionIndex: number | null
  explanation: string | null
  closeDate: string | null
  isClosed: boolean
  totalVoterCount: number
  options: PollOption[]
  createdAt: string
}

// ─── Paginated Response ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
}

// ─── Message Status (delivery checkmarks) ────────────────────────────────────

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

// ─── Message List Item (grouped list with date separators) ────────────────────

export type MessageListItem =
  | {
      type: 'message'
      message: Message
      isFirst: boolean   // first in a consecutive group from same sender
      isLast: boolean    // last in a consecutive group from same sender
      showAvatar: boolean
    }
  | { type: 'date'; date: string }

// ─── Socket Events ────────────────────────────────────────────────────────────

export interface MessageCreatedEvent {
  messageId: string
  chatId: string
  senderId: string | null
  type: MessageType
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
  entities: MessageEntity[]
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

export interface UserStatusEvent {
  userId: string
  isOnline: boolean
  lastSeenAt: string | null
}
