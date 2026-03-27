# Mobile App — Testing Progress

> **Last updated:** 2026-03-23
> **Test runner:** Jest + jest-expo + @testing-library/react-native
> **Legend:** ✅ Done | 🔄 In Progress | ⬜ Pending

---

## Setup

| File | Status | Notes |
|---|---|---|
| `apps/mobile/jest.config.js` | ✅ Done | jest-expo preset, moduleNameMapper — embedded in package.json `jest` field |
| `apps/mobile/jest.setup.ts` | ✅ Done | RTL matchers, mocks for reanimated, gesture-handler, expo-secure-store, expo-router, expo-haptics, expo-image, expo-clipboard, expo-linear-gradient, safe-area-context, socket.io-client, expo-notifications |
| `apps/mobile/package.json` (devDeps) | ✅ Done | jest-expo ~55.0.0, @testing-library/react-native ^12.9.0, @testing-library/jest-native ^5.4.3, react-test-renderer 19.0.0, @types/jest ^29.5.14 |

---

## 1. Hooks

| File | Status | Coverage |
|---|---|---|
| `src/hooks/__tests__/useMessageGroups.test.ts` | ✅ Done | grouping, date separators, isFirst/isLast/showAvatar, 5-min window, reverse order for inverted FlashList |

---

## 2. Stores

| File | Status | Coverage |
|---|---|---|
| `src/store/__tests__/toast.store.test.ts` | ✅ Done | show, dismiss, auto-dismiss, singleton `toast.*` |
| `src/store/__tests__/auth.store.test.ts` | ✅ Done | initialize (no token, success, failure), register, recover, logout, updateUser |

---

## 3. API Layer

| File | Status | Coverage |
|---|---|---|
| `src/api/__tests__/client.test.ts` | ✅ Done | setAccessToken/getAccessToken, onForceLogout, request interceptor (Authorization header), baseURL/timeout |
| `src/api/__tests__/auth.test.ts` | ✅ Done | register, recover, refresh, logout, getSessions, revokeSession |
| `src/api/__tests__/messages.test.ts` | ✅ Done | list, send, edit, delete, react, removeReaction, markRead, pin, unpin |

---

## 4. UI Components

| File | Status | Coverage |
|---|---|---|
| `src/components/ui/__tests__/Button.test.tsx` | ✅ Done | variants, sizes, loading, disabled, press |
| `src/components/ui/__tests__/Avatar.test.tsx` | ✅ Done | initials fallback, online indicator, stable hue, different hues |
| `src/components/ui/__tests__/Toast.test.tsx` | ✅ Done | renders latest toast, dismiss on press, type icons |
| `src/components/ui/__tests__/SkeletonChatListItem.test.tsx` | ✅ Done | renders N items |

---

## 5. Chat Components

| File | Status | Coverage |
|---|---|---|
| `src/components/chat/__tests__/DateSeparator.test.tsx` | ✅ Done | renders date string, snapshot |
| `src/components/chat/__tests__/TypingIndicator.test.tsx` | ✅ Done | visible/hidden, three dots |
| `src/components/chat/__tests__/DeliveryStatus.test.tsx` | ✅ Done | sending/sent/delivered/read states |
| `src/components/chat/__tests__/ChatListItem.test.tsx` | ✅ Done | title, saved/unknown fallbacks, unread badge (99+ cap), time format, onPress, verified checkmark |
| `src/components/chat/__tests__/MessageBubble.test.tsx` | ✅ Done | own/other, deleted, isEdited, reactions, delivery status, sender name, reply preview, long-press |
| `src/components/chat/__tests__/JumpToBottomFAB.test.tsx` | ✅ Done | visible/hidden, unread badge (99+ cap), onPress, arrow icon |
| `src/components/chat/__tests__/SearchBar.test.tsx` | ✅ Done | collapsed state (icon), expand → shows TextInput + Cancel, onChange, cancel clears + calls onCancel |
| `src/components/chat/__tests__/SwipeableMessage.test.tsx` | ✅ Done | renders children, reply arrow, GestureDetector wrapper, Pan gesture created |

---

## 6. Screens

| File | Status | Coverage |
|---|---|---|
| `app/(auth)/__tests__/welcome.test.tsx` | ✅ Done | renders, feature pills, navigates to register/recover |
| `app/(auth)/__tests__/register.test.tsx` | ✅ Done | validation (empty, short name), submit, backup step, copy token, continue navigation |
| `app/(auth)/__tests__/recover.test.tsx` | ✅ Done | validation (empty, length, non-hex), paste, submit, success navigation, error clearing |

---

## Run Commands

Run all tests with:
```bash
cd apps/mobile && npx jest --coverage
```

Run a single file:
```bash
cd apps/mobile && npx jest src/hooks/__tests__/useMessageGroups.test.ts
```

Run only chat component tests:
```bash
cd apps/mobile && npx jest src/components/chat
```

Install dependencies first if not done:
```bash
cd apps/mobile && npm install
```
