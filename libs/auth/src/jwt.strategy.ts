import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '@phantom/redis'
import type { JwtPayload } from './jwt-payload.type'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Check session revocation cache in Redis (O(1), no DB hit)
    const revoked = await this.redis.get(`session:revoked:${payload.sid}`)
    if (revoked) throw new UnauthorizedException('Session revoked')
    return payload
  }
}
