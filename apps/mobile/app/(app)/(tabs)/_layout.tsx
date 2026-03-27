import React from 'react'
import { StyleSheet } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + bottom,
          paddingBottom: 6 + bottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.32)',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="chats/index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stories/index"
        options={{
          title: 'Stories',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'aperture' : 'aperture-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="chats/[chatId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  )
}
