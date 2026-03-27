import { useEffect, useRef } from 'react'
import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

// Configure how notifications are displayed while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Registers for push notifications, returns the Expo push token.
 * Call this in an authenticated context after the user is logged in.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  const tokenData = await Notifications.getExpoPushTokenAsync()
  return tokenData.data
}

/**
 * Hook: listens for notification taps and navigates to the relevant chat.
 */
export function useNotificationNavigation() {
  const responseListener = useRef<Notifications.EventSubscription | null>(null)

  useEffect(() => {
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as {
          type?: string
          chatId?: string
          messageId?: string
        }

        if (data.type === 'new_message' && data.chatId) {
          router.push(`/(app)/(tabs)/chats/${data.chatId}`)
        }
      },
    )

    return () => {
      responseListener.current?.remove()
    }
  }, [])
}
