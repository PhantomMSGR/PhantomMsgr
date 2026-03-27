import { Inject, Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { eq } from 'drizzle-orm'
import { compare, hash } from 'bcryptjs'
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { DRIZZLE } from '@phantom/database'
import * as schema from '../../../../src/database/schema'

@Injectable()
export class TwoFactorService {
  constructor(
    @Inject(DRIZZLE) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  async setPin(userId: string, pin: string, hint?: string) {
    const hashedPin = await hash(pin, 12)
    await this.db
      .update(schema.userSettings)
      .set({
        twoFactorEnabled: true,
        twoFactorHint: hint ?? null,
        pinHash: hashedPin,
      })
      .where(eq(schema.userSettings.userId, userId))
  }

  async verifyPin(userId: string, pin: string): Promise<boolean> {
    const [settings] = await this.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1)

    if (!settings?.twoFactorEnabled) {
      throw new RpcException({ status: 400, message: '2FA not enabled' })
    }

    if (!settings.pinHash) {
      throw new RpcException({ status: 400, message: '2FA PIN not configured' })
    }

    const valid = await compare(pin, settings.pinHash)
    if (!valid) {
      throw new RpcException({ status: 401, message: 'Invalid PIN' })
    }

    return true
  }

  async disablePin(userId: string) {
    await this.db
      .update(schema.userSettings)
      .set({ twoFactorEnabled: false, twoFactorHint: null, pinHash: null })
      .where(eq(schema.userSettings.userId, userId))
  }
}
