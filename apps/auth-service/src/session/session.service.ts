import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { and, eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import * as schema from '../../../../src/database/schema'

// Session revocation key TTL matches maximum access token lifetime (15 min)
const REVOCATION_TTL = 15 * 60

@Injectable()
export class SessionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async createSession(
    userId: string,
    opts: { platform?: 'ios' | 'android' | 'web' | 'desktop'; deviceName?: string },
  ) {
    const [session] = await this.db
      .insert(schema.sessions)
      .values({
        userId,
        tokenHash: '',   // will be set by TokenService after session creation
        platform: opts.platform,
        deviceName: opts.deviceName,
      })
      .returning()
    return session
  }

  async revokeSession(sessionId: string, requestingUserId?: string) {
    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1)

    if (!session) throw new RpcException({ status: 404, message: 'Session not found' })
    if (requestingUserId && session.userId !== requestingUserId) {
      throw new RpcException({ status: 403, message: 'Forbidden' })
    }

    await this.db
      .update(schema.sessions)
      .set({ isActive: false })
      .where(eq(schema.sessions.id, sessionId))

    // Write to revocation cache so JwtStrategy rejects in-flight tokens
    await this.redis.set(`session:revoked:${sessionId}`, '1', 'EX', REVOCATION_TTL)
    await this.redis.del(`session:active:${sessionId}`)
  }

  async getUserSessions(userId: string) {
    return this.db
      .select({
        id: schema.sessions.id,
        deviceName: schema.sessions.deviceName,
        platform: schema.sessions.platform,
        appVersion: schema.sessions.appVersion,
        ipAddress: schema.sessions.ipAddress,
        lastActiveAt: schema.sessions.lastActiveAt,
        createdAt: schema.sessions.createdAt,
      })
      .from(schema.sessions)
      .where(
        and(
          eq(schema.sessions.userId, userId),
          eq(schema.sessions.isActive, true),
        ),
      )
  }
}
