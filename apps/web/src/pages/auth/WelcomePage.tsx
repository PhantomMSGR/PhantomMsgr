import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import {
  Center, Stack, Box, Text, PasswordInput,
  Button, Divider, Anchor,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useAuthStore } from '@/store/auth.store'

export function WelcomePage() {
  const navigate = useNavigate()
  const recover = useAuthStore((s) => s.recover)

  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    try {
      setLoading(true)
      await recover(token.trim())
      navigate('/')
    } catch {
      notifications.show({
        color: 'red',
        message: 'Invalid recovery token. Check and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Center style={{ minHeight: '100vh', backgroundColor: '#0f0f0f', padding: 16 }}>
      <Box style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <Stack align="center" gap="xs" mb={40}>
          <Box
            style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: '#2563eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Zap size={28} color="#fff" />
          </Box>
          <Stack align="center" gap={4}>
            <Text fw={700} size="xl" c="dark.0">PhantomMsgr</Text>
            <Text size="sm" c="dark.3">Anonymous. Encrypted. Yours.</Text>
          </Stack>
        </Stack>

        {/* Recovery form */}
        <form onSubmit={handleRecover}>
          <Stack gap="sm">
            <PasswordInput
              value={token}
              onChange={(e) => setToken(e.currentTarget.value)}
              placeholder="Enter your recovery token"
              radius="md"
              styles={{
                input: {
                  backgroundColor: '#1a1a1a',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#f0f0f0',
                  '&::placeholder': { color: '#6b7280' },
                  '&:focus': { borderColor: '#3b82f6' },
                },
                innerInput: { color: '#f0f0f0' },
              }}
            />
            <Button
              type="submit"
              fullWidth
              radius="md"
              color="blue"
              loading={loading}
              disabled={!token.trim()}
            >
              Sign in
            </Button>
          </Stack>
        </form>

        <Divider
          my="lg"
          label={<Text size="xs" c="dark.3">or</Text>}
          labelPosition="center"
          color="rgba(255,255,255,0.06)"
        />

        <Button
          component={Link}
          to="/register"
          fullWidth
          radius="md"
          variant="outline"
          color="gray"
          styles={{
            root: {
              borderColor: 'rgba(255,255,255,0.12)',
              color: '#f0f0f0',
              '&:hover': { backgroundColor: '#242424' },
            },
          }}
        >
          Create anonymous account
        </Button>
      </Box>
    </Center>
  )
}
