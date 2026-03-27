import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { AUTH_PATTERNS } from '@phantom/contracts'
import { AuthService } from './auth.service'

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern(AUTH_PATTERNS.REGISTER)
  register(@Payload() dto: { displayName: string; platform: string; deviceName?: string }) {
    return this.authService.register(dto)
  }

  @MessagePattern(AUTH_PATTERNS.REFRESH)
  refresh(@Payload() dto: { refreshToken: string }) {
    return this.authService.refresh(dto.refreshToken)
  }

  @MessagePattern(AUTH_PATTERNS.RECOVER)
  recover(@Payload() dto: { anonymousToken: string; platform: string; deviceName?: string }) {
    return this.authService.recover(dto)
  }

  @MessagePattern(AUTH_PATTERNS.LOGOUT)
  logout(@Payload() dto: { sessionId: string }) {
    return this.authService.logout(dto.sessionId)
  }

  @MessagePattern(AUTH_PATTERNS.VERIFY_2FA)
  verify2fa(@Payload() dto: { userId: string; pin: string }) {
    return this.authService.verify2fa(dto.userId, dto.pin)
  }

  @MessagePattern(AUTH_PATTERNS.GET_SESSIONS)
  getSessions(@Payload() dto: { userId: string }) {
    return this.authService.getSessions(dto.userId)
  }

  @MessagePattern(AUTH_PATTERNS.REVOKE_SESSION)
  revokeSession(@Payload() dto: { sessionId: string; requestingUserId: string }) {
    return this.authService.revokeSession(dto.sessionId, dto.requestingUserId)
  }
}
