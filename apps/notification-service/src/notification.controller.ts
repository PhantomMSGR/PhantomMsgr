import { Controller } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'
import { MESSAGE_EVENTS, NOTIFICATION_EVENTS } from '@phantom/contracts'
import type { MessageCreatedEvent, SendPushEvent } from '@phantom/contracts'
import { FcmService } from './fcm/fcm.service'
import { PreferenceService } from './preference/preference.service'

@Controller()
export class NotificationController {
  constructor(
    private readonly fcmService: FcmService,
    private readonly preferenceService: PreferenceService,
  ) {}

  /** Triggered when a new message is sent — notifies all members except sender */
  @EventPattern(MESSAGE_EVENTS.CREATED)
  async onMessageCreated(@Payload() event: MessageCreatedEvent) {
    const recipientsWithPrefs = await this.preferenceService.filterRecipients(
      event.memberIds,
      event.senderId,
      'notifyMessages',
    )

    if (!recipientsWithPrefs.length) return

    const sessions = await this.preferenceService.getActivePushTokens(recipientsWithPrefs)

    const title = 'New message'
    const body = event.text?.slice(0, 100) ?? '📎 Attachment'

    await this.fcmService.sendMulticast(sessions, title, body, {
      chatId: event.chatId,
      messageId: event.messageId,
      type: 'new_message',
    })
  }

  /** Explicit push notification trigger from api-gateway or other services */
  @EventPattern(NOTIFICATION_EVENTS.SEND_PUSH)
  async onSendPush(@Payload() event: SendPushEvent) {
    const sessions = await this.preferenceService.getActivePushTokens(event.recipientUserIds)

    await this.fcmService.sendMulticast(sessions, event.title, event.body, event.data)
  }
}
