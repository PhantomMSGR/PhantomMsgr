import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Copy } from 'lucide-react'
import {
  Center, Stack, Box, Text, TextInput,
  Button, Anchor, ActionIcon, Group, Code,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '@/store/auth.store'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)

  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    try {
      setLoading(true)
      const { anonymousToken: token } = await register(displayName.trim())
      setAnonymousToken(token)
    } catch {
      notifications.show({ color: 'red', message: 'Registration failed. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!anonymousToken) return
    await navigator.clipboard.writeText(anonymousToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (anonymousToken) {
    return (
      <Center style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: 16 }}>
        <Stack align="center" gap="lg" style={{ width: '100%', maxWidth: 360 }}>
          <Box
            style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Check size={28} color="#4ade80" />
          </Box>

          <Stack align="center" gap={4}>
            <Text fw={700} size="xl" c="dark.0">Account created!</Text>
            <Text size="sm" c="dark.2" ta="center">
              Save your recovery token. It's the only way to restore access to your account.
            </Text>
          </Stack>

          <Box
            style={{
              width: '100%',
              backgroundColor: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Text size="xs" c="dark.3" fw={600} tt="uppercase" style={{ letterSpacing: '0.05em' }} mb={8}>
              Recovery Token
            </Text>
            <Group gap={8} wrap="nowrap" align="flex-start">
              <Code
                style={{
                  flex: 1, backgroundColor: 'transparent', color: '#f0f0f0',
                  fontSize: 12, wordBreak: 'break-all', padding: 0,
                }}
              >
                {anonymousToken}
              </Code>
              <ActionIcon
                variant="subtle"
                color={copied ? 'green' : 'gray'}
                size="sm"
                style={{ flexShrink: 0 }}
                onClick={handleCopy}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </ActionIcon>
            </Group>
          </Box>

          <Text size="xs" c="red.4" ta="center">
            ⚠ This token won't be shown again. Store it safely.
          </Text>

          <Button
            fullWidth
            radius="md"
            color="blue"
            onClick={() => navigate('/')}
          >
            Continue
          </Button>
        </Stack>
      </Center>
    )
  }

  return (
    <Center style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: 16 }}>
      <Box style={{ width: '100%', maxWidth: 360 }}>
        <Anchor
          component={Link}
          to="/welcome"
          size="sm"
          c="dark.3"
          style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 32 }}
        >
          <ArrowLeft size={16} /> Back
        </Anchor>

        <Text fw={700} size="xl" c="dark.0" mb={4}>Create account</Text>
        <Text size="sm" c="dark.3" mb={32}>No phone number. No email. Just a name.</Text>

        <form onSubmit={handleRegister}>
          <Stack gap="sm">
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.currentTarget.value)}
              placeholder="Your display name"
              maxLength={64}
              radius="md"
              styles={{
                input: {
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0f0f0',
                  '&::placeholder': { color: '#6b7280' },
                  '&:focus': { borderColor: '#3b82f6' },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              radius="md"
              color="blue"
              loading={loading}
              disabled={!displayName.trim()}
            >
              Create account
            </Button>
          </Stack>
        </form>
      </Box>
    </Center>
  )
}
