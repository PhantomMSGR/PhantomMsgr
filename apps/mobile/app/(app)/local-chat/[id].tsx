import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSavedStore, type LocalMessage } from '@/store/localSaved.store'
import { colors, fontSize, radius } from '@/constants/theme'
import { usePreferencesStore } from '@/store/preferences.store'

function formatTime(iso: string, use24Hour: boolean): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  showDate,
  use24Hour,
  onDelete,
}: {
  msg: LocalMessage
  showDate: boolean
  use24Hour: boolean
  onDelete: () => void
}) {
  const handleLongPress = useCallback(() => {
    Alert.alert('Delete note', 'Remove this message?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ])
  }, [onDelete])

  return (
    <>
      {showDate && (
        <View style={styles.dateSep}>
          <Text style={styles.dateSepText}>{formatDate(msg.createdAt)}</Text>
        </View>
      )}
      <Pressable onLongPress={handleLongPress} style={styles.bubbleRow}>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{msg.text}</Text>
          <Text style={styles.bubbleTime}>{formatTime(msg.createdAt, use24Hour)}</Text>
        </View>
      </Pressable>
    </>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LocalChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const chat = useLocalSavedStore((s) => s.chats.find((c) => c.id === id))
  const addMessage  = useLocalSavedStore((s) => s.addMessage)
  const deleteMessage = useLocalSavedStore((s) => s.deleteMessage)
  const deleteChat  = useLocalSavedStore((s) => s.deleteChat)
  const renameChat  = useLocalSavedStore((s) => s.renameChat)
  const use24Hour   = usePreferencesStore((s) => s.use24Hour)

  const [draft, setDraft] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const listRef = useRef<any>(null)

  // Guard: chat deleted externally
  useEffect(() => {
    if (!chat) router.back()
  }, [chat])

  const handleSend = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed || !id) return
    addMessage(id, trimmed)
    setDraft('')
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50)
  }, [draft, id, addMessage])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete notebook',
      `Delete "${chat?.name}"? All notes will be lost.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteChat(id)
            router.back()
          },
        },
      ],
    )
  }, [chat, id, deleteChat])

  const handleRenameSubmit = useCallback(() => {
    const trimmed = nameInput.trim()
    if (trimmed) renameChat(id, trimmed)
    setEditingName(false)
  }, [id, nameInput, renameChat])

  if (!chat) return null

  // Messages displayed oldest→newest (bottom of screen = newest)
  const messages = chat.messages

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>

          <View style={styles.headerCenter}>
            {editingName ? (
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                onSubmitEditing={handleRenameSubmit}
                onBlur={handleRenameSubmit}
                autoFocus
                maxLength={64}
                style={styles.headerNameInput}
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={() => { setNameInput(chat.name); setEditingName(true) }}>
                <Text style={styles.headerTitle} numberOfLines={1}>{chat.name}</Text>
              </Pressable>
            )}
            <View style={styles.headerSubRow}>
              <Ionicons name="phone-portrait-outline" size={11} color="#f59e0b" />
              <Text style={styles.headerSub}>Local · {messages.length} notes</Text>
            </View>
          </View>

          <Pressable onPress={handleDelete} hitSlop={12} style={styles.headerAction}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Messages */}
        <View style={styles.flex}>
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={styles.emptyTitle}>No notes yet</Text>
              <Text style={styles.emptySub}>Write something below to save it here</Text>
            </View>
          ) : (
            <FlashList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              estimatedItemSize={56}
              contentContainerStyle={{ padding: 12, paddingBottom: 8 }}
              renderItem={({ item, index }) => (
                <MessageBubble
                  msg={item}
                  use24Hour={use24Hour}
                  showDate={
                    index === 0 ||
                    new Date(item.createdAt).toDateString() !==
                      new Date(messages[index - 1].createdAt).toDateString()
                  }
                  onDelete={() => deleteMessage(id, item.id)}
                />
              )}
            />
          )}
        </View>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a note…"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.input}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim()}
            style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    gap: 6,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
  },
  headerNameInput: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '700',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    minWidth: 80,
    paddingVertical: 2,
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  headerSub: {
    color: colors.textMuted,
    fontSize: 11,
  },
  headerAction: { padding: 8 },

  // Date separator
  dateSep: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateSepText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },

  // Bubbles
  bubbleRow: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  bubble: {
    backgroundColor: colors.bgSurface,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleText: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    flex: 1,
    flexShrink: 1,
    lineHeight: 20,
  },
  bubbleTime: {
    color: colors.textMuted,
    fontSize: 10,
    flexShrink: 0,
    marginBottom: 1,
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  emptySub: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Input area
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bgElevated,
  },
})
