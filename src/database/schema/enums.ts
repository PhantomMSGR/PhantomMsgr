import { pgEnum } from 'drizzle-orm/pg-core'

export const privacyLevelEnum = pgEnum('privacy_level', [
  'everyone',
  'contacts',
  'nobody',
])

export const chatTypeEnum = pgEnum('chat_type', [
  'direct',
  'group',
  'channel',
  'saved',
])

export const memberRoleEnum = pgEnum('member_role', [
  'owner',
  'admin',
  'member',
  'restricted',
  'left',
  'banned',
])

export const messageTypeEnum = pgEnum('message_type', [
  'text',
  'photo',
  'video',
  'audio',
  'voice',
  'video_note',
  'document',
  'sticker',
  'gif',
  'location',
  'contact',
  'poll',
  'system',
  'service',
])

export const mediaTypeEnum = pgEnum('media_type', [
  'photo',
  'video',
  'audio',
  'voice',
  'video_note',
  'document',
  'sticker',
  'gif',
  'avatar',
  'story',
])

export const themeEnum = pgEnum('theme', ['light', 'dark', 'auto'])

export const platformEnum = pgEnum('platform', [
  'ios',
  'android',
  'web',
  'desktop',
])

export const storyPrivacyEnum = pgEnum('story_privacy', [
  'everyone',
  'contacts',
  'close_friends',
  'selected_users',
])

export const pollTypeEnum = pgEnum('poll_type', ['regular', 'quiz'])
