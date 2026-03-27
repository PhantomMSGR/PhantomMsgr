import React from 'react'
import { Center, Stack, Text, Box } from '@mantine/core'
import { MessageSquare } from 'lucide-react'

export function ChatsPage() {
  return (
    <Center style={{ flex: 1, height: '100%' }}>
      <Stack align="center" gap="sm">
        <Box
          style={{
            width: 64, height: 64, borderRadius: 16,
            backgroundColor: '#242424',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <MessageSquare size={28} color="#6b7280" />
        </Box>
        <Text c="dark.2" size="sm">Select a chat to start messaging</Text>
      </Stack>
    </Center>
  )
}
