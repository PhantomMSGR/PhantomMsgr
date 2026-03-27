# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax


<!-- nx configuration end-->

---

## Project Overview

PhantomMsgr is an anonymous messaging app. The workspace is an Nx + NestJS monorepo for the backend microservices, with a separate Expo React Native app at `apps/mobile/`.

**Package manager:** npm (root and mobile both use npm)

---

## Common Commands

### Local Development

```bash
# Start everything (infra + all backend services with hot-reload)
npm run dev

# Start everything including the mobile Expo dev server
npm run dev:mobile

# Start only Docker infra (postgres, redis, minio)
npm run dev:infra

# Stop infra
npm run dev:infra:down
```

`npm run dev` auto-copies `.env.example` → `.env` on first run, waits for Postgres, then runs migrations before starting services.

### Build & Test

```bash
# Build all backend services
npm run build

# Build only changed services
npm run build:affected

# Run all tests
npm test

# Run tests for a single project
npx nx test auth-service
npx nx test chat-service

# Run tests for changed projects only
npm run test:affected
```

### Database (Drizzle)

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio (web UI for the DB)
npm run db:studio
```

Schema lives in `src/database/schema/`. Migrations output to `src/database/migrations/`.

### Mobile (Expo)

All mobile commands run from `apps/mobile/` with its own `node_modules`:

```bash
cd apps/mobile
npm run start        # Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npx jest             # Run mobile tests
```

---

## Architecture

### Microservices

All backend services are NestJS apps. Inter-service communication uses **Redis Transport (RPC)** — the API gateway calls downstream services via `ClientProxy` using message patterns defined in `@phantom/contracts`.

| Service | HTTP Port | Role |
|---|---|---|
| `api-gateway` | 3000 | Public HTTP entry point; proxies all requests to downstream services |
| `auth-service` | 3001 | JWT issue/verify, user registration |
| `chat-service` | 3002 | Chat rooms, Socket.io WebSocket gateway (Redis adapter for scaling) |
| `messaging-service` | 3003 | Message CRUD, delivery status, reactions |
| `media-service` | 3004 | File upload/download via MinIO (S3-compatible) |
| `notification-service` | — | Pure Redis consumer; no HTTP. Sends push via Firebase FCM |
| `story-service` | 3005 | Ephemeral stories |

Services marked with an HTTP port are **hybrid apps** — they expose an HTTP `/health` endpoint AND listen as a Redis microservice.

### Shared Libraries (`libs/`)

| Library | Import path | Purpose |
|---|---|---|
| `database` | `@phantom/database` | Drizzle ORM module + re-exports all schema types from `src/database/schema/` |
| `common` | `@phantom/common` | `TransformInterceptor`, `AllExceptionsFilter`, `ZodValidationPipe`, `PaginationDto` |
| `contracts` | `@phantom/contracts` | Redis message pattern constants and event names shared across services |
| `auth` | `@phantom/auth` | `JwtAuthGuard`, `@Public()` decorator |
| `redis` | `@phantom/redis` | Shared Redis module (ioredis + Bull) |

### Key Patterns

- **Auth**: `JwtAuthGuard` is registered globally on `api-gateway`. Routes opt out with `@Public()` from `@phantom/auth`.
- **Responses**: All API responses are wrapped in `{ data, timestamp }` by `TransformInterceptor`.
- **Validation**: Use `ZodValidationPipe` from `@phantom/common` with Zod schemas (not class-validator).
- **Database schema**: Defined once in root `src/database/schema/` and re-exported by `@phantom/database`. Export order in `index.ts` matters (enums first, then tables in dependency order).
- **Real-time**: Socket.io with `@nestjs/platform-socket.io` + `@socket.io/redis-adapter` for multi-instance support in `chat-service`.
- **E2E encryption**: Mobile uses TweetNaCl (`tweetnacl` + `tweetnacl-util`) for end-to-end encryption; key exchange schema is in `src/database/schema/encryption.ts`.

### Mobile App (`apps/mobile/`)

- **Framework**: Expo 55 + React Native 0.83, New Architecture enabled
- **Routing**: Expo Router (file-based). Route groups: `(auth)` for unauthenticated screens, `(app)/(tabs)` for main tabs (chats, stories, profile)
- **Styling**: NativeWind v4 (Tailwind CSS for React Native)
- **State**: Zustand for local state; React Query for server state (with AsyncStorage persistence)
- **API**: axios client + socket.io-client for WebSocket
- **Tests**: jest-expo preset; test files live in `__tests__/` folders alongside the components they test

### Infrastructure

- **PostgreSQL 16** — primary database
- **Redis 7** — microservice transport (RPC), Bull job queues, Socket.io adapter, caching
- **MinIO** — S3-compatible object storage for media files; bucket `phantom-media` is created automatically by `minio-init` on first start
- **Firebase Admin** — push notifications via FCM (set `FCM_SERVICE_ACCOUNT` env var as a JSON string)

### Environment

Copy `.env.example` → `.env` and set `JWT_SECRET` before first run. All other defaults work for local development.
