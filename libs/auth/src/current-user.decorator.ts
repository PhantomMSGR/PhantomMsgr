import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { JwtPayload } from './jwt-payload.type'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as JwtPayload
  },
)

export const CurrentUserWs = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const client = ctx.switchToWs().getClient()
    return client.data.user as JwtPayload
  },
)
