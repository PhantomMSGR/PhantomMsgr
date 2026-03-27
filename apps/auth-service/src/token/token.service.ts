import { Inject, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { RpcException } from '@nestjs/microservices'
import { eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import Redis from 'ioredis'
import { randomBytes } from 'crypto'
import { DRIZZLE } from '@phantom/database'
import { REDIS_CLIENT } from '@phantom/redis'
import { hashToken, type JwtPayload } from '@phantom/auth'
import * as schema from '../../../../src/database/schema'

const ACCESS_TTL_SECONDS = 15 * 60      // 15 min
const REFRESH_TTL_DAYS   = 30

@Injectable()
export class TokenService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async issueTokens(userId: string, sessionId: string) {
    const payload: JwtPayload = { sub: userId, sid: sessionId }
    const accessToken = this.jwtService.sign(payload)

    const refreshToken = randomBytes(40).toString('hex')
    const tokenHash = hashToken(refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400 * 1000)

    await this.db
      .update(schema.sessions)
      .set({ tokenHash, lastActiveAt: new Date() })
      .where(eq(schema.sessions.id, sessionId))

    // Cache session as active in Redis for fast JWT validation
    await this.redis.set(
      `session:active:${sessionId}`,
      userId,
      'EX',
      ACCESS_TTL_SECONDS,
    )

    return { accessToken, refreshToken, expiresAt }
  }

  async rotateRefreshToken(refreshToken: string) {
    const tokenHash = hashToken(refreshToken)

    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.tokenHash, tokenHash))
      .limit(1)

    if (!session || !session.isActive) {
      throw new RpcException({ status: 401, message: 'Invalid refresh token' })
    }

    // Revoke old cache entry
    await this.redis.del(`session:active:${session.id}`)

    return this.issueTokens(session.userId, session.id)
  }
}
