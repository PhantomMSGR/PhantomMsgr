# PhantomMsgr Mobile

React Native / Expo client for PhantomMsgr.

## Stack

| Layer | Library |
|---|---|
| Framework | Expo SDK 55 + Expo Router (file-based) |
| Language | TypeScript (strict) |
| Styling | NativeWind v4 (Tailwind CSS) |
| Server state | TanStack Query v5 |
| Client state | Zustand v5 |
| HTTP | Axios (auto token refresh interceptor) |
| WebSocket | Socket.IO client v4 |
| Lists | @shopify/flash-list |
| Animations | react-native-reanimated 3 |
| Secure storage | expo-secure-store |
| Media upload | expo-file-system (streaming) |
| Push | expo-notifications (FCM/APNs) |

## Project structure

```
apps/mobile/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root: QueryClient, GestureHandler, auth check
│   ├── +not-found.tsx
│   ├── (auth)/                 # Unauthenticated flow
│   │   ├── _layout.tsx         # Redirects to tabs if already logged in
│   │   ├── welcome.tsx
│   │   ├── register.tsx
│   │   └── recover.tsx
│   └── (app)/                  # Protected flow
│       ├── _layout.tsx         # Redirects to welcome if not logged in
│       └── (tabs)/
│           ├── _layout.tsx     # Bottom tab bar
│           ├── chats/
│           │   ├── index.tsx   # Chat list
│           │   └── [chatId].tsx# Chat room (messages + input)
│           ├── stories/
│           │   └── index.tsx   # Stories feed
│           └── profile/
│               └── index.tsx   # Profile + settings
├── src/
│   ├── api/                    # Pure API functions (axios)
│   │   ├── client.ts           # Axios instance + refresh interceptor
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── chats.ts
│   │   ├── messages.ts
│   │   ├── media.ts
│   │   └── stories.ts
│   ├── store/
│   │   ├── auth.store.ts       # Zustand: auth state + session lifecycle
│   │   └── socket.store.ts     # Zustand: Socket.IO connection + events
│   ├── hooks/
│   │   ├── useInfiniteMessages.ts  # Infinite scroll + socket cache updates
│   │   └── useNotifications.ts    # FCM push token + tap navigation
│   ├── components/
│   │   ├── ui/                 # Reusable primitives (Button, TextInput, Avatar)
│   │   └── chat/               # Chat-specific components
│   ├── lib/
│   │   └── queryClient.ts      # TanStack Query client config
│   ├── types/                  # All TypeScript types (mirrors server DTOs)
│   └── config.ts               # QUERY_KEYS, SECURE_STORE_KEYS, URLs
├── global.css                  # Tailwind directives
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── app.json
└── tsconfig.json
```

## Quick start

```bash
cd apps/mobile

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env to point to your backend

# Start Expo dev server
npm start

# Or target a specific platform
npm run ios
npm run android
```

## Key design decisions

### Authentication
- **Anonymous-first**: no email/phone. A `anonymousToken` (64 hex chars) is the only account credential.
- `anonymousToken` + `refreshToken` → `expo-secure-store` (encrypted, device-bound).
- `accessToken` → Zustand memory only (never persisted, 15 min TTL).
- Axios interceptor automatically refreshes the access token on 401, queuing concurrent requests.

### Real-time
- Socket.IO connects immediately after successful auth, disconnects on logout.
- `useSocketStore` (Zustand) manages the connection and exposes typed event handlers.
- `useInfiniteMessages` registers socket listeners per chat room, directly updates TanStack Query cache without refetching.

### Media uploads
- Two-step: `POST /media/upload-url` → `PUT <presigned-s3-url>` → `POST /media/finalize`.
- `expo-file-system.createUploadTask` streams the file without loading it into JS memory.

### Performance
- `FlashList` for all scrollable lists (virtual rendering, minimal re-renders).
- `memo` on `ChatListItem` and `MessageBubble` to avoid re-renders on parent state changes.
- `useCallback` for all event handlers passed to list items.
- `Reanimated` for micro-animations (button press, message entry).
