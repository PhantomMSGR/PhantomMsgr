import React, { useState } from 'react'
import { LogOut, Copy, Check } from 'lucide-react'
import {
  Box, Stack, Text, Group, ActionIcon, Code, Button, Center,
} from '@mantine/core'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [copied, setCopied] = useState(false)

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!user) return null

  return (
    <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 24px', gap: 24 }}>
      <Avatar name={user.displayName} emoji={user.avatarEmoji ?? undefined} color={user.avatarColor ?? undefined} size={80} />

      <Stack align="center" gap={4}>
        <Text fw={700} size="xl" c="dark.0">{user.displayName}</Text>
        {user.username && (
          <Text size="sm" c="dark.3">@{user.username}</Text>
        )}
        {user.bio && (
          <Text size="sm" c="dark.2" ta="center" style={{ maxWidth: 280 }}>{user.bio}</Text>
        )}
      </Stack>

      {/* Recovery Token */}
      <Box
        style={{
          width: '100%',
          maxWidth: 360,
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <Text size="xs" c="dark.3" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }} mb={8}>
          Recovery Token
        </Text>
        <Group gap={8} wrap="nowrap" align="center">
          <Code
            style={{
              flex: 1, backgroundColor: 'transparent', color: '#9ca3af',
              fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0,
            }}
          >
            {user.id}
          </Code>
          <ActionIcon
            variant="subtle"
            color={copied ? 'green' : 'gray'}
            size="sm"
            style={{ flexShrink: 0 }}
            onClick={() => handleCopy(user.id)}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </ActionIcon>
        </Group>
      </Box>

      {/* Logout */}
      <Box style={{ marginTop: 'auto' }}>
        <Button
          variant="subtle"
          color="red"
          leftSection={<LogOut size={16} />}
          onClick={logout}
        >
          Log out
        </Button>
      </Box>
    </Box>
  )
}
