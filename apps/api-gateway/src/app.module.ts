import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ThrottlerModule } from '@nestjs/throttler'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { DatabaseModule } from '@phantom/database'
import { RedisModule } from '@phantom/redis'
import { JwtStrategy } from '@phantom/auth'
import { AuthController } from './controllers/auth.controller'
import { UsersController } from './controllers/users.controller'
import { ChatsController } from './controllers/chats.controller'
import { MessagesController } from './controllers/messages.controller'
import { MediaController } from './controllers/media.controller'
import { StoriesController } from './controllers/stories.controller'
import { ChatGateway } from './gateways/chat.gateway'
import { PresenceGateway } from './gateways/presence.gateway'

const redisTransport = (channel: string) => ({
  provide: channel,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    transport: Transport.REDIS,
    options: {
      host: config.getOrThrow('REDIS_HOST'),
      port: config.get('REDIS_PORT', 6379),
    },
  }),
})

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    RedisModule.forRootAsync(),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ClientsModule.registerAsync([
      {
        name: 'AUTH_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
        }),
      },
      {
        name: 'CHAT_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
        }),
      },
      {
        name: 'MESSAGING_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
        }),
      },
      {
        name: 'MEDIA_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
        }),
      },
      {
        name: 'STORY_SERVICE',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.REDIS,
          options: { host: config.getOrThrow('REDIS_HOST'), port: config.get('REDIS_PORT', 6379) },
        }),
      },
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
    ChatsController,
    MessagesController,
    MediaController,
    StoriesController,
  ],
  providers: [JwtStrategy, ChatGateway, PresenceGateway],
})
export class AppModule {}
