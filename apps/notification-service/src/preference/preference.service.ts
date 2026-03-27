import { Inject, Injectable } from '@nestjs/common'
import { and, eq, inArray, isNotNull } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'
import type { UserSettings } from '../../../../src/database/schema'

type NotifyPref = keyof Pick<
  UserSettings,
  'notifyMessages' | 'notifyGroups' | 'notifyChannels'
>

@Injectable()
export class PreferenceService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  /** Returns user IDs from the list who have the given notification preference enabled,
   *  excluding the sender */
  async filterRecipients(
    userIds: string[],
    senderId: string | null,
    pref: NotifyPref,
  ): Promise<string[]> {
    const candidates = senderId ? userIds.filter((id) => id !== senderId) : userIds
    if (!candidates.length) return []

    const settings = await this.db
      .select({ userId: schema.userSettings.userId })
      .from(schema.userSettings)
      .where(
        and(
          inArray(schema.userSettings.userId, candidates),
          eq(schema.userSettings[pref], true),
        ),
      )

    return settings.map((s) => s.userId)
  }

  /** Returns push token + platform for each user's active sessions */
  async getActivePushTokens(userIds: string[]) {
    if (!userIds.length) return []

    const sessions = await this.db
      .select({
        token: schema.sessions.pushToken,
        platform: schema.sessions.platform,
      })
      .from(schema.sessions)
      .where(
        and(
          inArray(schema.sessions.userId, userIds),
          eq(schema.sessions.isActive, true),
          isNotNull(schema.sessions.pushToken),
        ),
      )

    return sessions.filter((s) => s.token) as { token: string; platform: 'ios' | 'android' | 'web' | 'desktop' }[]
  }
}
