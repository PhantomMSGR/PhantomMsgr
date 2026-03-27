import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as admin from 'firebase-admin'

interface PushSession {
  token: string
  platform: 'ios' | 'android' | 'web' | 'desktop'
}

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name)
  private app: admin.app.App

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const serviceAccount = this.config.get('FCM_SERVICE_ACCOUNT')
    if (!serviceAccount) {
      this.logger.warn('FCM_SERVICE_ACCOUNT not set — push disabled')
      return
    }

    this.app = admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    })
  }

  async sendMulticast(
    sessions: PushSession[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.app || !sessions.length) return

    const tokens = sessions.map((s) => s.token)

    try {
      const result = await this.app.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      })

      if (result.failureCount > 0) {
        this.logger.warn(`Push: ${result.failureCount} failures out of ${tokens.length}`)
      }
    } catch (err) {
      this.logger.error('FCM sendMulticast failed', err)
    }
  }
}
