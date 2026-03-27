# PhantomMsgr — Client API Reference

> **Version:** 1.0
> **Base URL:** `http://<host>:3000/api/v1`
> **WebSocket:** `ws://<host>:3000/ws`
> **Protocol:** REST + Socket.IO v4

This document is intended for client developers building a PhantomMsgr-compatible application. It covers every HTTP endpoint, every real-time event, the media upload flow, authentication lifecycle, and all data shapes.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication](#2-authentication)
3. [Response Format](#3-response-format)
4. [Error Handling](#4-error-handling)
5. [Users](#5-users)
6. [Chats](#6-chats)
7. [Messages](#7-messages)
8. [Media](#8-media)
9. [Stories](#9-stories)
10. [WebSocket — Real-time Events](#10-websocket--real-time-events)
11. [Push Notifications](#11-push-notifications)
12. [Data Models](#12-data-models)
13. [Enumerations](#13-enumerations)
14. [Pagination](#14-pagination)
15. [Text Entities (Formatting)](#15-text-entities-formatting)
16. [End-to-End Encryption](#16-end-to-end-encryption)
17. [Rate Limits & Best Practices](#17-rate-limits--best-practices)
18. [Quick-Start Example](#18-quick-start-example)

---

## 1. Architecture Overview

```
Client
  │
  ├─ HTTP REST  ──────► api-gateway :3000  ──► auth-service (Redis RPC)
  │                                        ├──► chat-service (Redis RPC)
  │                                        ├──► messaging-service (Redis RPC)
  │                                        ├──► media-service (Redis RPC)
  │                                        └──► story-service (Redis RPC)
  │
  └─ Socket.IO /ws ───► api-gateway :3000  (Redis pub/sub for fan-out)
```

- All HTTP traffic goes through a **single entry point** at `:3000`.
- Real-time events use **Socket.IO** on the same host at the `/ws` namespace.
- Media files are stored in **S3/MinIO**; the server gives the client presigned URLs to upload/download directly — binary data never flows through the API server.

---

## 2. Authentication

### 2.1 Anonymous Identity Model

PhantomMsgr uses an **anonymous-first** auth model. There is no email or phone number. Each registration produces a cryptographically random 64-hex-character `anonymousToken` that the client **must store permanently** — it is the only way to recover an account.

```
Register ──────► get anonymousToken + JWT pair
                 ↓
         store anonymousToken securely (Keychain / Keystore)
                 ↓
         use accessToken for all API calls
                 ↓
accessToken expires (15 min) → use refreshToken to get a new pair
                 ↓
New device / app reinstall → recover with anonymousToken
```

---

### 2.2 POST /auth/register

Creates a new anonymous account.

**Auth required:** No

**Request body:**
```json
{
  "displayName": "Alice",
  "platform": "ios",
  "deviceName": "iPhone 15"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `displayName` | string | ✅ | 1–64 chars |
| `platform` | `"ios" \| "android" \| "web" \| "desktop"` | ✅ | — |
| `deviceName` | string | ❌ | max 128 chars |

**Response `200`:**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayName": "Alice",
      "anonymousToken": "a3f2c1...64hexchars..."
    },
    "session": {
      "id": "661e8400-e29b-41d4-a716-446655440001",
      "deviceName": "iPhone 15",
      "platform": "ios"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "d4e5f6...64hexchars...",
    "expiresIn": 900
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

> ⚠️ **Critical:** Save `anonymousToken` in secure storage immediately. It cannot be retrieved again.

---

### 2.3 POST /auth/recover

Recovers an account on a new device using the saved `anonymousToken`.

**Auth required:** No

**Request body:**
```json
{
  "anonymousToken": "a3f2c1...64hexchars...",
  "platform": "android",
  "deviceName": "Pixel 8"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `anonymousToken` | string | ✅ | exactly 64 hex chars |
| `platform` | string | ✅ | see [Enumerations](#13-enumerations) |
| `deviceName` | string | ❌ | max 128 chars |

**Response `200`:** Same shape as `/auth/register` (without `anonymousToken` in user object).

**Errors:**
- `401` — anonymous token not found
- `403` — account is deleted

---

### 2.4 POST /auth/refresh

Rotates the token pair. Call this when `accessToken` expires (HTTP 401).

**Auth required:** No

**Request body:**
```json
{
  "refreshToken": "d4e5f6...64hexchars..."
}
```

**Response `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "a1b2c3...new token...",
    "expiresAt": "2024-01-15T10:15:00.000Z"
  },
  "timestamp": "..."
}
```

> ⚠️ The old `refreshToken` is **immediately invalidated** after rotation. Store the new one.

**Errors:**
- `401` — token not found or session revoked

---

### 2.5 POST /auth/logout

Revokes the current session.

**Auth required:** Yes (Bearer token)

**Request body:** _(empty)_

**Response `200`:**
```json
{ "data": { "ok": true }, "timestamp": "..." }
```

---

### 2.6 GET /auth/sessions

Returns all active sessions for the current user.

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": [
    {
      "id": "661e8400-...",
      "deviceName": "iPhone 15",
      "platform": "ios",
      "appVersion": "1.0.0",
      "ipAddress": "192.168.1.1",
      "isActive": true,
      "lastActiveAt": "2024-01-15T10:00:00.000Z",
      "createdAt": "2024-01-10T08:00:00.000Z"
    }
  ],
  "timestamp": "..."
}
```

---

### 2.7 DELETE /auth/sessions/:sessionId

Revokes a specific session (remote logout of another device).

**Auth required:** Yes

**Errors:**
- `403` — session does not belong to current user

---

### 2.8 Using the Access Token

Include the token in every authenticated request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

The token expires in **15 minutes** (`expiresIn: 900`). The JWT payload contains:
```json
{
  "sub": "<userId>",
  "sid": "<sessionId>",
  "iat": 1705312800,
  "exp": 1705313700
}
```

---

### 2.9 Two-Factor Authentication (2FA)

2FA uses a numeric PIN stored as a bcrypt hash. If enabled, verify the PIN after issuing tokens:

**POST /auth/2fa/verify** _(via `AUTH_PATTERNS.VERIFY_2FA`)_

```json
{ "pin": "123456" }
```

**Response `200`:**
```json
{ "data": { "verified": true }, "timestamp": "..." }
```

**Errors:** `401` — wrong PIN, `400` — 2FA not enabled

> 2FA setup and disable are managed through user settings (no dedicated endpoint in the current API surface; the client must store and send the PIN when required).

---

## 3. Response Format

Every HTTP response is wrapped in an envelope:

```json
{
  "data": <payload>,
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

On validation errors, the shape is:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [ "displayName: min 1 character" ],
  "timestamp": "..."
}
```

---

## 4. Error Handling

| HTTP Status | Meaning |
|---|---|
| `400` | Bad request — validation failed |
| `401` | Unauthorized — missing or expired token |
| `403` | Forbidden — no permission for this action |
| `404` | Not found |
| `409` | Conflict — e.g., already a member |
| `410` | Gone — resource was deleted |
| `500` | Internal server error |

All errors have the following shape:
```json
{
  "statusCode": 403,
  "message": "Not a member of this chat",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## 5. Users

### 5.1 GET /users/me

Returns the full profile of the authenticated user.

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": {
    "id": "550e8400-...",
    "username": "alice_ph",
    "displayName": "Alice",
    "bio": "Hello world",
    "avatarMediaId": "media-uuid-...",
    "isPremium": false,
    "isVerified": false,
    "isBot": false,
    "isDeleted": false,
    "createdAt": "2024-01-10T08:00:00.000Z",
    "updatedAt": "2024-01-15T09:00:00.000Z"
  }
}
```

---

### 5.2 GET /users/:userId

Returns the public profile of any user.

**Auth required:** No

**Response `200`:**
```json
{
  "data": {
    "id": "550e8400-...",
    "username": "alice_ph",
    "displayName": "Alice",
    "bio": "Hello world",
    "avatarMediaId": "media-uuid-...",
    "isVerified": false,
    "isBot": false
  }
}
```

> Privacy settings (`privacyProfilePhoto`, `privacyLastSeen`, etc.) are applied server-side. Fields may be omitted for users with restricted privacy.

---

### 5.3 PATCH /users/me

Updates the authenticated user's profile.

**Auth required:** Yes

**Request body** (all fields optional):
```json
{
  "displayName": "Alice B.",
  "username": "alice_ph",
  "bio": "Updated bio"
}
```

| Field | Type | Constraints |
|---|---|---|
| `displayName` | string | 1–64 chars |
| `username` | string | 3–32 chars, regex `/^[a-z0-9_]+$/` |
| `bio` | string | max 255 chars |

**Response `200`:** Updated user object.

**Errors:**
- `400` — username contains invalid characters

---

### 5.4 GET /users/me/settings

Returns the full settings object for the authenticated user.

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": {
    "userId": "550e8400-...",
    "privacyLastSeen": "everyone",
    "privacyProfilePhoto": "everyone",
    "privacyOnlineStatus": "everyone",
    "privacyForwards": "everyone",
    "privacyMessages": "everyone",
    "notifyMessages": true,
    "notifyGroups": true,
    "notifyChannels": true,
    "notifySound": true,
    "notifyVibration": true,
    "notifyPreview": true,
    "autoDownloadMobilePhotos": true,
    "autoDownloadMobileVideos": false,
    "autoDownloadMobileDocuments": false,
    "autoDownloadWifiPhotos": true,
    "autoDownloadWifiVideos": true,
    "autoDownloadWifiDocuments": true,
    "theme": "auto",
    "language": "en",
    "twoFactorEnabled": false,
    "twoFactorHint": null
  }
}
```

---

### 5.5 PATCH /users/me/settings

Updates user settings. All fields are optional.

**Auth required:** Yes

**Request body:**
```json
{
  "privacyLastSeen": "contacts",
  "notifyMessages": true,
  "theme": "dark",
  "language": "ru"
}
```

| Field | Type | Values |
|---|---|---|
| `privacyLastSeen` | string | `"everyone"`, `"contacts"`, `"nobody"` |
| `privacyProfilePhoto` | string | same as above |
| `privacyOnlineStatus` | string | same as above |
| `privacyForwards` | string | same as above |
| `privacyMessages` | string | same as above |
| `notifyMessages` | boolean | — |
| `notifyGroups` | boolean | — |
| `notifyChannels` | boolean | — |
| `notifySound` | boolean | — |
| `notifyVibration` | boolean | — |
| `notifyPreview` | boolean | — |
| `theme` | string | `"light"`, `"dark"`, `"auto"` |
| `language` | string | 2-char ISO code |

**Response `200`:** Updated settings object.

---

## 6. Chats

### 6.1 POST /chats

Creates a new chat.

**Auth required:** Yes

**Request body:**
```json
{
  "type": "group",
  "title": "My Group",
  "description": "A cool group",
  "memberIds": ["user-uuid-1", "user-uuid-2"]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | string | ✅ | `"direct"`, `"group"`, `"channel"`, `"saved"` |
| `title` | string | For group/channel | 1–128 chars |
| `description` | string | ❌ | max 255 chars |
| `memberIds` | UUID[] | ❌ | max 200 users added on creation |

**Chat type behaviour:**
- `"direct"` — 1-on-1 chat; `memberIds` should contain exactly one other userId
- `"group"` — group chat with multiple members; creator becomes owner
- `"channel"` — broadcast channel; members cannot send messages
- `"saved"` — personal notes (no members other than creator)

**Response `200`:** [Chat](#chat-object) object.

---

### 6.2 GET /chats

Returns the list of chats for the current user, ordered by most recently updated.

**Auth required:** Yes

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `cursor` | ISO datetime string | — | Cursor from previous page |
| `limit` | number | `20` | Max items per page |

**Response `200`:**
```json
{
  "data": {
    "items": [ /* Chat[] */ ],
    "nextCursor": "2024-01-14T09:00:00.000Z",
    "hasMore": true
  }
}
```

---

### 6.3 GET /chats/:chatId

Returns a single chat by ID.

**Auth required:** Yes

**Errors:**
- `404` — chat not found
- `403` — private chat and user is not a member

**Response `200`:** [Chat](#chat-object) object.

---

### 6.4 PATCH /chats/:chatId

Updates chat metadata. Requires `canManageChat` permission.

**Auth required:** Yes

**Request body** (all optional):
```json
{
  "title": "Renamed Group",
  "description": "New description",
  "isPublic": true,
  "slowModeDelay": 30
}
```

| Field | Type | Notes |
|---|---|---|
| `title` | string | 1–128 chars |
| `description` | string | max 255 chars |
| `isPublic` | boolean | Makes the chat publicly discoverable |
| `slowModeDelay` | number \| null | Seconds between messages per user; `null` to disable |

**Response `200`:** Updated [Chat](#chat-object) object.

**Errors:** `403` — lacks `canManageChat` permission

---

### 6.5 DELETE /chats/:chatId

Deletes the chat permanently. Only the **owner** can do this.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

**Errors:** `403` — not the owner

---

### 6.6 GET /chats/:chatId/members

Returns all active members of the chat.

**Auth required:** Yes (must be a member)

**Response `200`:**
```json
{
  "data": [
    {
      "userId": "550e8400-...",
      "role": "owner",
      "joinedAt": "2024-01-10T08:00:00.000Z",
      "customTitle": "Founder",
      "canSendMessages": true,
      "canSendMedia": true,
      "canAddUsers": true,
      "canPinMessages": true,
      "canManageChat": true,
      "canDeleteMessages": true,
      "canBanUsers": true
    }
  ]
}
```

---

### 6.7 DELETE /chats/:chatId/members/:targetUserId

Removes a member from the chat.

- A user can always remove **themselves** (leave).
- Removing another user requires `canBanUsers` permission.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 6.8 PATCH /chats/:chatId/members/:targetUserId/role

Changes a member's role. Only the **owner** can do this.

**Auth required:** Yes

**Request body:**
```json
{ "role": "admin" }
```

| Value | Description |
|---|---|
| `"admin"` | Can manage chat, pin, delete messages |
| `"member"` | Standard member |

**Response `200`:** `{ "ok": true }`

---

### 6.9 POST /chats/:chatId/members/:targetUserId/ban

Bans a user from the chat. Requires `canBanUsers` permission.

**Auth required:** Yes

**Request body** (all optional):
```json
{
  "bannedUntil": "2024-02-01T00:00:00.000Z"
}
```

- Omit `bannedUntil` for a **permanent ban**.
- Banned users cannot rejoin via invite.

**Response `200`:** `{ "ok": true }`

---

### 6.10 POST /chats/invites

Creates an invite link for a chat. Requires `canAddUsers` permission.

**Auth required:** Yes

**Request body:**
```json
{
  "maxUses": 100,
  "expiresAt": "2024-02-01T00:00:00.000Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `maxUses` | number | Max number of uses; omit for unlimited |
| `expiresAt` | ISO datetime | Expiry time; omit for no expiry |

**Response `200`:**
```json
{
  "data": {
    "id": "invite-uuid",
    "chatId": "chat-uuid",
    "inviteHash": "AbCdEfGh",
    "maxUses": 100,
    "usesCount": 0,
    "expiresAt": "2024-02-01T00:00:00.000Z",
    "isRevoked": false,
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

The invite URL to share: `https://phantom.app/join/<inviteHash>`

---

### 6.11 POST /chats/join/:inviteHash

Joins a chat using an invite hash.

**Auth required:** Yes

**Response `200`:**
```json
{ "data": { "chatId": "chat-uuid", "ok": true } }
```

**Errors:**
- `404` — invite hash not found
- `409` — already a member
- `410` — invite expired, revoked, or max uses reached
- `403` — user is banned

---

## 7. Messages

All message endpoints are scoped under `/chats/:chatId/messages`.

### 7.1 GET /chats/:chatId/messages

Returns message history for a chat, ordered newest-first.

**Auth required:** Yes (must be a member)

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `cursor` | ISO datetime string | — | Cursor from previous page (exclusive) |
| `limit` | number | `20` | Max items; capped at `100` |

**Response `200`:**
```json
{
  "data": {
    "items": [ /* Message[] */ ],
    "nextCursor": "2024-01-14T09:00:00.000Z",
    "hasMore": true
  }
}
```

---

### 7.2 POST /chats/:chatId/messages

Sends a new message.

**Auth required:** Yes (must be a member with `canSendMessages`)

**Request body:**
```json
{
  "type": "text",
  "text": "Hello, world! **bold** _italic_",
  "replyToMessageId": "msg-uuid",
  "ttlSeconds": 300,
  "entities": [
    { "type": "bold", "offset": 13, "length": 6 },
    { "type": "italic", "offset": 21, "length": 6 }
  ]
}
```

| Field | Type | Notes |
|---|---|---|
| `type` | string | Default `"text"`. See [Message Types](#message-types) |
| `text` | string | Max 4096 chars |
| `mediaId` | UUID | Required for photo/video/audio/etc. |
| `replyToMessageId` | UUID | Reply to a specific message |
| `forwardFromMessageId` | UUID | Forward a message |
| `forwardFromChatId` | UUID | Source chat for forward |
| `ttlSeconds` | number | Self-destruct timer (max 604800 = 7 days) |
| `entities` | Entity[] | Text formatting; see [Text Entities](#15-text-entities-formatting) |

**Response `200`:** [Message](#message-object) object.

**Errors:**
- `403` — not a member, or `canSendMessages` is false

---

### 7.3 POST /chats/:chatId/messages/poll

Creates a poll message.

**Auth required:** Yes (must have `canSendPolls`)

**Request body:**
```json
{
  "question": "What's your favourite language?",
  "options": ["TypeScript", "Rust", "Go", "Python"],
  "type": "regular",
  "isAnonymous": true,
  "allowsMultipleAnswers": false
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `question` | string | ✅ | 1–300 chars |
| `options` | string[] | ✅ | 2–10 options, each 1–100 chars |
| `type` | string | ❌ | `"regular"` (default) or `"quiz"` |
| `isAnonymous` | boolean | ❌ | Default `true` |
| `allowsMultipleAnswers` | boolean | ❌ | Default `false` |
| `correctOptionIndex` | number | For quiz | 0-based index of correct option |
| `explanation` | string | For quiz | max 200 chars, shown after vote |

**Response `200`:** [Message](#message-object) object with `type: "poll"`.

---

### 7.4 PATCH /chats/:chatId/messages/:messageId

Edits the text of a message. Only the **sender** can edit.

**Auth required:** Yes

**Request body:**
```json
{
  "text": "Corrected text",
  "entities": []
}
```

**Response `200`:** Updated [Message](#message-object) object.

**Errors:**
- `403` — not the sender
- `404` — message not found
- `410` — message was deleted

---

### 7.5 DELETE /chats/:chatId/messages/:messageId

Deletes a message.

**Auth required:** Yes

**Query parameters:**

| Param | Type | Default | Notes |
|---|---|---|---|
| `forEveryone` | `"true"` \| `"false"` | `"false"` | Delete for all members (sender only) |

**Response `200`:** `{ "ok": true }`

**Errors:**
- `403` — trying to delete another user's message with `forEveryone=true`

---

### 7.6 POST /chats/:chatId/messages/:messageId/react

Adds or replaces an emoji reaction.

**Auth required:** Yes

**Request body:**
```json
{ "emoji": "👍" }
```

**Response `200`:**
```json
{
  "data": {
    "reactions": { "👍": 3, "❤️": 1 }
  }
}
```

---

### 7.7 DELETE /chats/:chatId/messages/:messageId/react

Removes the current user's reaction.

**Auth required:** Yes

**Response `200`:**
```json
{ "data": { "reactions": { "❤️": 1 } } }
```

---

### 7.8 POST /chats/:chatId/messages/:messageId/read

Marks a message as read, updating the unread counter.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 7.9 POST /chats/:chatId/messages/:messageId/pin

Pins a message. Requires `canPinMessages` permission.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 7.10 DELETE /chats/:chatId/messages/:messageId/pin

Unpins a message. Requires `canPinMessages` permission.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 7.11 Poll Voting

**PATCH /chats/:chatId/messages/polls/:pollId/vote** *(sent via messaging patterns)*

```json
{ "optionId": 2 }
```

> Note: The HTTP route for poll voting is dispatched internally. Use the messaging pattern `messaging.poll.vote` or trigger via the WebSocket layer.

---

## 8. Media

Media uploading is a **two-step process**:

```
1. Client → Server:   POST /media/upload-url   → get presigned PUT URL
2. Client → S3:       PUT <presignedUrl>        → upload file bytes directly
3. Client → Server:   POST /media/finalize      → register the upload
```

This avoids routing binary data through the API server.

---

### 8.1 POST /media/upload-url

Get a presigned S3 URL to upload a file.

**Auth required:** Yes

**Request body:**
```json
{
  "type": "photo",
  "mimeType": "image/jpeg",
  "fileName": "photo.jpg"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `type` | string | ✅ | `"photo"`, `"video"`, `"audio"`, `"voice"`, `"video_note"`, `"document"`, `"sticker"`, `"gif"`, `"avatar"`, `"story"` |
| `mimeType` | string | ✅ | MIME type of the file |
| `fileName` | string | ❌ | Original filename, max 255 chars |

**Response `200`:**
```json
{
  "data": {
    "storageKey": "photo/user-id/uuid.jpg",
    "uploadUrl": "https://minio:9000/phantom-media/photo/...?X-Amz-Signature=...",
    "publicUrl": "https://minio:9000/phantom-media/photo/user-id/uuid.jpg"
  }
}
```

---

### 8.2 Upload to S3

Use the `uploadUrl` with a `PUT` request:

```http
PUT <uploadUrl>
Content-Type: image/jpeg
Content-Length: <file size in bytes>

<raw file bytes>
```

No auth headers needed — the URL is pre-signed and expires in 5 minutes.

---

### 8.3 POST /media/finalize

Registers the uploaded file in the database and triggers background processing.

**Auth required:** Yes

**Request body:**
```json
{
  "storageKey": "photo/user-id/uuid.jpg",
  "url": "https://minio:9000/phantom-media/photo/user-id/uuid.jpg",
  "type": "photo",
  "mimeType": "image/jpeg",
  "fileSize": 204800,
  "fileName": "photo.jpg"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `storageKey` | string | ✅ | From step 1 response |
| `url` | string | ✅ | Public URL; valid URL format |
| `type` | string | ✅ | Same `type` as in step 1 |
| `mimeType` | string | ✅ | — |
| `fileSize` | number | ✅ | Bytes, positive integer |
| `fileName` | string | ❌ | — |

**Response `200`:** [Media](#media-object) object.

> After finalization, the server runs background processing (thumbnail generation for images, waveform extraction for voice). The media record is updated asynchronously — poll `GET /media/:mediaId` or listen for real-time updates.

---

### 8.4 GET /media/:mediaId

Returns metadata for a media file.

**Auth required:** No

**Response `200`:** [Media](#media-object) object.

---

### 8.5 GET /media/:mediaId/download

Returns a short-lived presigned download URL (valid for 1 hour).

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": {
    "url": "https://minio:9000/phantom-media/...?X-Amz-Expires=3600&..."
  }
}
```

---

## 9. Stories

Stories are ephemeral — they expire automatically after **24 hours**.

### 9.1 POST /stories

Creates a new story.

**Auth required:** Yes

**Request body:**
```json
{
  "mediaId": "media-uuid",
  "caption": "Beautiful sunset 🌅",
  "privacy": "close_friends",
  "selectedUserIds": [],
  "entities": []
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `mediaId` | UUID | ✅ | Must be an uploaded media item |
| `caption` | string | ❌ | max 2048 chars |
| `privacy` | string | ❌ | Default `"everyone"`. See below |
| `selectedUserIds` | UUID[] | For `selected_users` | List of user IDs who can see it |
| `entities` | Entity[] | ❌ | Text formatting for caption |

**Privacy values:**
- `"everyone"` — visible to all users
- `"contacts"` — only contacts can see
- `"close_friends"` — only close friends list (managed separately)
- `"selected_users"` — only explicit list in `selectedUserIds`

**Response `200`:** [Story](#story-object) object.

---

### 9.2 GET /stories/feed

Returns stories from all users, respecting privacy settings.

**Auth required:** Yes

**Query parameters:**

| Param | Type | Default |
|---|---|---|
| `cursor` | ISO datetime | — |
| `limit` | number | `20` (max `50`) |

**Response `200`:**
```json
{
  "data": {
    "items": [ /* Story[] */ ],
    "nextCursor": "...",
    "hasMore": false
  }
}
```

---

### 9.3 GET /stories/users/:userId

Returns all active (non-expired, non-archived) stories for a specific user.

**Auth required:** Yes

**Response `200`:** `Story[]`

---

### 9.4 DELETE /stories/:storyId

Deletes a story. Owner only.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 9.5 POST /stories/:storyId/archive

Archives a story. It disappears from the feed but stays in the owner's archive.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 9.6 PATCH /stories/:storyId/pin

Pins or unpins a story so it stays visible after expiry.

**Auth required:** Yes

**Request body:**
```json
{ "isPinned": true }
```

**Response `200`:** `{ "ok": true }`

---

### 9.7 POST /stories/:storyId/view

Records a view on a story. Idempotent.

**Auth required:** Yes

**Response `200`:** `{ "ok": true }`

---

### 9.8 GET /stories/:storyId/viewers

Returns the viewer list. Owner only.

**Auth required:** Yes

**Response `200`:**
```json
{
  "data": [
    {
      "viewerId": "user-uuid",
      "reactionEmoji": "❤️",
      "viewedAt": "2024-01-15T10:05:00.000Z"
    }
  ]
}
```

---

### 9.9 POST /stories/:storyId/react

Reacts to a story (visible to owner in the viewer list).

**Auth required:** Yes

**Request body:**
```json
{ "emoji": "🔥" }
```

**Response `200`:** `{ "ok": true }`

---

## 10. WebSocket — Real-time Events

### 10.1 Connection

Connect to the Socket.IO server at:

```
ws://<host>:3000/ws
```

Pass the **access token** as a query parameter or via auth header:

```javascript
// JavaScript / TypeScript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/ws", {
  auth: { token: "<accessToken>" }
  // OR: transports: ['websocket'], extraHeaders: { Authorization: "Bearer <token>" }
});
```

> The token is validated on connection. If invalid, the connection is refused.

---

### 10.2 Chat Room Management

Before receiving messages from a chat, join its room:

#### `chat:join`

```javascript
socket.emit("chat:join", { chatId: "chat-uuid" });
// Server responds:
socket.on("chat:joined", ({ chatId }) => { /* ... */ });
```

#### `chat:leave`

```javascript
socket.emit("chat:leave", { chatId: "chat-uuid" });
// Server responds:
socket.on("chat:left", ({ chatId }) => { /* ... */ });
```

---

### 10.3 Typing Indicators

#### `typing:start`

```javascript
socket.emit("typing:start", {
  chatId: "chat-uuid",
  displayName: "Alice"
});
```

#### `typing:stop`

```javascript
socket.emit("typing:stop", { chatId: "chat-uuid" });
```

---

### 10.4 Incoming Events — Messages

All message events are delivered to members of the relevant chat room.

#### `message:new`

Fired when a new message is sent to any joined chat.

```typescript
socket.on("message:new", (event: MessageCreatedEvent) => {
  // event.messageId, event.chatId, event.senderId, event.text, ...
});
```

```typescript
interface MessageCreatedEvent {
  messageId: string;
  chatId: string;
  senderId: string | null;
  type: MessageType;
  text: string | null;
  mediaId: string | null;
  replyToMessageId: string | null;
  createdAt: string; // ISO
  memberIds: string[];
}
```

---

#### `message:edited`

Fired when a message is edited.

```typescript
socket.on("message:edited", (event: MessageEditedEvent) => { });

interface MessageEditedEvent {
  messageId: string;
  chatId: string;
  text: string | null;
  entities: MessageEntity[];
  editedAt: string; // ISO
  memberIds: string[];
}
```

---

#### `message:deleted`

Fired when a message is deleted.

```typescript
socket.on("message:deleted", (event: MessageDeletedEvent) => { });

interface MessageDeletedEvent {
  messageId: string;
  chatId: string;
  deleteForEveryone: boolean;
  memberIds: string[];
}
```

---

#### `message:reaction`

Fired when a reaction is added to a message.

```typescript
socket.on("message:reaction", (event: ReactionEvent) => { });

interface ReactionEvent {
  messageId: string;
  chatId: string;
  userId: string;
  emoji: string;
  reactions: Record<string, number>; // { "👍": 3, "❤️": 1 }
  memberIds: string[];
}
```

---

#### `message:read`

Fired when a member reads a message. Delivered to the `chat:<chatId>` room.

```typescript
socket.on("message:read", (event: ReadUpdatedEvent) => { });

interface ReadUpdatedEvent {
  chatId: string;
  userId: string;
  lastReadMessageId: string;
  unreadCount: number;
}
```

---

#### `message:typing`

Fired in the chat room when someone is typing.

```typescript
socket.on("message:typing", (event: TypingEvent) => {
  // event.userId, event.chatId, event.displayName
  // No event means they stopped
});

interface TypingEvent {
  chatId: string;
  userId: string;
  displayName: string;
}
```

> The server also emits `"typing:stop"` with `{ chatId, userId }` when typing stops.

---

### 10.5 Incoming Events — Presence

Presence events are delivered to users who have added the target user as a contact.

#### `user:status`

```typescript
socket.on("user:status", (event: UserStatusEvent) => { });

interface UserStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null; // ISO; null if currently online
}
```

> You will also receive `user:status` for your **own account** on other devices.

---

## 11. Push Notifications

Push notifications are sent via **Firebase Cloud Messaging (FCM)** for new messages.

To receive push notifications, register your device's FCM token in the session. Update it via a session update call (or include `pushToken` in the registration payload if supported by the client app version).

### Notification payload

```json
{
  "notification": {
    "title": "New message",
    "body": "Hello, world!"
  },
  "data": {
    "type": "new_message",
    "chatId": "chat-uuid",
    "messageId": "msg-uuid"
  }
}
```

### Android

FCM messages are sent with `priority: "high"`. Use `data`-only messages for silent processing.

### iOS (APNs)

`sound: "default"`, `badge: 1`. Handle background delivery using notification service extensions.

---

## 12. Data Models

### Chat Object

```typescript
interface Chat {
  id: string;
  type: "direct" | "group" | "channel" | "saved";
  title: string | null;
  description: string | null;
  avatarMediaId: string | null;
  createdBy: string | null;
  username: string | null;        // @handle for public chats
  isPublic: boolean;
  inviteHash: string | null;
  memberCount: number;
  messageCount: number;
  lastMessageId: string | null;
  isVerified: boolean;
  slowModeDelay: number | null;   // seconds
  linkedChatId: string | null;
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
}
```

---

### Message Object

```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string | null;        // null for system messages
  type: MessageType;
  text: string | null;
  mediaId: string | null;
  replyToMessageId: string | null;
  forwardFromMessageId: string | null;
  forwardFromChatId: string | null;
  forwardSenderName: string | null; // anonymous forward
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  deleteForEveryone: boolean;
  ttlSeconds: number | null;
  ttlExpiresAt: string | null;
  viewsCount: number;
  forwardsCount: number;
  repliesCount: number;
  reactions: Record<string, number>; // emoji → count
  entities: MessageEntity[];
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### Media Object

```typescript
interface Media {
  id: string;
  uploaderId: string | null;
  type: MediaType;
  storageKey: string;
  url: string;                    // public URL (may need a presigned URL for private files)
  thumbnailKey: string | null;    // set after background processing
  thumbnailUrl: string | null;    // set after background processing
  fileName: string | null;
  mimeType: string;
  fileSize: number;               // bytes
  width: number | null;
  height: number | null;
  duration: number | null;        // seconds for audio/video
  waveform: number[] | null;      // 100 samples 0–255 for voice
  isAnimated: boolean;
  createdAt: string;
}
```

---

### Story Object

```typescript
interface Story {
  id: string;
  userId: string;
  mediaId: string;
  caption: string | null;
  entities: MessageEntity[];
  privacy: StoryPrivacy;
  viewsCount: number;
  reactionsCount: number;
  isPinned: boolean;
  isArchived: boolean;
  expiresAt: string;              // always ~24h from createdAt
  createdAt: string;
}
```

---

### ChatMember Object

```typescript
interface ChatMember {
  chatId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  invitedBy: string | null;
  leftAt: string | null;
  bannedUntil: string | null;
  isMuted: boolean;
  muteUntil: string | null;
  lastReadMessageId: string | null;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  customTitle: string | null;
  // Permissions:
  canSendMessages: boolean;
  canSendMedia: boolean;
  canSendPolls: boolean;
  canAddUsers: boolean;
  canPinMessages: boolean;
  canManageChat: boolean;
  canDeleteMessages: boolean;
  canBanUsers: boolean;
}
```

---

### Poll Object

```typescript
interface Poll {
  id: string;
  messageId: string;
  question: string;
  type: "regular" | "quiz";
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
  correctOptionIndex: number | null;
  explanation: string | null;
  closeDate: string | null;
  isClosed: boolean;
  totalVoterCount: number;
  options: PollOption[];
  createdAt: string;
}

interface PollOption {
  id: number;
  text: string;
  voterCount: number;
  orderIndex: number;
}
```

---

## 13. Enumerations

```typescript
type Platform = "ios" | "android" | "web" | "desktop";

type ChatType = "direct" | "group" | "channel" | "saved";

type MemberRole = "owner" | "admin" | "member" | "restricted" | "left" | "banned";

type MessageType =
  | "text" | "photo" | "video" | "audio" | "voice" | "video_note"
  | "document" | "sticker" | "gif" | "location" | "contact"
  | "poll" | "system" | "service";

type MediaType =
  | "photo" | "video" | "audio" | "voice" | "video_note"
  | "document" | "sticker" | "gif" | "avatar" | "story";

type StoryPrivacy = "everyone" | "contacts" | "close_friends" | "selected_users";

type PrivacyLevel = "everyone" | "contacts" | "nobody";

type Theme = "light" | "dark" | "auto";
```

---

### Permission Matrix

| Permission | owner | admin | member |
|---|---|---|---|
| `canSendMessages` | ✅ | ✅ | ✅ |
| `canSendMedia` | ✅ | ✅ | ✅ |
| `canSendPolls` | ✅ | ✅ | ✅ |
| `canAddUsers` | ✅ | ✅ | ❌ |
| `canPinMessages` | ✅ | ✅ | ❌ |
| `canManageChat` | ✅ | ✅ | ❌ |
| `canDeleteMessages` | ✅ | ✅ | ❌ |
| `canBanUsers` | ✅ | ❌ | ❌ |

Permissions can be overridden per-member by an admin/owner (`restricted` role sets all to `false`).

---

## 14. Pagination

All list endpoints use **cursor-based pagination** based on `updatedAt` / `createdAt` timestamps.

```
GET /chats?limit=20
→ { items: [...20 chats...], nextCursor: "2024-01-14T09:00:00.000Z", hasMore: true }

GET /chats?cursor=2024-01-14T09:00:00.000Z&limit=20
→ { items: [...next 20...], nextCursor: "...", hasMore: false }
```

- Pass `nextCursor` as `cursor` in the next request.
- `hasMore: false` means you have all data.
- Cursors are **exclusive** (the item at the cursor timestamp is not included).

---

## 15. Text Entities (Formatting)

Messages and story captions support inline formatting via `entities` — an array of range-based annotations applied to the `text` field.

```typescript
interface MessageEntity {
  type: EntityType;
  offset: number;   // UTF-16 code unit offset from start of text
  length: number;   // UTF-16 code unit length
  url?: string;     // for "text_link"
  language?: string; // for "pre" / "code" blocks
}

type EntityType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"           // monospace inline
  | "pre"            // monospace block (use language for syntax highlight)
  | "text_link"      // hyperlink with custom display text
  | "mention"        // @username mention
  | "spoiler"        // hidden until tapped
  | "blockquote";
```

**Example:**

```json
{
  "text": "Hello bold world",
  "entities": [
    { "type": "bold", "offset": 6, "length": 4 }
  ]
}
```

Renders: Hello **bold** world

---

## 16. End-to-End Encryption

PhantomMsgr uses **Signal Protocol's X3DH** (Extended Triple Diffie-Hellman) key agreement for optional message-level encryption. When `isEncrypted: true`, `text` is null and `encryptedPayload` contains the ciphertext blob.

### 16.1 Key Types

| Key | Purpose | Lifetime |
|---|---|---|
| **Identity Key (IK)** | Curve25519 long-term key pair | Permanent per device |
| **Signed PreKey (SPK)** | Curve25519 medium-term, Ed25519-signed by IK | Rotate ~weekly |
| **One-Time PreKey (OPK)** | Ephemeral key consumed once per session | Consumed on use |

### 16.2 Key Bundle Upload

Before initiating encrypted sessions, a device must publish its key bundle.

> **Note:** Direct REST endpoints for key management are not yet exposed in the API gateway. The schema supports it (`user_key_bundles`, `one_time_prekeys` tables). Contributions are welcome.

### 16.3 Session Initiation (X3DH)

1. Alice fetches Bob's key bundle (IK + SPK + one OPK).
2. Alice generates ephemeral key pair (EK).
3. Alice computes shared secret:
   ```
   DH1 = DH(Alice_IK, Bob_SPK)
   DH2 = DH(Alice_EK, Bob_IK)
   DH3 = DH(Alice_EK, Bob_SPK)
   DH4 = DH(Alice_EK, Bob_OPK)  // if OPK was available
   SK  = KDF(DH1 || DH2 || DH3 || DH4)
   ```
4. Alice encrypts the first message with SK and includes `senderDeviceId` + her IK + EK public key in the message header.
5. Bob reconstructs SK on receipt and decrypts.

### 16.4 Encrypted Message Fields

```typescript
interface EncryptedMessage extends Message {
  isEncrypted: true;
  text: null;
  encryptedPayload: string; // base64url-encoded ciphertext + MAC + IV
  senderDeviceId: string;   // multi-device routing
}
```

---

## 17. Rate Limits & Best Practices

### Rate Limits

Rate limiting is handled by NestJS Throttler. Default limits (may be overridden in deployment):

| Endpoint group | Limit |
|---|---|
| Auth (register, recover, refresh) | 10 req / min per IP |
| Message send | Controlled by `slowModeDelay` per chat |
| General API | 60 req / min per user |

### Token Refresh Strategy

Implement **proactive refresh**: refresh the token when ~80% of its lifetime has elapsed (at ~12 min, since TTL is 15 min), rather than waiting for a 401.

```javascript
const REFRESH_AT_MS = 12 * 60 * 1000; // 12 minutes

function scheduleRefresh(expiresAt: Date) {
  const delay = expiresAt.getTime() - Date.now() - REFRESH_AT_MS;
  setTimeout(doRefresh, Math.max(delay, 0));
}
```

### WebSocket Reconnection

Configure Socket.IO to reconnect automatically with exponential backoff:

```javascript
const socket = io("http://localhost:3000/ws", {
  auth: { token: getAccessToken() },
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
});

socket.on("connect_error", async (err) => {
  if (err.message === "jwt expired") {
    const newToken = await refreshTokens();
    socket.auth = { token: newToken };
    socket.connect();
  }
});
```

### Media Upload

- Check file size before upload. No hard limit is enforced server-side, but keep uploads under 100 MB for mobile connections.
- The presigned URL is valid for **5 minutes**. Request it immediately before uploading.
- After `POST /media/finalize`, the `thumbnailUrl` and media dimensions are initially `null`. They are populated asynchronously. Listen on the WebSocket or poll `GET /media/:mediaId` to know when processing is complete.

---

## 18. Quick-Start Example

A complete example in TypeScript:

```typescript
import axios from "axios";
import { io, Socket } from "socket.io-client";

const BASE = "http://localhost:3000/api/v1";
let accessToken = "";
let refreshToken = "";
let socket: Socket;

// ── 1. Register ──────────────────────────────────────────────────────────────

const reg = await axios.post(`${BASE}/auth/register`, {
  displayName: "Alice",
  platform: "web",
  deviceName: "Chrome on macOS",
});

const { user, session, accessToken: at, refreshToken: rt, expiresIn } = reg.data.data;

console.log("⚠️  Save this token permanently:", user.anonymousToken);

accessToken  = at;
refreshToken = rt;

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${accessToken}` },
});

// ── 2. Connect to WebSocket ──────────────────────────────────────────────────

socket = io("http://localhost:3000/ws", {
  auth: { token: accessToken },
});

socket.on("connect", () => console.log("WS connected:", socket.id));

// ── 3. Create a group chat ───────────────────────────────────────────────────

const chatRes = await api.post("/chats", {
  type: "group",
  title: "Test Group",
});
const chat = chatRes.data.data;

// ── 4. Join the chat room for real-time events ───────────────────────────────

socket.emit("chat:join", { chatId: chat.id });
socket.on("chat:joined", ({ chatId }) => console.log("Joined room:", chatId));

// ── 5. Listen for new messages ───────────────────────────────────────────────

socket.on("message:new", (msg) => {
  console.log(`[${msg.chatId}] ${msg.senderId}: ${msg.text}`);
});

// ── 6. Send a message ────────────────────────────────────────────────────────

await api.post(`/chats/${chat.id}/messages`, {
  type: "text",
  text: "Hello from the quick-start example!",
});

// ── 7. Send a typing indicator ───────────────────────────────────────────────

socket.emit("typing:start", { chatId: chat.id, displayName: "Alice" });
setTimeout(() => socket.emit("typing:stop", { chatId: chat.id }), 3000);

// ── 8. Upload a photo ────────────────────────────────────────────────────────

// Step 1: get presigned URL
const urlRes = await api.post("/media/upload-url", {
  type: "photo",
  mimeType: "image/jpeg",
  fileName: "photo.jpg",
});
const { storageKey, uploadUrl, publicUrl } = urlRes.data.data;

// Step 2: upload directly to S3 (using fetch / axios with arraybuffer)
const fileBytes = new Uint8Array(/* ... your file bytes ... */);
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  body: fileBytes,
});

// Step 3: finalize
const finalRes = await api.post("/media/finalize", {
  storageKey,
  url: publicUrl,
  type: "photo",
  mimeType: "image/jpeg",
  fileSize: fileBytes.byteLength,
  fileName: "photo.jpg",
});
const media = finalRes.data.data;

// Step 4: send the photo message
await api.post(`/chats/${chat.id}/messages`, {
  type: "photo",
  mediaId: media.id,
  text: "Here is a photo!",
});

// ── 9. Proactive token refresh ───────────────────────────────────────────────

function scheduleRefresh(expiresIn: number) {
  const ms = (expiresIn - 120) * 1000; // refresh 2 min before expiry
  setTimeout(async () => {
    const res = await axios.post(`${BASE}/auth/refresh`, { refreshToken });
    accessToken  = res.data.data.accessToken;
    refreshToken = res.data.data.refreshToken;
    api.defaults.headers.Authorization = `Bearer ${accessToken}`;
    socket.auth = { token: accessToken };
    scheduleRefresh(res.data.data.expiresIn ?? 900);
  }, ms);
}
scheduleRefresh(expiresIn);
```

---

*For bug reports and feature requests, open an issue in the repository.*
