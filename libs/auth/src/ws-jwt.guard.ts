import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { WsException } from '@nestjs/websockets'
import type { JwtPayload } from './jwt-payload.type'

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient()
    const token: string | undefined =
      client.handshake?.auth?.token ??
      client.handshake?.headers?.authorization?.replace('Bearer ', '')

    if (!token) throw new WsException('Missing token')

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow('JWT_SECRET'),
      })
      client.data.user = payload
      return true
    } catch {
      throw new WsException('Invalid token')
    }
  }
}
