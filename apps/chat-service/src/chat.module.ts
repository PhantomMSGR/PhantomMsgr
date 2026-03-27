import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { ChatController } from './chat.controller'
import { ChatService } from './chat.service'
import { MembershipService } from './membership/membership.service'
import { PermissionsService } from './membership/permissions.service'
import { InviteService } from './invite/invite.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
  ],
  controllers: [ChatController],
  providers: [ChatService, MembershipService, PermissionsService, InviteService],
})
export class ChatModule {}
