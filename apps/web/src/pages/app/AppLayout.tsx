import React from 'react'
import { Outlet } from 'react-router-dom'
import { Box } from '@mantine/core'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ChatList } from '@/components/chat/ChatList'

export function AppLayout() {
  return (
    <Box style={{ height: '100%', display: 'flex', backgroundColor: '#0f0f0f', overflow: 'hidden' }}>
      {/* Nav bar — 64px */}
      <Sidebar />

      {/* Chat list panel — 300px */}
      <Box
        style={{
          width: 300,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <ChatList />
      </Box>

      {/* Main area — flex 1 */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
