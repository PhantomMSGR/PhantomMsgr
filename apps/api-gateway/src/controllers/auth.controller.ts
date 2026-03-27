import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { AUTH_PATTERNS } from '@phantom/contracts'
import { CurrentUser, Public } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'
import type { JwtPayload } from '@phantom/auth'

const RegisterSchema = z.object({
  displayName: z.string().min(1).max(64),
  platform: z.enum(['ios', 'android', 'web', 'desktop']),
  deviceName: z.string().max(128).optional(),
})

const RecoverSchema = z.object({
  anonymousToken: z.string().length(64),
  platform: z.enum(['ios', 'android', 'web', 'desktop']),
  deviceName: z.string().max(128).optional(),
})

const RefreshSchema = z.object({ refreshToken: z.string() })

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Public()
  @Post('register')
  register(@Body(new ZodValidationPipe(RegisterSchema)) dto: z.infer<typeof RegisterSchema>) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.REGISTER, dto))
  }

  @Public()
  @Post('recover')
  recover(@Body(new ZodValidationPipe(RecoverSchema)) dto: z.infer<typeof RecoverSchema>) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.RECOVER, dto))
  }

  @Public()
  @Post('refresh')
  refresh(@Body(new ZodValidationPipe(RefreshSchema)) dto: z.infer<typeof RefreshSchema>) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.REFRESH, dto))
  }

  @Post('logout')
  logout(@CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.LOGOUT, { sessionId: user.sid }))
  }

  @Get('sessions')
  getSessions(@CurrentUser() user: JwtPayload) {
    return firstValueFrom(this.authClient.send(AUTH_PATTERNS.GET_SESSIONS, { userId: user.sub }))
  }

  @Delete('sessions/:sessionId')
  revokeSession(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return firstValueFrom(
      this.authClient.send(AUTH_PATTERNS.REVOKE_SESSION, {
        sessionId,
        requestingUserId: user.sub,
      }),
    )
  }
}
