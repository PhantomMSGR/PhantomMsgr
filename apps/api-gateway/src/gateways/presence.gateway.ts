import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Inject, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'
import { UseGuards } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '@phantom/redis'
import { WsJwtGuard, JwtPayload } from '@phantom/auth'
import { DRIZZLE } from '@phantom/database'
import { and, eq } from 'drizzle-orm'
import * as schema from '../../../../src/database/schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

// Key: user online set in Redis — members are socket IDs
const userOnlineKey = (userId: string) => `presence:online:${userId}`

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class PresenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(PresenceGateway.name)

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  @UseGuards(WsJwtGuard)
  async handleConnection(@ConnectedSocket() client: Socket) {
    const user = client.data.user as JwtPayload | undefined
    if (!user) return

    // Track socket in Redis set + join personal room for targeted events
    await this.redis.sadd(userOnlineKey(user.sub), client.id)
    client.join(`user:${user.sub}`)
    await this.setOnline(user.sub, true)
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const user = client.data.user as JwtPayload | undefined
    if (!user) return

    await this.redis.srem(userOnlineKey(user.sub), client.id)

    // Check if any other sockets remain for this user
    const remaining = await this.redis.scard(userOnlineKey(user.sub))
    if (remaining === 0) {
      await this.setOnline(user.sub, false)
    }
  }

  private async setOnline(userId: string, isOnline: boolean) {
    const lastSeenAt = isOnline ? null : new Date()

    await this.db
      .update(schema.userStatus)
      .set({ isOnline, lastSeenAt, updatedAt: new Date() })
      .where(eq(schema.userStatus.userId, userId))

    const payload = { userId, isOnline, lastSeenAt }

    // Emit to own devices (multi-device sync)
    this.server.to(`user:${userId}`).emit('user:status', payload)

    // Emit only to users who have added this user as a non-blocked contact
    const watchers = await this.db
      .select({ ownerId: schema.contacts.ownerId })
      .from(schema.contacts)
      .where(
        and(
          eq(schema.contacts.contactId, userId),
          eq(schema.contacts.isBlocked, false),
        ),
      )

    for (const { ownerId } of watchers) {
      this.server.to(`user:${ownerId}`).emit('user:status', payload)
    }
  }
}
