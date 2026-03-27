import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthGuard } from '@/components/AuthGuard'
import { WelcomePage } from '@/pages/auth/WelcomePage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { AppLayout } from '@/pages/app/AppLayout'
import { ChatsPage } from '@/pages/app/ChatsPage'
import { ChatDetailPage } from '@/pages/app/ChatDetailPage'
import { StoriesPage } from '@/pages/app/StoriesPage'
import { ProfilePage } from '@/pages/app/ProfilePage'

export const router = createBrowserRouter([
  // ── Auth (unauthenticated) ─────────────────────────────────────────────────
  { path: '/welcome',  element: <WelcomePage /> },
  { path: '/register', element: <RegisterPage /> },

  // ── App (authenticated) ────────────────────────────────────────────────────
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: [
      { index: true,                    element: <Navigate to="/chats" replace /> },
      { path: 'chats',                  element: <ChatsPage /> },
      { path: 'chats/:chatId',          element: <ChatDetailPage /> },
      { path: 'stories',                element: <StoriesPage /> },
      { path: 'profile',                element: <ProfilePage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])
