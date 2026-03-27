import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { z } from 'zod'
import { AUTH_PATTERNS } from '@phantom/contracts'
import { CurrentUser, JwtPayload } from '@phantom/auth'
import { ZodValidationPipe } from '@phantom/common'
import { DRIZZLE } from '@phantom/database'
import { eq, ilike, or, and, ne } from 'drizzle-orm'
import * as schema from '../../../../src/database/schema'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  username: z.string().min(3).max(32).regex(/^[a-z0-9_]+$/).optional().nullable(),
  bio: z.string().max(255).optional().nullable(),
  avatarEmoji: z.string().max(8).optional().nullable(),
  avatarColor: z.string().max(32).optional().nullable(),
  avatarMediaId: z.string().uuid().optional().nullable(),
})

const UpdateSettingsSchema = z.object({
  privacyLastSeen: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  privacyProfilePhoto: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  privacyOnlineStatus: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  privacyForwards: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  privacyMessages: z.enum(['everyone', 'contacts', 'nobody']).optional(),
  notifyMessages: z.boolean().optional(),
  notifyGroups: z.boolean().optional(),
  notifyChannels: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().length(2).optional(),
})

@Controller('users')
export class UsersController {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
  ) {}

  @Get('search')
  async searchUsers(@Query('q') q: string, @CurrentUser() user: JwtPayload) {
    if (!q || q.trim().length < 2) return []
    const term = `%${q.trim()}%`
    return this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
      })
      .from(schema.users)
      .where(
        and(
          ne(schema.users.id, user.sub),
          or(
            ilike(schema.users.username, term),
            ilike(schema.users.displayName, term),
          ),
        ),
      )
      .limit(20)
  }

  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload) {
    const [profile] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.sub))
      .limit(1)
    return profile
  }

  @Get(':userId')
  async getUser(@Param('userId') userId: string) {
    const [profile] = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        bio: schema.users.bio,
        avatarMediaId: schema.users.avatarMediaId,
        avatarEmoji: schema.users.avatarEmoji,
        avatarColor: schema.users.avatarColor,
        isVerified: schema.users.isVerified,
        isBot: schema.users.isBot,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)
    return profile
  }

  @Delete('me')
  async deleteAccount(@CurrentUser() user: JwtPayload) {
    await this.db
      .update(schema.users)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(schema.users.id, user.sub))
    return { ok: true }
  }

  @Patch('me')
  async updateProfile(
    @Body(new ZodValidationPipe(UpdateProfileSchema)) dto: z.infer<typeof UpdateProfileSchema>,
    @CurrentUser() user: JwtPayload,
  ) {
    const [updated] = await this.db
      .update(schema.users)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(schema.users.id, user.sub))
      .returning()
    return updated
  }

  @Get('me/settings')
  async getSettings(@CurrentUser() user: JwtPayload) {
    const [settings] = await this.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, user.sub))
      .limit(1)
    return settings
  }

  @Patch('me/settings')
  async updateSettings(
    @Body(new ZodValidationPipe(UpdateSettingsSchema)) dto: z.infer<typeof UpdateSettingsSchema>,
    @CurrentUser() user: JwtPayload,
  ) {
    const [updated] = await this.db
      .update(schema.userSettings)
      .set(dto as any)
      .where(eq(schema.userSettings.userId, user.sub))
      .returning()
    return updated
  }
}
