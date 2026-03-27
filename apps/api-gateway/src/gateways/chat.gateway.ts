import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Inject, Logger, UseGuards } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { REDIS_CLIENT } from '@phantom/redis'
import { WsJwtGuard, CurrentUserWs, JwtPayload } from '@phantom/auth'
import { MESSAGING_PATTERNS, MESSAGE_EVENTS } from '@phantom/contracts'
import type {
  MessageCreatedEvent,
  MessageEditedEvent,
  MessageDeletedEvent,
  ReactionEvent,
  ReadUpdatedEvent,
  TypingEvent,
} from '@phantom/contracts'

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ChatGateway.name)

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject('MESSAGING_SERVICE') private readonly messagingClient: ClientProxy,
  ) {}

  afterInit(server: Server) {
    // When a namespace is used, NestJS passes the Namespace object here, not the root Server.
    // The adapter must be set on the root Server (accessible via namespace.server).
    const pubClient = this.redis.duplicate()
    const subClient = this.redis.duplicate()
    const rootServer: Server = (server as any).server ?? server
    rootServer.adapter(createAdapter(pubClient, subClient))

    // Subscribe to internal Redis pub/sub channels
    this.subscribeToEvents(subClient)
  }

  private subscribeToEvents(sub: Redis) {
    sub.subscribe(
      MESSAGE_EVENTS.CREATED,
      MESSAGE_EVENTS.EDITED,
      MESSAGE_EVENTS.DELETED,
      MESSAGE_EVENTS.REACTION_ADDED,
      MESSAGE_EVENTS.READ_UPDATED,
    )

    sub.on('message', (channel: string, message: string) => {
      const payload = JSON.parse(message)

      switch (channel) {
        case MESSAGE_EVENTS.CREATED:
          this.fanout<MessageCreatedEvent>(payload, 'message:new', payload.memberIds)
          break
        case MESSAGE_EVENTS.EDITED:
          this.fanout<MessageEditedEvent>(payload, 'message:edited', payload.memberIds)
          break
        case MESSAGE_EVENTS.DELETED:
          this.fanout<MessageDeletedEvent>(payload, 'message:deleted', payload.memberIds)
          break
        case MESSAGE_EVENTS.REACTION_ADDED:
          this.fanout<ReactionEvent>(payload, 'message:reaction', payload.memberIds)
          break
        case MESSAGE_EVENTS.READ_UPDATED: {
          const evt = payload as ReadUpdatedEvent
          this.server.to(`chat:${evt.chatId}`).emit('message:read', evt)
          break
        }
      }
    })
  }

  /** Emit an event to all sockets in personal user rooms */
  private fanout<T>(payload: T, event: string, memberIds: string[]) {
    memberIds.forEach((uid) => {
      this.server.to(`user:${uid}`).emit(event, payload)
    })
  }

  @UseGuards(WsJwtGuard)
  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = client.data.user as JwtPayload
    if (!user) {
      client.disconnect()
      return
    }

    // Join personal room for targeted push
    client.join(`user:${user.sub}`)
    this.logger.log(`Client connected: ${user.sub}`)
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client.data.user as JwtPayload | undefined
    if (user) this.logger.log(`Client disconnected: ${user.sub}`)
  }

  /** Client joins a specific chat room to receive chat-scoped events */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:join')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: string },
  ) {
    client.join(`chat:${dto.chatId}`)
    return { event: 'chat:joined', chatId: dto.chatId }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('chat:leave')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: string },
  ) {
    client.leave(`chat:${dto.chatId}`)
    return { event: 'chat:left', chatId: dto.chatId }
  }

  /** Typing indicator: relayed directly to chat room (no persistence) */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: string; displayName: string },
  ) {
    const user = client.data.user as JwtPayload
    const event: TypingEvent = { chatId: dto.chatId, userId: user.sub, displayName: dto.displayName }
    client.to(`chat:${dto.chatId}`).emit(MESSAGE_EVENTS.TYPING_START, event)
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: string },
  ) {
    const user = client.data.user as JwtPayload
    client.to(`chat:${dto.chatId}`).emit(MESSAGE_EVENTS.TYPING_STOP, { chatId: dto.chatId, userId: user.sub })
  }
}