# PhantomMsgr — Справочник клиентского API

> **Версия:** 1.0
> **Base URL:** `http://<host>:3000/api/v1`
> **WebSocket:** `ws://<host>:3000/ws`
> **Протокол:** REST + Socket.IO v4

Этот документ предназначен для разработчиков клиентских приложений, совместимых с PhantomMsgr. Он охватывает все HTTP-эндпоинты, все события реального времени, процесс загрузки медиафайлов, жизненный цикл аутентификации и все форматы данных.

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Аутентификация](#2-аутентификация)
3. [Формат ответов](#3-формат-ответов)
4. [Обработка ошибок](#4-обработка-ошибок)
5. [Пользователи](#5-пользователи)
6. [Чаты](#6-чаты)
7. [Сообщения](#7-сообщения)
8. [Медиафайлы](#8-медиафайлы)
9. [Истории](#9-истории)
10. [WebSocket — события реального времени](#10-websocket--события-реального-времени)
11. [Push-уведомления](#11-push-уведомления)
12. [Модели данных](#12-модели-данных)
13. [Перечисления](#13-перечисления)
14. [Пагинация](#14-пагинация)
15. [Текстовые сущности (форматирование)](#15-текстовые-сущности-форматирование)
16. [Сквозное шифрование](#16-сквозное-шифрование)
17. [Ограничения запросов и рекомендации](#17-ограничения-запросов-и-рекомендации)
18. [Пример быстрого старта](#18-пример-быстрого-старта)

---

## 1. Обзор архитектуры

```
Клиент
  │
  ├─ HTTP REST  ──────► api-gateway :3000  ──► auth-service (Redis RPC)
  │                                        ├──► chat-service (Redis RPC)
  │                                        ├──► messaging-service (Redis RPC)
  │                                        ├──► media-service (Redis RPC)
  │                                        └──► story-service (Redis RPC)
  │
  └─ Socket.IO /ws ───► api-gateway :3000  (Redis pub/sub для fan-out)
```

- Весь HTTP-трафик проходит через **единую точку входа** на `:3000`.
- События реального времени используют **Socket.IO** на том же хосте в пространстве имён `/ws`.
- Медиафайлы хранятся в **S3/MinIO**; сервер выдаёт клиенту пресайнед-URL для загрузки и скачивания напрямую — бинарные данные не проходят через API-сервер.

---

## 2. Аутентификация

### 2.1 Модель анонимной идентификации

PhantomMsgr использует модель **анонимной аутентификации**. Нет ни почты, ни номера телефона. При каждой регистрации генерируется криптографически случайный 64-символьный `anonymousToken` в шестнадцатеричном формате, который клиент **обязан хранить постоянно** — это единственный способ восстановить аккаунт.

```
Регистрация ──────► получить anonymousToken + пару JWT
                    ↓
        сохранить anonymousToken в защищённом хранилище (Keychain / Keystore)
                    ↓
        использовать accessToken для всех запросов к API
                    ↓
accessToken истекает (15 мин) → обновить с помощью refreshToken
                    ↓
Новое устройство / переустановка → восстановить через anonymousToken
```

---

### 2.2 POST /auth/register

Создаёт новый анонимный аккаунт.

**Авторизация:** Не требуется

**Тело запроса:**
```json
{
  "displayName": "Алиса",
  "platform": "ios",
  "deviceName": "iPhone 15"
}
```

| Поле | Тип | Обязательно | Ограничения |
|---|---|---|---|
| `displayName` | string | ✅ | 1–64 символа |
| `platform` | `"ios" \| "android" \| "web" \| "desktop"` | ✅ | — |
| `deviceName` | string | ❌ | макс. 128 символов |

**Ответ `200`:**
```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "displayName": "Алиса",
      "anonymousToken": "a3f2c1...64 hex символа..."
    },
    "session": {
      "id": "661e8400-e29b-41d4-a716-446655440001",
      "deviceName": "iPhone 15",
      "platform": "ios"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "d4e5f6...64 hex символа...",
    "expiresIn": 900
  },
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

> ⚠️ **Критично:** Сохраните `anonymousToken` в защищённом хранилище немедленно. Его нельзя получить повторно.

---

### 2.3 POST /auth/recover

Восстанавливает аккаунт на новом устройстве с помощью сохранённого `anonymousToken`.

**Авторизация:** Не требуется

**Тело запроса:**
```json
{
  "anonymousToken": "a3f2c1...64 hex символа...",
  "platform": "android",
  "deviceName": "Pixel 8"
}
```

| Поле | Тип | Обязательно | Ограничения |
|---|---|---|---|
| `anonymousToken` | string | ✅ | ровно 64 hex-символа |
| `platform` | string | ✅ | см. [Перечисления](#13-перечисления) |
| `deviceName` | string | ❌ | макс. 128 символов |

**Ответ `200`:** Та же структура, что у `/auth/register` (без `anonymousToken` в объекте пользователя).

**Ошибки:**
- `401` — анонимный токен не найден
- `403` — аккаунт удалён

---

### 2.4 POST /auth/refresh

Обновляет пару токенов. Вызывайте, когда `accessToken` истёк (HTTP 401).

**Авторизация:** Не требуется

**Тело запроса:**
```json
{
  "refreshToken": "d4e5f6...64 hex символа..."
}
```

**Ответ `200`:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "a1b2c3...новый токен...",
    "expiresAt": "2024-01-15T10:15:00.000Z"
  },
  "timestamp": "..."
}
```

> ⚠️ Старый `refreshToken` **немедленно аннулируется** после ротации. Сохраните новый.

**Ошибки:**
- `401` — токен не найден или сессия отозвана

---

### 2.5 POST /auth/logout

Отзывает текущую сессию.

**Авторизация:** Да (Bearer-токен)

**Тело запроса:** _(пустое)_

**Ответ `200`:**
```json
{ "data": { "ok": true }, "timestamp": "..." }
```

---

### 2.6 GET /auth/sessions

Возвращает все активные сессии текущего пользователя.

**Авторизация:** Да

**Ответ `200`:**
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

Отзывает конкретную сессию (удалённый выход с другого устройства).

**Авторизация:** Да

**Ошибки:**
- `403` — сессия не принадлежит текущему пользователю

---

### 2.8 Использование токена доступа

Включайте токен в каждый аутентифицированный запрос:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Токен истекает через **15 минут** (`expiresIn: 900`). Полезная нагрузка JWT:
```json
{
  "sub": "<userId>",
  "sid": "<sessionId>",
  "iat": 1705312800,
  "exp": 1705313700
}
```

---

### 2.9 Двухфакторная аутентификация (2FA)

2FA использует числовой PIN, хранящийся в виде bcrypt-хеша. Если включена, верифицируйте PIN после получения токенов:

**POST /auth/2fa/verify** _(через `AUTH_PATTERNS.VERIFY_2FA`)_

```json
{ "pin": "123456" }
```

**Ответ `200`:**
```json
{ "data": { "verified": true }, "timestamp": "..." }
```

**Ошибки:** `401` — неверный PIN, `400` — 2FA не включена

> Включение и отключение 2FA управляется через настройки пользователя (отдельного эндпоинта нет; клиент должен сохранять PIN и отправлять его при необходимости).

---

## 3. Формат ответов

Каждый HTTP-ответ обёрнут в конверт:

```json
{
  "data": <полезная нагрузка>,
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

При ошибках валидации:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [ "displayName: min 1 character" ],
  "timestamp": "..."
}
```

---

## 4. Обработка ошибок

| HTTP-статус | Значение |
|---|---|
| `400` | Bad Request — ошибка валидации |
| `401` | Unauthorized — отсутствует или истёк токен |
| `403` | Forbidden — нет прав на это действие |
| `404` | Not Found — ресурс не найден |
| `409` | Conflict — например, уже является участником |
| `410` | Gone — ресурс был удалён |
| `500` | Internal Server Error |

Все ошибки имеют следующий вид:
```json
{
  "statusCode": 403,
  "message": "Not a member of this chat",
  "timestamp": "2024-01-15T10:00:00.000Z"
}
```

---

## 5. Пользователи

### 5.1 GET /users/me

Возвращает полный профиль аутентифицированного пользователя.

**Авторизация:** Да

**Ответ `200`:**
```json
{
  "data": {
    "id": "550e8400-...",
    "username": "alice_ph",
    "displayName": "Алиса",
    "bio": "Привет, мир",
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

Возвращает публичный профиль любого пользователя.

**Авторизация:** Не требуется

**Ответ `200`:**
```json
{
  "data": {
    "id": "550e8400-...",
    "username": "alice_ph",
    "displayName": "Алиса",
    "bio": "Привет, мир",
    "avatarMediaId": "media-uuid-...",
    "isVerified": false,
    "isBot": false
  }
}
```

> Настройки приватности (`privacyProfilePhoto`, `privacyLastSeen` и т.д.) применяются на стороне сервера. Поля могут отсутствовать для пользователей с ограниченной приватностью.

---

### 5.3 PATCH /users/me

Обновляет профиль аутентифицированного пользователя.

**Авторизация:** Да

**Тело запроса** (все поля опциональны):
```json
{
  "displayName": "Алиса Б.",
  "username": "alice_ph",
  "bio": "Обновлённая биография"
}
```

| Поле | Тип | Ограничения |
|---|---|---|
| `displayName` | string | 1–64 символа |
| `username` | string | 3–32 символа, regex `/^[a-z0-9_]+$/` |
| `bio` | string | макс. 255 символов |

**Ответ `200`:** Обновлённый объект пользователя.

**Ошибки:**
- `400` — имя пользователя содержит недопустимые символы

---

### 5.4 GET /users/me/settings

Возвращает полный объект настроек аутентифицированного пользователя.

**Авторизация:** Да

**Ответ `200`:**
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
    "language": "ru",
    "twoFactorEnabled": false,
    "twoFactorHint": null
  }
}
```

---

### 5.5 PATCH /users/me/settings

Обновляет настройки пользователя. Все поля опциональны.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "privacyLastSeen": "contacts",
  "notifyMessages": true,
  "theme": "dark",
  "language": "ru"
}
```

| Поле | Тип | Значения |
|---|---|---|
| `privacyLastSeen` | string | `"everyone"`, `"contacts"`, `"nobody"` |
| `privacyProfilePhoto` | string | то же |
| `privacyOnlineStatus` | string | то же |
| `privacyForwards` | string | то же |
| `privacyMessages` | string | то же |
| `notifyMessages` | boolean | — |
| `notifyGroups` | boolean | — |
| `notifyChannels` | boolean | — |
| `notifySound` | boolean | — |
| `notifyVibration` | boolean | — |
| `notifyPreview` | boolean | — |
| `theme` | string | `"light"`, `"dark"`, `"auto"` |
| `language` | string | 2-символьный ISO-код |

**Ответ `200`:** Обновлённый объект настроек.

---

## 6. Чаты

### 6.1 POST /chats

Создаёт новый чат.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "type": "group",
  "title": "Моя группа",
  "description": "Крутая группа",
  "memberIds": ["user-uuid-1", "user-uuid-2"]
}
```

| Поле | Тип | Обязательно | Примечания |
|---|---|---|---|
| `type` | string | ✅ | `"direct"`, `"group"`, `"channel"`, `"saved"` |
| `title` | string | Для group/channel | 1–128 символов |
| `description` | string | ❌ | макс. 255 символов |
| `memberIds` | UUID[] | ❌ | макс. 200 пользователей при создании |

**Поведение типов чата:**
- `"direct"` — личная переписка; `memberIds` должен содержать ровно одного другого userId
- `"group"` — групповой чат с несколькими участниками; создатель становится владельцем
- `"channel"` — канал-вещание; участники не могут отправлять сообщения
- `"saved"` — личные заметки (нет других участников кроме создателя)

**Ответ `200`:** Объект [Chat](#объект-chat).

---

### 6.2 GET /chats

Возвращает список чатов текущего пользователя, отсортированных по дате последнего обновления.

**Авторизация:** Да

**Query-параметры:**

| Параметр | Тип | По умолчанию | Примечания |
|---|---|---|---|
| `cursor` | ISO datetime string | — | Курсор предыдущей страницы |
| `limit` | number | `20` | Макс. элементов на странице |

**Ответ `200`:**
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

Возвращает один чат по ID.

**Авторизация:** Да

**Ошибки:**
- `404` — чат не найден
- `403` — приватный чат, и пользователь не является участником

**Ответ `200`:** Объект [Chat](#объект-chat).

---

### 6.4 PATCH /chats/:chatId

Обновляет метаданные чата. Требуется разрешение `canManageChat`.

**Авторизация:** Да

**Тело запроса** (все поля опциональны):
```json
{
  "title": "Переименованная группа",
  "description": "Новое описание",
  "isPublic": true,
  "slowModeDelay": 30
}
```

| Поле | Тип | Примечания |
|---|---|---|
| `title` | string | 1–128 символов |
| `description` | string | макс. 255 символов |
| `isPublic` | boolean | Делает чат публично видимым |
| `slowModeDelay` | number \| null | Секунды между сообщениями на пользователя; `null` — отключить |

**Ответ `200`:** Обновлённый объект [Chat](#объект-chat).

**Ошибки:** `403` — нет разрешения `canManageChat`

---

### 6.5 DELETE /chats/:chatId

Удаляет чат навсегда. Только **владелец** может это сделать.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

**Ошибки:** `403` — не является владельцем

---

### 6.6 GET /chats/:chatId/members

Возвращает всех активных участников чата.

**Авторизация:** Да (нужно быть участником)

**Ответ `200`:**
```json
{
  "data": [
    {
      "userId": "550e8400-...",
      "role": "owner",
      "joinedAt": "2024-01-10T08:00:00.000Z",
      "customTitle": "Основатель",
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

Удаляет участника из чата.

- Пользователь всегда может удалить **самого себя** (выход).
- Удаление другого пользователя требует разрешения `canBanUsers`.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 6.8 PATCH /chats/:chatId/members/:targetUserId/role

Изменяет роль участника. Только **владелец** может это сделать.

**Авторизация:** Да

**Тело запроса:**
```json
{ "role": "admin" }
```

| Значение | Описание |
|---|---|
| `"admin"` | Может управлять чатом, закреплять сообщения, удалять их |
| `"member"` | Стандартный участник |

**Ответ `200`:** `{ "ok": true }`

---

### 6.9 POST /chats/:chatId/members/:targetUserId/ban

Банит пользователя в чате. Требуется разрешение `canBanUsers`.

**Авторизация:** Да

**Тело запроса** (все поля опциональны):
```json
{
  "bannedUntil": "2024-02-01T00:00:00.000Z"
}
```

- Не указывайте `bannedUntil` для **перманентного бана**.
- Забаненные пользователи не могут присоединиться по приглашению.

**Ответ `200`:** `{ "ok": true }`

---

### 6.10 POST /chats/invites

Создаёт ссылку-приглашение для чата. Требуется разрешение `canAddUsers`.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "maxUses": 100,
  "expiresAt": "2024-02-01T00:00:00.000Z"
}
```

| Поле | Тип | Примечания |
|---|---|---|
| `maxUses` | number | Макс. количество использований; без ограничений если не указано |
| `expiresAt` | ISO datetime | Время истечения; без срока если не указано |

**Ответ `200`:**
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

URL приглашения для распространения: `https://phantom.app/join/<inviteHash>`

---

### 6.11 POST /chats/join/:inviteHash

Присоединяется к чату по хешу приглашения.

**Авторизация:** Да

**Ответ `200`:**
```json
{ "data": { "chatId": "chat-uuid", "ok": true } }
```

**Ошибки:**
- `404` — хеш приглашения не найден
- `409` — уже является участником
- `410` — приглашение истекло, отозвано или исчерпан лимит использований
- `403` — пользователь забанен

---

## 7. Сообщения

Все эндпоинты сообщений находятся под `/chats/:chatId/messages`.

### 7.1 GET /chats/:chatId/messages

Возвращает историю сообщений чата, отсортированную от новых к старым.

**Авторизация:** Да (нужно быть участником)

**Query-параметры:**

| Параметр | Тип | По умолчанию | Примечания |
|---|---|---|---|
| `cursor` | ISO datetime string | — | Курсор предыдущей страницы (исключительный) |
| `limit` | number | `20` | Макс. элементов; ограничен `100` |

**Ответ `200`:**
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

Отправляет новое сообщение.

**Авторизация:** Да (нужно быть участником с `canSendMessages`)

**Тело запроса:**
```json
{
  "type": "text",
  "text": "Привет! **жирный** _курсив_",
  "replyToMessageId": "msg-uuid",
  "ttlSeconds": 300,
  "entities": [
    { "type": "bold", "offset": 8, "length": 6 },
    { "type": "italic", "offset": 16, "length": 6 }
  ]
}
```

| Поле | Тип | Примечания |
|---|---|---|
| `type` | string | По умолчанию `"text"`. См. [Типы сообщений](#типы-сообщений) |
| `text` | string | Макс. 4096 символов |
| `mediaId` | UUID | Обязательно для photo/video/audio/и т.д. |
| `replyToMessageId` | UUID | Ответить на конкретное сообщение |
| `forwardFromMessageId` | UUID | Переслать сообщение |
| `forwardFromChatId` | UUID | Исходный чат для пересылки |
| `ttlSeconds` | number | Таймер самоуничтожения (макс. 604800 = 7 дней) |
| `entities` | Entity[] | Форматирование текста; см. [Текстовые сущности](#15-текстовые-сущности-форматирование) |

**Ответ `200`:** Объект [Message](#объект-message).

**Ошибки:**
- `403` — не участник, или `canSendMessages` равно false

---

### 7.3 POST /chats/:chatId/messages/poll

Создаёт опрос.

**Авторизация:** Да (нужно иметь `canSendPolls`)

**Тело запроса:**
```json
{
  "question": "Какой ваш любимый язык?",
  "options": ["TypeScript", "Rust", "Go", "Python"],
  "type": "regular",
  "isAnonymous": true,
  "allowsMultipleAnswers": false
}
```

| Поле | Тип | Обязательно | Примечания |
|---|---|---|---|
| `question` | string | ✅ | 1–300 символов |
| `options` | string[] | ✅ | 2–10 вариантов, каждый 1–100 символов |
| `type` | string | ❌ | `"regular"` (по умолчанию) или `"quiz"` |
| `isAnonymous` | boolean | ❌ | По умолчанию `true` |
| `allowsMultipleAnswers` | boolean | ❌ | По умолчанию `false` |
| `correctOptionIndex` | number | Для quiz | Индекс правильного ответа (с 0) |
| `explanation` | string | Для quiz | макс. 200 символов, показывается после голосования |

**Ответ `200`:** Объект [Message](#объект-message) с `type: "poll"`.

---

### 7.4 PATCH /chats/:chatId/messages/:messageId

Редактирует текст сообщения. Только **отправитель** может редактировать.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "text": "Исправленный текст",
  "entities": []
}
```

**Ответ `200`:** Обновлённый объект [Message](#объект-message).

**Ошибки:**
- `403` — не является отправителем
- `404` — сообщение не найдено
- `410` — сообщение было удалено

---

### 7.5 DELETE /chats/:chatId/messages/:messageId

Удаляет сообщение.

**Авторизация:** Да

**Query-параметры:**

| Параметр | Тип | По умолчанию | Примечания |
|---|---|---|---|
| `forEveryone` | `"true"` \| `"false"` | `"false"` | Удалить для всех участников (только отправитель) |

**Ответ `200`:** `{ "ok": true }`

**Ошибки:**
- `403` — попытка удалить чужое сообщение с `forEveryone=true`

---

### 7.6 POST /chats/:chatId/messages/:messageId/react

Добавляет или заменяет эмодзи-реакцию.

**Авторизация:** Да

**Тело запроса:**
```json
{ "emoji": "👍" }
```

**Ответ `200`:**
```json
{
  "data": {
    "reactions": { "👍": 3, "❤️": 1 }
  }
}
```

---

### 7.7 DELETE /chats/:chatId/messages/:messageId/react

Удаляет реакцию текущего пользователя.

**Авторизация:** Да

**Ответ `200`:**
```json
{ "data": { "reactions": { "❤️": 1 } } }
```

---

### 7.8 POST /chats/:chatId/messages/:messageId/read

Отмечает сообщение как прочитанное, обновляя счётчик непрочитанных.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 7.9 POST /chats/:chatId/messages/:messageId/pin

Закрепляет сообщение. Требуется разрешение `canPinMessages`.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 7.10 DELETE /chats/:chatId/messages/:messageId/pin

Открепляет сообщение. Требуется разрешение `canPinMessages`.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 7.11 Голосование в опросе

**PATCH /chats/:chatId/messages/polls/:pollId/vote** *(отправляется через паттерны messaging)*

```json
{ "optionId": 2 }
```

> Примечание: HTTP-маршрут для голосования в опросе обрабатывается внутри сервиса. Используйте паттерн `messaging.poll.vote` или активируйте через WebSocket.

---

## 8. Медиафайлы

Загрузка медиафайлов — **двухэтапный процесс**:

```
1. Клиент → Сервер:  POST /media/upload-url   → получить пресайнед PUT URL
2. Клиент → S3:      PUT <presignedUrl>        → загрузить байты файла напрямую
3. Клиент → Сервер:  POST /media/finalize      → зарегистрировать загрузку
```

Это позволяет не пропускать бинарные данные через API-сервер.

---

### 8.1 POST /media/upload-url

Получить пресайнед S3 URL для загрузки файла.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "type": "photo",
  "mimeType": "image/jpeg",
  "fileName": "photo.jpg"
}
```

| Поле | Тип | Обязательно | Значения |
|---|---|---|---|
| `type` | string | ✅ | `"photo"`, `"video"`, `"audio"`, `"voice"`, `"video_note"`, `"document"`, `"sticker"`, `"gif"`, `"avatar"`, `"story"` |
| `mimeType` | string | ✅ | MIME-тип файла |
| `fileName` | string | ❌ | Оригинальное имя файла, макс. 255 символов |

**Ответ `200`:**
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

### 8.2 Загрузка в S3

Используйте `uploadUrl` с запросом `PUT`:

```http
PUT <uploadUrl>
Content-Type: image/jpeg
Content-Length: <размер файла в байтах>

<raw bytes файла>
```

Заголовки авторизации не нужны — URL пресайнед и истекает через 5 минут.

---

### 8.3 POST /media/finalize

Регистрирует загруженный файл в базе данных и запускает фоновую обработку.

**Авторизация:** Да

**Тело запроса:**
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

| Поле | Тип | Обязательно | Примечания |
|---|---|---|---|
| `storageKey` | string | ✅ | Из ответа шага 1 |
| `url` | string | ✅ | Публичный URL; должен быть валидным URL |
| `type` | string | ✅ | Тот же `type`, что и в шаге 1 |
| `mimeType` | string | ✅ | — |
| `fileSize` | number | ✅ | Байты, положительное целое |
| `fileName` | string | ❌ | — |

**Ответ `200`:** Объект [Media](#объект-media).

> После финализации сервер запускает фоновую обработку (генерация миниатюр для изображений, извлечение формы волны для голосовых). Запись media обновляется асинхронно — опрашивайте `GET /media/:mediaId` или слушайте обновления через WebSocket.

---

### 8.4 GET /media/:mediaId

Возвращает метаданные медиафайла.

**Авторизация:** Не требуется

**Ответ `200`:** Объект [Media](#объект-media).

---

### 8.5 GET /media/:mediaId/download

Возвращает кратковременный пресайнед URL для скачивания (действителен 1 час).

**Авторизация:** Да

**Ответ `200`:**
```json
{
  "data": {
    "url": "https://minio:9000/phantom-media/...?X-Amz-Expires=3600&..."
  }
}
```

---

## 9. Истории

Истории эфемерны — они автоматически истекают через **24 часа**.

### 9.1 POST /stories

Создаёт новую историю.

**Авторизация:** Да

**Тело запроса:**
```json
{
  "mediaId": "media-uuid",
  "caption": "Красивый закат 🌅",
  "privacy": "close_friends",
  "selectedUserIds": [],
  "entities": []
}
```

| Поле | Тип | Обязательно | Примечания |
|---|---|---|---|
| `mediaId` | UUID | ✅ | Должен быть загруженным медиафайлом |
| `caption` | string | ❌ | макс. 2048 символов |
| `privacy` | string | ❌ | По умолчанию `"everyone"`. См. ниже |
| `selectedUserIds` | UUID[] | Для `selected_users` | Список ID пользователей, которые могут видеть |
| `entities` | Entity[] | ❌ | Форматирование текста для подписи |

**Значения приватности:**
- `"everyone"` — видят все пользователи
- `"contacts"` — только контакты
- `"close_friends"` — только список близких друзей (управляется отдельно)
- `"selected_users"` — только явный список в `selectedUserIds`

**Ответ `200`:** Объект [Story](#объект-story).

---

### 9.2 GET /stories/feed

Возвращает истории всех пользователей с учётом настроек приватности.

**Авторизация:** Да

**Query-параметры:**

| Параметр | Тип | По умолчанию |
|---|---|---|
| `cursor` | ISO datetime | — |
| `limit` | number | `20` (макс. `50`) |

**Ответ `200`:**
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

Возвращает все активные (не истёкшие, не архивированные) истории конкретного пользователя.

**Авторизация:** Да

**Ответ `200`:** `Story[]`

---

### 9.4 DELETE /stories/:storyId

Удаляет историю. Только владелец.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 9.5 POST /stories/:storyId/archive

Архивирует историю. Она исчезает из ленты, но остаётся в архиве владельца.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 9.6 PATCH /stories/:storyId/pin

Закрепляет или открепляет историю, чтобы она оставалась видимой после истечения.

**Авторизация:** Да

**Тело запроса:**
```json
{ "isPinned": true }
```

**Ответ `200`:** `{ "ok": true }`

---

### 9.7 POST /stories/:storyId/view

Фиксирует просмотр истории. Идемпотентный вызов.

**Авторизация:** Да

**Ответ `200`:** `{ "ok": true }`

---

### 9.8 GET /stories/:storyId/viewers

Возвращает список просмотревших. Только владелец.

**Авторизация:** Да

**Ответ `200`:**
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

Реагирует на историю (видно владельцу в списке просмотров).

**Авторизация:** Да

**Тело запроса:**
```json
{ "emoji": "🔥" }
```

**Ответ `200`:** `{ "ok": true }`

---

## 10. WebSocket — события реального времени

### 10.1 Подключение

Подключитесь к Socket.IO серверу по адресу:

```
ws://<host>:3000/ws
```

Передайте **токен доступа** в качестве query-параметра или через auth-заголовок:

```javascript
// JavaScript / TypeScript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/ws", {
  auth: { token: "<accessToken>" }
  // ИЛИ: transports: ['websocket'], extraHeaders: { Authorization: "Bearer <token>" }
});
```

> Токен проверяется при подключении. Если неверный, соединение отклоняется.

---

### 10.2 Управление комнатами чата

Перед получением сообщений из чата войдите в его комнату:

#### `chat:join`

```javascript
socket.emit("chat:join", { chatId: "chat-uuid" });
// Сервер отвечает:
socket.on("chat:joined", ({ chatId }) => { /* ... */ });
```

#### `chat:leave`

```javascript
socket.emit("chat:leave", { chatId: "chat-uuid" });
// Сервер отвечает:
socket.on("chat:left", ({ chatId }) => { /* ... */ });
```

---

### 10.3 Индикаторы набора текста

#### `typing:start`

```javascript
socket.emit("typing:start", {
  chatId: "chat-uuid",
  displayName: "Алиса"
});
```

#### `typing:stop`

```javascript
socket.emit("typing:stop", { chatId: "chat-uuid" });
```

---

### 10.4 Входящие события — Сообщения

Все события сообщений доставляются участникам соответствующей комнаты чата.

#### `message:new`

Срабатывает при отправке нового сообщения в любой присоединённый чат.

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

Срабатывает при редактировании сообщения.

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

Срабатывает при удалении сообщения.

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

Срабатывает при добавлении реакции к сообщению.

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

Срабатывает, когда участник прочитал сообщение. Доставляется в комнату `chat:<chatId>`.

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

Срабатывает в комнате чата, когда кто-то набирает текст.

```typescript
socket.on("message:typing", (event: TypingEvent) => {
  // event.userId, event.chatId, event.displayName
  // Отсутствие события означает прекращение набора
});

interface TypingEvent {
  chatId: string;
  userId: string;
  displayName: string;
}
```

> Сервер также отправляет `"typing:stop"` с `{ chatId, userId }` при прекращении набора.

---

### 10.5 Входящие события — Присутствие

События присутствия доставляются пользователям, добавившим целевого пользователя в контакты.

#### `user:status`

```typescript
socket.on("user:status", (event: UserStatusEvent) => { });

interface UserStatusEvent {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null; // ISO; null если в данный момент онлайн
}
```

> Вы также будете получать `user:status` для **своего аккаунта** на других устройствах.

---

## 11. Push-уведомления

Push-уведомления отправляются через **Firebase Cloud Messaging (FCM)** для новых сообщений.

Для получения push-уведомлений зарегистрируйте FCM-токен вашего устройства в сессии. Обновляйте его через вызов обновления сессии (или укажите `pushToken` в payload регистрации, если поддерживается версией клиентского приложения).

### Структура уведомления

```json
{
  "notification": {
    "title": "Новое сообщение",
    "body": "Привет, мир!"
  },
  "data": {
    "type": "new_message",
    "chatId": "chat-uuid",
    "messageId": "msg-uuid"
  }
}
```

### Android

FCM-сообщения отправляются с `priority: "high"`. Используйте `data`-only сообщения для тихой обработки в фоне.

### iOS (APNs)

`sound: "default"`, `badge: 1`. Обрабатывайте фоновую доставку с помощью notification service extensions.

---

## 12. Модели данных

### Объект Chat

```typescript
interface Chat {
  id: string;
  type: "direct" | "group" | "channel" | "saved";
  title: string | null;
  description: string | null;
  avatarMediaId: string | null;
  createdBy: string | null;
  username: string | null;        // @handle для публичных чатов
  isPublic: boolean;
  inviteHash: string | null;
  memberCount: number;
  messageCount: number;
  lastMessageId: string | null;
  isVerified: boolean;
  slowModeDelay: number | null;   // секунды
  linkedChatId: string | null;
  createdAt: string;              // ISO
  updatedAt: string;              // ISO
}
```

---

### Объект Message

```typescript
interface Message {
  id: string;
  chatId: string;
  senderId: string | null;        // null для системных сообщений
  type: MessageType;
  text: string | null;
  mediaId: string | null;
  replyToMessageId: string | null;
  forwardFromMessageId: string | null;
  forwardFromChatId: string | null;
  forwardSenderName: string | null; // анонимная пересылка
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
  reactions: Record<string, number>; // эмодзи → количество
  entities: MessageEntity[];
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

### Объект Media

```typescript
interface Media {
  id: string;
  uploaderId: string | null;
  type: MediaType;
  storageKey: string;
  url: string;                    // публичный URL (может потребоваться пресайнед URL для приватных файлов)
  thumbnailKey: string | null;    // устанавливается после фоновой обработки
  thumbnailUrl: string | null;    // устанавливается после фоновой обработки
  fileName: string | null;
  mimeType: string;
  fileSize: number;               // байты
  width: number | null;
  height: number | null;
  duration: number | null;        // секунды для аудио/видео
  waveform: number[] | null;      // 100 семплов 0–255 для голосовых
  isAnimated: boolean;
  createdAt: string;
}
```

---

### Объект Story

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
  expiresAt: string;              // всегда ~24ч от createdAt
  createdAt: string;
}
```

---

### Объект ChatMember

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
  // Разрешения:
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

### Объект Poll

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

## 13. Перечисления

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

### Матрица разрешений

| Разрешение | owner | admin | member |
|---|---|---|---|
| `canSendMessages` | ✅ | ✅ | ✅ |
| `canSendMedia` | ✅ | ✅ | ✅ |
| `canSendPolls` | ✅ | ✅ | ✅ |
| `canAddUsers` | ✅ | ✅ | ❌ |
| `canPinMessages` | ✅ | ✅ | ❌ |
| `canManageChat` | ✅ | ✅ | ❌ |
| `canDeleteMessages` | ✅ | ✅ | ❌ |
| `canBanUsers` | ✅ | ❌ | ❌ |

Разрешения могут быть переопределены для конкретного участника администратором/владельцем (роль `restricted` устанавливает всё в `false`).

---

## 14. Пагинация

Все эндпоинты списков используют **курсорную пагинацию** на основе временных меток `updatedAt` / `createdAt`.

```
GET /chats?limit=20
→ { items: [...20 чатов...], nextCursor: "2024-01-14T09:00:00.000Z", hasMore: true }

GET /chats?cursor=2024-01-14T09:00:00.000Z&limit=20
→ { items: [...следующие 20...], nextCursor: "...", hasMore: false }
```

- Передавайте `nextCursor` как `cursor` в следующем запросе.
- `hasMore: false` означает, что все данные получены.
- Курсоры **исключительны** (элемент с временной меткой курсора не включается в результат).

---

## 15. Текстовые сущности (форматирование)

Сообщения и подписи историй поддерживают встроенное форматирование через `entities` — массив диапазонных аннотаций, применяемых к полю `text`.

```typescript
interface MessageEntity {
  type: EntityType;
  offset: number;   // смещение в кодовых единицах UTF-16 от начала текста
  length: number;   // длина в кодовых единицах UTF-16
  url?: string;     // для "text_link"
  language?: string; // для блоков "pre" / "code"
}

type EntityType =
  | "bold"
  | "italic"
  | "underline"
  | "strikethrough"
  | "code"           // моноширинный инлайн
  | "pre"            // моноширинный блок (используйте language для подсветки синтаксиса)
  | "text_link"      // гиперссылка с кастомным отображаемым текстом
  | "mention"        // упоминание @username
  | "spoiler"        // скрыто до нажатия
  | "blockquote";
```

**Пример:**

```json
{
  "text": "Привет жирный мир",
  "entities": [
    { "type": "bold", "offset": 7, "length": 6 }
  ]
}
```

Отображается как: Привет **жирный** мир

---

## 16. Сквозное шифрование

PhantomMsgr использует протокол **X3DH Signal Protocol** (Extended Triple Diffie-Hellman) для опционального шифрования на уровне сообщений. При `isEncrypted: true` поле `text` равно null, а `encryptedPayload` содержит blob с зашифрованным текстом.

### 16.1 Типы ключей

| Ключ | Назначение | Время жизни |
|---|---|---|
| **Identity Key (IK)** | Долгосрочная ключевая пара Curve25519 | Постоянна для устройства |
| **Signed PreKey (SPK)** | Среднесрочный Curve25519, подписанный Ed25519 через IK | Ротация ~раз в неделю |
| **One-Time PreKey (OPK)** | Эфемерный ключ, использующийся один раз за сессию | Потребляется при использовании |

### 16.2 Загрузка связки ключей

Перед началом зашифрованных сессий устройство должно опубликовать свою связку ключей.

> **Примечание:** Прямые REST-эндпоинты для управления ключами ещё не реализованы в API-шлюзе. Схема поддерживает это (таблицы `user_key_bundles`, `one_time_prekeys`). Приём контрибуций приветствуется.

### 16.3 Инициация сессии (X3DH)

1. Алиса получает связку ключей Боба (IK + SPK + один OPK).
2. Алиса генерирует эфемерную ключевую пару (EK).
3. Алиса вычисляет общий секрет:
   ```
   DH1 = DH(Alice_IK, Bob_SPK)
   DH2 = DH(Alice_EK, Bob_IK)
   DH3 = DH(Alice_EK, Bob_SPK)
   DH4 = DH(Alice_EK, Bob_OPK)  // если OPK был доступен
   SK  = KDF(DH1 || DH2 || DH3 || DH4)
   ```
4. Алиса шифрует первое сообщение с помощью SK и включает в заголовок `senderDeviceId` + её открытые ключи IK и EK.
5. Боб восстанавливает SK при получении и расшифровывает.

### 16.4 Поля зашифрованного сообщения

```typescript
interface EncryptedMessage extends Message {
  isEncrypted: true;
  text: null;
  encryptedPayload: string; // зашифрованный текст + MAC + IV, закодированные в base64url
  senderDeviceId: string;   // маршрутизация для нескольких устройств
}
```

---

## 17. Ограничения запросов и рекомендации

### Ограничения запросов

Ограничения обрабатываются NestJS Throttler. Значения по умолчанию (могут быть переопределены при деплое):

| Группа эндпоинтов | Лимит |
|---|---|
| Auth (register, recover, refresh) | 10 запросов / мин на IP |
| Отправка сообщений | Контролируется `slowModeDelay` для каждого чата |
| Общий API | 60 запросов / мин на пользователя |

### Стратегия обновления токенов

Реализуйте **проактивное обновление**: обновляйте токен, когда истекло ~80% его времени жизни (примерно через 12 мин, поскольку TTL равен 15 мин), не дожидаясь 401.

```javascript
const REFRESH_AT_MS = 12 * 60 * 1000; // 12 минут

function scheduleRefresh(expiresAt: Date) {
  const delay = expiresAt.getTime() - Date.now() - REFRESH_AT_MS;
  setTimeout(doRefresh, Math.max(delay, 0));
}
```

### Переподключение WebSocket

Настройте Socket.IO на автоматическое переподключение с экспоненциальной задержкой:

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

### Загрузка медиафайлов

- Проверяйте размер файла перед загрузкой. Жёсткого лимита на стороне сервера нет, но для мобильных соединений рекомендуется держать загрузки до 100 МБ.
- Пресайнед URL действителен **5 минут**. Запрашивайте его непосредственно перед загрузкой.
- После `POST /media/finalize` поля `thumbnailUrl` и размеры медиа изначально равны `null`. Они заполняются асинхронно. Слушайте WebSocket или опрашивайте `GET /media/:mediaId` для проверки завершения обработки.

---

## 18. Пример быстрого старта

Полный пример на TypeScript:

```typescript
import axios from "axios";
import { io, Socket } from "socket.io-client";

const BASE = "http://localhost:3000/api/v1";
let accessToken = "";
let refreshToken = "";
let socket: Socket;

// ── 1. Регистрация ────────────────────────────────────────────────────────────

const reg = await axios.post(`${BASE}/auth/register`, {
  displayName: "Алиса",
  platform: "web",
  deviceName: "Chrome на macOS",
});

const { user, session, accessToken: at, refreshToken: rt, expiresIn } = reg.data.data;

console.log("⚠️  Сохраните этот токен навсегда:", user.anonymousToken);

accessToken  = at;
refreshToken = rt;

const api = axios.create({
  baseURL: BASE,
  headers: { Authorization: `Bearer ${accessToken}` },
});

// ── 2. Подключение к WebSocket ────────────────────────────────────────────────

socket = io("http://localhost:3000/ws", {
  auth: { token: accessToken },
});

socket.on("connect", () => console.log("WS подключён:", socket.id));

// ── 3. Создание группового чата ──────────────────────────────────────────────

const chatRes = await api.post("/chats", {
  type: "group",
  title: "Тестовая группа",
});
const chat = chatRes.data.data;

// ── 4. Вход в комнату чата для получения событий реального времени ────────────

socket.emit("chat:join", { chatId: chat.id });
socket.on("chat:joined", ({ chatId }) => console.log("Вошли в комнату:", chatId));

// ── 5. Прослушивание новых сообщений ─────────────────────────────────────────

socket.on("message:new", (msg) => {
  console.log(`[${msg.chatId}] ${msg.senderId}: ${msg.text}`);
});

// ── 6. Отправка сообщения ────────────────────────────────────────────────────

await api.post(`/chats/${chat.id}/messages`, {
  type: "text",
  text: "Привет из примера быстрого старта!",
});

// ── 7. Отправка индикатора набора текста ──────────────────────────────────────

socket.emit("typing:start", { chatId: chat.id, displayName: "Алиса" });
setTimeout(() => socket.emit("typing:stop", { chatId: chat.id }), 3000);

// ── 8. Загрузка фото ─────────────────────────────────────────────────────────

// Шаг 1: получить пресайнед URL
const urlRes = await api.post("/media/upload-url", {
  type: "photo",
  mimeType: "image/jpeg",
  fileName: "photo.jpg",
});
const { storageKey, uploadUrl, publicUrl } = urlRes.data.data;

// Шаг 2: загрузить напрямую в S3 (через fetch / axios с arraybuffer)
const fileBytes = new Uint8Array(/* ... байты вашего файла ... */);
await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
  body: fileBytes,
});

// Шаг 3: финализировать
const finalRes = await api.post("/media/finalize", {
  storageKey,
  url: publicUrl,
  type: "photo",
  mimeType: "image/jpeg",
  fileSize: fileBytes.byteLength,
  fileName: "photo.jpg",
});
const media = finalRes.data.data;

// Шаг 4: отправить сообщение с фото
await api.post(`/chats/${chat.id}/messages`, {
  type: "photo",
  mediaId: media.id,
  text: "Вот фото!",
});

// ── 9. Проактивное обновление токена ─────────────────────────────────────────

function scheduleRefresh(expiresIn: number) {
  const ms = (expiresIn - 120) * 1000; // обновить за 2 мин до истечения
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

*По вопросам, багам и предложениям — открывайте issue в репозитории.*
