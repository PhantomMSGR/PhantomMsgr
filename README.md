<div align="center">

<br/>

```
██████╗ ██╗  ██╗ █████╗ ███╗   ██╗████████╗ ██████╗ ███╗   ███╗
██╔══██╗██║  ██║██╔══██╗████╗  ██║╚══██╔══╝██╔═══██╗████╗ ████║
██████╔╝███████║███████║██╔██╗ ██║   ██║   ██║   ██║██╔████╔██║
██╔═══╝ ██╔══██║██╔══██║██║╚██╗██║   ██║   ██║   ██║██║╚██╔╝██║
██║     ██║  ██║██║  ██║██║ ╚████║   ██║   ╚██████╔╝██║ ╚═╝ ██║
╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝
                ███╗   ███╗███████╗ ██████╗ ██████╗
                ████╗ ████║██╔════╝██╔════╝ ██╔══██╗
                ██╔████╔██║███████╗██║  ███╗██████╔╝
                ██║╚██╔╝██║╚════██║██║   ██║██╔══██╗
                ██║ ╚═╝ ██║███████║╚██████╔╝██║  ██║
                ╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝
```

### *Anonymous. Encrypted. Yours.*

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Expo](https://img.shields.io/badge/Expo-55-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.83-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

<br/>

[Features](#-features) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Mobile App](#-mobile-app) · [API](#-api-reference) · [Contributing](#-contributing)

<br/>

</div>

---

## What is PhantomMsgr?

PhantomMsgr is a **privacy-first, anonymous messaging platform** built for people who believe conversations should stay between the people having them. No phone numbers. No ads. No surveillance.

- **End-to-end encrypted** direct messages powered by TweetNaCl (XSalsa20-Poly1305)
- **Anonymous by design** — register with just a username
- **Real-time** — Socket.io WebSocket gateway with Redis adapter for horizontal scaling
- **Production-ready** microservices architecture deployable with a single `docker compose up`

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 💬 Messaging
- Direct chats, group rooms, broadcast channels
- End-to-end encrypted DMs with key exchange
- Voice messages with waveform visualizer
- Photo, video, audio & document sharing
- Message reactions, replies & pinning
- Read receipts & delivery status
- Ephemeral messages (auto-delete TTL)
- Polls inside chats

</td>
<td width="50%">

### 📱 Mobile Experience
- Dark-first, minimal UI
- Real-time typing indicators
- Offline banner with auto-reconnect
- Swipe-to-archive / swipe-to-delete chats
- In-app media viewer (photos & videos)
- Story feed with 24-hour expiry
- Push notifications via Firebase FCM
- Haptic feedback throughout

</td>
</tr>
<tr>
<td width="50%">

### 📓 Saved Notebooks
- **Local** — device-only notes, zero server contact
- **Cloud** — synced saved messages across devices
- Per-notebook naming and custom avatars
- Visual type badges in the chat list

</td>
<td width="50%">

### 🔒 Privacy & Security
- Anonymous accounts — no PII required
- XSalsa20-Poly1305 E2E encryption (TweetNaCl)
- Short-lived JWT access tokens + refresh rotation
- Presigned S3 URLs — media never proxied through app server
- All services communicate over internal Docker network

</td>
</tr>
</table>

---

## 🏗 Architecture

PhantomMsgr is an **Nx monorepo** containing seven NestJS microservices and an Expo React Native app. Services communicate internally via **Redis RPC transport** (NestJS `ClientProxy`). The mobile client talks only to the **API Gateway**.

```
┌─────────────────────────────────────────────────────────────┐
│                        Mobile Client                         │
│               Expo 55 · React Native 0.83 (New Arch)        │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP + WebSocket (Socket.io)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway :3000                        │
│         JWT Guard · Transform · ZodValidation                │
└──┬──────────┬──────────┬──────────┬──────────┬─────────────┘
   │          │          │          │          │   Redis RPC
   ▼          ▼          ▼          ▼          ▼
 Auth      Chat     Messaging   Media      Story
:3001     :3002      :3003      :3004      :3005
                                              │
                               Notification   │ (Redis consumer only)
                               Service ◄──────┘
                                  │
                               Firebase FCM
```

### Service Map

| Service | Port | Responsibility |
|---|---|---|
| `api-gateway` | **3000** | Public HTTP entry point; proxies all requests via Redis RPC |
| `auth-service` | 3001 | Registration, login, JWT issue/verify, key exchange |
| `chat-service` | 3002 | Chat CRUD, Socket.io gateway, membership, invites |
| `messaging-service` | 3003 | Message CRUD, reactions, pins, polls, TTL |
| `media-service` | 3004 | S3 multipart upload, presigned URLs, duration metadata |
| `story-service` | 3005 | Ephemeral stories, viewer tracking, privacy controls |
| `notification-service` | — | Pure Redis consumer → Firebase FCM push delivery |

### Shared Libraries (`libs/`)

| Package | Purpose |
|---|---|
| `@phantom/database` | Drizzle ORM module + all schema type exports |
| `@phantom/contracts` | Redis message pattern constants shared across services |
| `@phantom/common` | `TransformInterceptor`, `AllExceptionsFilter`, `ZodValidationPipe` |
| `@phantom/auth` | `JwtAuthGuard`, `@Public()` decorator, `WsJwtGuard` |
| `@phantom/redis` | Shared ioredis + Bull queue module |
| `@phantom/ui` | Shared React Native component library (Avatar, Button, Toast…) |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Docker** & **Docker Compose**
- **npm** 10+

### 1 — Clone & install

```bash
git clone https://github.com/your-username/PhantomMsgr.git
cd PhantomMsgr
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
# Set a strong JWT_SECRET — everything else works out of the box
```

### 3 — Start everything

```bash
# Spin up Postgres + Redis + MinIO, run migrations, start all services with hot-reload
npm run dev
```

That's it. The API is live at `http://localhost:3000`.

<details>
<summary><b>Individual commands</b></summary>

```bash
# Infrastructure only (Postgres, Redis, MinIO)
npm run dev:infra

# Stop infrastructure
npm run dev:infra:down

# Build all services
npm run build

# Run all tests
npm test

# Run tests for a single service
npx nx test auth-service
npx nx test chat-service

# Database
npm run db:generate    # generate migration from schema changes
npm run db:migrate     # apply pending migrations
npm run db:studio      # open Drizzle Studio at localhost:4983
```

</details>

---

## 📱 Mobile App

The mobile app lives in `apps/mobile/` with its own `node_modules`.

```bash
cd apps/mobile
npm install

# Start Expo dev server
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npx jest
```

> **Tip:** Copy `apps/mobile/.env.example` → `apps/mobile/.env` and set `EXPO_PUBLIC_API_URL` to your local machine's IP (not `localhost`) so the device/emulator can reach the backend.

### App Structure

```
apps/mobile/
├── app/                     # Expo Router file-based routes
│   ├── _layout.tsx          # Root layout (QueryClient, ToastProvider)
│   ├── (auth)/              # Unauthenticated screens
│   │   ├── welcome.tsx      # Login
│   │   ├── register.tsx     # Sign-up
│   │   └── recover.tsx      # Account recovery
│   └── (app)/               # Protected screens
│       ├── (tabs)/          # Tab navigator
│       │   ├── chats/       # Chat list + chat detail
│       │   ├── stories/     # Story feed
│       │   └── profile/     # Profile & settings
│       ├── local-chat/[id]  # Local notebook screen
│       ├── new-chat.tsx     # Create chat / notebook
│       ├── story-viewer.tsx # Fullscreen story modal
│       └── media-viewer.tsx # Fullscreen media modal
└── src/
    ├── api/                 # axios API client + per-resource modules
    ├── components/          # UI components (chat, story, shared)
    ├── hooks/               # Custom React hooks
    ├── store/               # Zustand stores (auth, crypto, preferences…)
    ├── constants/           # Theme tokens, animation config
    ├── types/               # Global TypeScript types
    └── lib/                 # Crypto utils, React Query client
```

---

## 🛢 Infrastructure

| Service | Image | Purpose |
|---|---|---|
| **PostgreSQL 16** | `postgres:16-alpine` | Primary database |
| **Redis 7** | `redis:7-alpine` | RPC transport, Bull queues, Socket.io adapter, cache |
| **MinIO** | `minio/minio:latest` | S3-compatible object storage for media files |

MinIO bucket `phantom-media` is created automatically on first start. No manual setup required.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JWT_SECRET` | — | **Required.** HS256 signing secret |
| `POSTGRES_PASSWORD` | `phantom` | PostgreSQL password |
| `MINIO_ROOT_USER` | `phantom` | MinIO root user |
| `MINIO_ROOT_PASSWORD` | `phantom_secret` | MinIO root password |
| `S3_PUBLIC_URL` | `http://localhost:9000` | Public base URL for presigned media URLs |
| `FCM_SERVICE_ACCOUNT` | — | Firebase service account JSON (for push notifications) |
| `API_PORT` | `3000` | Public API port |

---

## 🗄 Database Schema

Schema is defined with **Drizzle ORM** in `src/database/schema/` and shared across all services via `@phantom/database`.

```
users ──────────────────────────────────────────────────────┐
  │                                                          │
  ├─► chats ◄──── chat_members ────────────────────────────┘
  │     │
  │     └─► messages ──► media
  │               │
  │               └─► reactions / pins / polls
  │
  ├─► stories ──► story_views
  │
  ├─► encryption_keys
  └─► notification_preferences
```

```bash
# Generate a new migration after editing schema files
npm run db:generate

# Apply migrations (also runs automatically on `npm run dev`)
npm run db:migrate
```

---

## 🔐 End-to-End Encryption

PhantomMsgr uses **TweetNaCl** (XSalsa20-Poly1305) for direct message encryption:

1. On first login the mobile app generates a **Curve25519 key pair** and uploads the public key to `auth-service`
2. Before sending a DM the sender fetches the recipient's public key and derives a shared secret via **Diffie-Hellman**
3. The message is encrypted client-side; the server stores and delivers ciphertext only
4. The private key never leaves the device (stored in Expo SecureStore)

---

## 📡 API Reference

All endpoints are prefixed `/api/v1/`. Full documentation is available in [`docs/CLIENT_API.md`](docs/CLIENT_API.md).

<details>
<summary><b>Auth</b></summary>

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | Public | Create anonymous account |
| `POST` | `/auth/login` | Public | Login, receive tokens |
| `POST` | `/auth/refresh` | Public | Rotate refresh token |
| `POST` | `/auth/logout` | JWT | Invalidate session |
| `GET` | `/auth/me` | JWT | Current user profile |
| `GET` | `/auth/keys/:userId` | JWT | Fetch user's public key |

</details>

<details>
<summary><b>Chats & Messages</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/chats` | List chats with unread counts |
| `POST` | `/chats` | Create direct / group / channel / saved |
| `GET` | `/chats/:id/messages` | Paginated message history |
| `POST` | `/chats/:id/messages` | Send a message |
| `PATCH` | `/chats/:id/messages/:msgId` | Edit a message |
| `DELETE` | `/chats/:id/messages/:msgId` | Delete a message |
| `POST` | `/chats/:id/messages/:msgId/reactions` | Add reaction |
| `GET` | `/chats/:id/pinned` | List pinned messages |

</details>

<details>
<summary><b>Media Upload</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/media/initiate` | Start multipart upload, get upload ID |
| `GET` | `/media/:id/part-url` | Presigned URL for a single part |
| `POST` | `/media/:id/finalize` | Complete upload, store metadata |
| `GET` | `/media/:id/download` | Presigned download URL |

</details>

---

## 🧪 Testing

```bash
# All services
npm test

# Affected only (CI-friendly)
npm run test:affected

# Single service
npx nx test messaging-service --coverage

# Mobile
cd apps/mobile && npx jest --coverage
```

Tests use **jest-expo** preset on mobile and **jest + ts-jest** on the backend. Service tests that touch the database use real Postgres (no mocks) to prevent mock/prod divergence.

---

## 🧩 Tech Stack

<table>
<tr><td><b>Backend</b></td><td>

NestJS 10, TypeScript 5, Drizzle ORM, Socket.io, Bull (Redis queues), Zod, JWT

</td></tr>
<tr><td><b>Mobile</b></td><td>

Expo 55, React Native 0.83 (New Architecture), Expo Router, NativeWind v4, Zustand, React Query, TweetNaCl, expo-audio

</td></tr>
<tr><td><b>Infrastructure</b></td><td>

PostgreSQL 16, Redis 7, MinIO (S3-compatible), Docker Compose, Firebase FCM

</td></tr>
<tr><td><b>Tooling</b></td><td>

Nx monorepo, npm workspaces, ESLint, Jest, EAS Build

</td></tr>
</table>

---

## 📁 Repository Structure

```
PhantomMsgr/
├── apps/
│   ├── api-gateway/          # Public HTTP + WebSocket entry point
│   ├── auth-service/         # Authentication & JWT
│   ├── chat-service/         # Chat rooms & Socket.io gateway
│   ├── messaging-service/    # Messages, reactions, pins, polls
│   ├── media-service/        # S3 upload & presigned URLs
│   ├── notification-service/ # Firebase FCM push delivery
│   ├── story-service/        # Ephemeral stories
│   └── mobile/               # Expo React Native app
├── libs/
│   ├── auth/                 # @phantom/auth
│   ├── common/               # @phantom/common
│   ├── contracts/            # @phantom/contracts
│   ├── database/             # @phantom/database
│   ├── mobile-ui/            # @phantom/ui
│   └── redis/                # @phantom/redis
├── src/
│   └── database/
│       ├── schema/           # Drizzle schema (single source of truth)
│       └── migrations/       # Generated SQL migrations
├── docs/                     # API reference & guides
├── docker-compose.yml        # Full stack
├── docker-compose.infra.yml  # Infrastructure only
└── Dockerfile                # Multi-service build (SERVICE_NAME arg)
```

---

## 🤝 Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes — keep commits small and focused
3. Run the tests: `npm test && cd apps/mobile && npx jest`
4. Open a pull request — describe what changed and why

Please keep PRs scoped. One feature / bug fix per PR makes review much easier.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with privacy in mind. Because some conversations are nobody else's business.

<br/>

⭐ Star the repo if you find it useful

</div>
