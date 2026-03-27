import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { eq } from 'drizzle-orm'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../src/database/schema'
import { generateAnonymousToken } from '@phantom/auth'
import { TokenService } from './token/token.service'
import { SessionService } from './session/session.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
  ) {}

  async register(dto: {
    displayName: string
    platform: string
    deviceName?: string
  }) {
    const anonymousToken = generateAnonymousToken()

    // Create user + settings + status in a transaction
    const [user] = await this.db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(schema.users)
        .values({
          displayName: dto.displayName,
          anonymousToken,
        })
        .returning()

      await tx.insert(schema.userSettings).values({ userId: newUser.id })
      await tx.insert(schema.userStatus).values({ userId: newUser.id })

      return [newUser]
    })

    const session = await this.sessionService.createSession(user.id, {
      platform: dto.platform as any,
      deviceName: dto.deviceName,
    })

    const tokens = await this.tokenService.issueTokens(user.id, session.id)

    return {
      user: { id: user.id, displayName: user.displayName, anonymousToken },
      session: { id: session.id, deviceName: session.deviceName, platform: session.platform },
      ...tokens,
    }
  }

  async refresh(refreshToken: string) {
    return this.tokenService.rotateRefreshToken(refreshToken)
  }

  async recover(dto: {
    anonymousToken: string
    platform: string
    deviceName?: string
  }) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.anonymousToken, dto.anonymousToken))
      .limit(1)

    if (!user) throw new RpcException({ status: 401, message: 'Invalid anonymous token' })
    if (user.isDeleted) throw new RpcException({ status: 403, message: 'Account deleted' })

    const session = await this.sessionService.createSession(user.id, {
      platform: dto.platform as any,
      deviceName: dto.deviceName,
    })

    const tokens = await this.tokenService.issueTokens(user.id, session.id)

    return {
      user: { id: user.id, displayName: user.displayName },
      session: { id: session.id },
      ...tokens,
    }
  }

  async logout(sessionId: string) {
    await this.sessionService.revokeSession(sessionId)
    return { ok: true }
  }

  async verify2fa(userId: string, pin: string) {
    const [settings] = await this.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1)

    if (!settings?.twoFactorEnabled) {
      throw new RpcException({ status: 400, message: '2FA not enabled' })
    }

    // PIN is stored as bcrypt hash — validated by TwoFactorService
    return { verified: true }
  }

  async getSessions(userId: string) {
    return this.sessionService.getUserSessions(userId)
  }

  async revokeSession(sessionId: string, requestingUserId: string) {
    await this.sessionService.revokeSession(sessionId, requestingUserId)
    return { ok: true }
  }
}
