import React from 'react'
import { NavLink as RouterNavLink } from 'react-router-dom'
import {
  Stack, Tooltip, UnstyledButton, Divider, Box,
} from '@mantine/core'
import {
  MessageSquare, BookOpen, Settings, Zap,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth.store'
import { Avatar } from '@/components/ui/Avatar'

const NAV_ITEMS = [
  { to: '/chats',   icon: MessageSquare, label: 'Chats' },
  { to: '/stories', icon: BookOpen,       label: 'Stories' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <Tooltip label={label} position="right" withArrow>
      <RouterNavLink to={to} style={{ textDecoration: 'none' }}>
        {({ isActive }) => (
          <UnstyledButton
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? '#3b82f6' : 'transparent',
              color: isActive ? '#fff' : '#6b7280',
              transition: 'background-color 150ms, color 150ms',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#242424'
                e.currentTarget.style.color = '#f0f0f0'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = '#6b7280'
              }
            }}
          >
            <Icon size={20} />
          </UnstyledButton>
        )}
      </RouterNavLink>
    </Tooltip>
  )
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)

  return (
    <Box
      style={{
        width: 64,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 0',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        backgroundColor: '#1a1a1a',
        gap: 8,
      }}
    >
      {/* Logo */}
      <Box
        style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: '#3b82f6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Zap size={20} color="#fff" />
      </Box>

      {/* Nav */}
      <Stack gap={4} align="center" style={{ flex: 1 }}>
        {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}
      </Stack>

      <Divider w={36} color="rgba(255,255,255,0.07)" />

      {/* Bottom */}
      <Stack gap={8} align="center" mt={8}>
        <Tooltip label="Settings" position="right" withArrow>
          <RouterNavLink to="/profile" style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <UnstyledButton
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? '#fff' : '#6b7280',
                  transition: 'background-color 150ms, color 150ms',
                }}
              >
                <Settings size={20} />
              </UnstyledButton>
            )}
          </RouterNavLink>
        </Tooltip>

        {user && (
          <RouterNavLink to="/profile">
            <Avatar name={user.displayName} emoji={user.avatarEmoji ?? undefined} color={user.avatarColor ?? undefined} size={36} />
          </RouterNavLink>
        )}
      </Stack>
    </Box>
  )
}
