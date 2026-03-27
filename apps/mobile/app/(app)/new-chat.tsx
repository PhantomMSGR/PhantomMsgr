import React, { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { chatsApi } from '@/api/chats'
import { usersApi, type UserSearchResult } from '@/api/users'
import { QUERY_KEYS } from '@/config'
import { toast } from '@/store/toast.store'
import { useLocalSavedStore } from '@/store/localSaved.store'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarConstructorModal, type AvatarResult } from '@/components/ui/AvatarConstructorModal'
import { colors, fontSize, radius } from '@/constants/theme'
import type { ChatType } from '@/types'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

const CHAT_TYPES: { type: ChatType; label: string; description: string; icon: IoniconsName }[] = [
  { type: 'direct',  label: 'Direct',  description: 'One-on-one conversation', icon: 'person-outline' },
  { type: 'group',   label: 'Group',   description: 'Multiple members',        icon: 'people-outline' },
  { type: 'channel', label: 'Channel', description: 'Broadcast to followers',  icon: 'megaphone-outline' },
  { type: 'saved',   label: 'Saved',   description: 'Notes & bookmarks',       icon: 'bookmark-outline' },
]

function TypeCard({
  item,
  selected,
  onSelect,
}: {
  item: (typeof CHAT_TYPES)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.typeCard, selected && styles.typeCardSelected]}
    >
      <View style={[styles.typeIconWrap, selected && styles.typeIconWrapSelected]}>
        <Ionicons
          name={item.icon}
          size={20}
          color={selected ? colors.white : colors.textSecondary}
        />
      </View>
      <View style={styles.typeInfo}>
        <Text style={styles.typeLabel}>{item.label}</Text>
        <Text style={styles.typeDesc}>{item.description}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark" size={18} color={colors.textPrimary} />
      )}
    </Pressable>
  )
}

function UserRow({
  user,
  selected,
  onSelect,
}: {
  user: UserSearchResult
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
    >
      <Avatar name={user.displayName} size={40} />
      <View style={styles.userRowInfo}>
        <Text style={styles.userRowName}>{user.displayName}</Text>
        {user.username ? (
          <Text style={styles.userRowUsername}>@{user.username}</Text>
        ) : null}
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      )}
    </Pressable>
  )
}

export default function NewChatScreen() {
  const queryClient = useQueryClient()
  const createLocalChat = useLocalSavedStore((s) => s.createChat)
  const [chatType, setChatType] = useState<ChatType>('direct')
  const [title, setTitle] = useState('')
  const [savedName, setSavedName] = useState('')
  const [savedStorageType, setSavedStorageType] = useState<'remote' | 'local'>('remote')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([])
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const showTitle = chatType === 'group' || chatType === 'channel'
  const showUserSearch = chatType === 'direct'
  const showMemberSearch = chatType === 'group' || chatType === 'channel'
  const showSavedConfig = chatType === 'saved'

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: () => usersApi.searchUsers(searchQuery),
    enabled: (showUserSearch || showMemberSearch) && searchQuery.trim().length >= 2,
    staleTime: 10_000,
  })

  const createMutation = useMutation({
    mutationFn: () => {
      if (chatType === 'direct' && selectedUser) {
        return chatsApi.create({ type: 'direct', memberIds: [selectedUser.id] })
      }
      if (chatType === 'saved') {
        return chatsApi.create({ type: 'saved', title: savedName.trim() || undefined })
      }
      return chatsApi.create({
        type: chatType,
        title: showTitle ? title.trim() || undefined : undefined,
        memberIds: showMemberSearch ? selectedMembers.map((u) => u.id) : undefined,
        avatarEmoji: showTitle ? avatarEmoji : undefined,
        avatarColor: showTitle ? avatarColor : undefined,
      })
    },
    onSuccess: (chat) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHATS })
      router.replace(`/(app)/(tabs)/chats/${chat.id}`)
    },
    onError: () => toast.error('Could not create chat'),
  })

  const canCreate =
    (chatType === 'direct' && selectedUser !== null) ||
    (chatType === 'saved' && savedName.trim().length > 0) ||
    ((chatType === 'group' || chatType === 'channel') && title.trim().length > 0)

  function handleCreate() {
    if (chatType === 'saved' && savedStorageType === 'local') {
      const chat = createLocalChat(savedName.trim())
      router.replace(`/(app)/local-chat/${chat.id}`)
      return
    }
    createMutation.mutate()
  }

  const handleTypeSelect = (type: ChatType) => {
    setChatType(type)
    setSelectedUser(null)
    setSelectedMembers([])
    setSearchQuery('')
    setAvatarEmoji(null)
    setAvatarColor(null)
    setSavedName('')
    setSavedStorageType('remote')
  }

  const handleAvatarResult = (result: AvatarResult) => {
    if (result.type === 'emoji') {
      setAvatarEmoji(result.emoji)
      setAvatarColor(result.color)
    }
    setShowAvatarPicker(false)
  }

  const toggleMember = (user: UserSearchResult) => {
    setSelectedMembers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Chat</Text>
          <Pressable
            onPress={handleCreate}
            disabled={!canCreate || createMutation.isPending}
            hitSlop={12}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Text style={[styles.createText, !canCreate && styles.createTextDisabled]}>
                Create
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Chat Type</Text>
          {CHAT_TYPES.map((item) => (
            <TypeCard
              key={item.type}
              item={item}
              selected={chatType === item.type}
              onSelect={() => handleTypeSelect(item.type)}
            />
          ))}

          {/* Direct — user search */}
          {showUserSearch && (
            <View style={styles.userSearchSection}>
              <Text style={styles.sectionLabel}>Find User</Text>

              {/* Selected user chip */}
              {selectedUser ? (
                <View style={styles.selectedUserChip}>
                  <Avatar name={selectedUser.displayName} size={28} />
                  <Text style={styles.selectedUserName}>{selectedUser.displayName}</Text>
                  <Pressable
                    onPress={() => setSelectedUser(null)}
                    hitSlop={8}
                    style={styles.clearSelectedBtn}
                  >
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.searchInputWrapper}>
                  <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search by name or username…"
                    placeholderTextColor={colors.textMuted}
                    autoFocus
                    style={styles.searchInput}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              )}

              {/* Results */}
              {!selectedUser && searchQuery.trim().length >= 2 && (
                <View style={styles.resultsContainer}>
                  {searching ? (
                    <ActivityIndicator color={colors.primary} style={styles.searchLoader} />
                  ) : searchResults && searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        selected={false}
                        onSelect={() => {
                          setSelectedUser(user)
                          setSearchQuery('')
                        }}
                      />
                    ))
                  ) : (
                    <View style={styles.noResults}>
                      <Ionicons name="person-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.noResultsText}>No users found</Text>
                    </View>
                  )}
                </View>
              )}

              {!selectedUser && searchQuery.trim().length < 2 && (
                <Text style={styles.searchHint}>
                  Type at least 2 characters to search
                </Text>
              )}
            </View>
          )}

          {/* Group / Channel name + avatar */}
          {showTitle && (
            <View style={styles.titleSection}>
              {/* Avatar picker */}
              <Pressable style={styles.avatarPickerRow} onPress={() => setShowAvatarPicker(true)}>
                <View style={styles.avatarPickerCircle}>
                  <Avatar
                    name={title || (chatType === 'channel' ? 'Channel' : 'Group')}
                    emoji={avatarEmoji}
                    color={avatarColor}
                    size={56}
                  />
                  <View style={styles.avatarPickerBadge}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                </View>
                <Text style={styles.avatarPickerLabel}>Set Avatar (optional)</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              <Text style={styles.sectionLabel}>
                {chatType === 'channel' ? 'Channel Name' : 'Group Name'}
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={chatType === 'channel' ? 'e.g. Announcements' : 'e.g. Friends'}
                placeholderTextColor={colors.textMuted}
                autoFocus
                maxLength={128}
                style={[styles.titleInput, title.trim() && styles.titleInputActive]}
              />
            </View>
          )}

          {/* Group / Channel — member search */}
          {showMemberSearch && (
            <View style={styles.userSearchSection}>
              <Text style={styles.sectionLabel}>Add Members (optional)</Text>

              {/* Selected member chips */}
              {selectedMembers.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {selectedMembers.map((u) => (
                    <Pressable
                      key={u.id}
                      onPress={() => toggleMember(u)}
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryDark, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 6 }}
                    >
                      <Text style={{ color: colors.white, fontSize: 13 }}>{u.displayName}</Text>
                      <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={styles.searchIcon} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search by name or username…"
                  placeholderTextColor={colors.textMuted}
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {searchQuery.trim().length >= 2 && (
                <View style={styles.resultsContainer}>
                  {searching ? (
                    <ActivityIndicator color={colors.primary} style={styles.searchLoader} />
                  ) : searchResults && searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <UserRow
                        key={user.id}
                        user={user}
                        selected={!!selectedMembers.find((u) => u.id === user.id)}
                        onSelect={() => toggleMember(user)}
                      />
                    ))
                  ) : (
                    <View style={styles.noResults}>
                      <Ionicons name="person-outline" size={32} color={colors.textMuted} />
                      <Text style={styles.noResultsText}>No users found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {showSavedConfig && (
            <View style={styles.savedSection}>
              {/* Name */}
              <Text style={styles.sectionLabel}>Name</Text>
              <TextInput
                value={savedName}
                onChangeText={setSavedName}
                placeholder="e.g. Ideas, Work notes…"
                placeholderTextColor={colors.textMuted}
                autoFocus
                maxLength={64}
                style={[styles.titleInput, savedName.trim() && styles.titleInputActive]}
              />

              {/* Storage type toggle */}
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Storage</Text>
              <View style={styles.storageToggle}>
                <Pressable
                  onPress={() => setSavedStorageType('remote')}
                  style={[styles.storageOption, savedStorageType === 'remote' && styles.storageOptionSelected]}
                >
                  <View style={[styles.storageIconWrap, savedStorageType === 'remote' && styles.storageIconWrapSelected]}>
                    <Ionicons name="cloud-outline" size={18} color={savedStorageType === 'remote' ? colors.white : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storageLabel}>Cloud</Text>
                    <Text style={styles.storageDesc}>Synced across all devices</Text>
                  </View>
                  {savedStorageType === 'remote' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>

                <Pressable
                  onPress={() => setSavedStorageType('local')}
                  style={[styles.storageOption, savedStorageType === 'local' && styles.storageOptionSelected]}
                >
                  <View style={[styles.storageIconWrap, savedStorageType === 'local' && styles.storageIconWrapSelected]}>
                    <Ionicons name="phone-portrait-outline" size={18} color={savedStorageType === 'local' ? colors.white : colors.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storageLabel}>Local</Text>
                    <Text style={styles.storageDesc}>This device only, no sync</Text>
                  </View>
                  {savedStorageType === 'local' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </Pressable>
              </View>

              {savedStorageType === 'local' && (
                <Text style={styles.storageWarning}>
                  Local notes are stored only on this device and cannot be recovered after reinstall.
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {showAvatarPicker && (
        <AvatarConstructorModal
          visible={showAvatarPicker}
          onClose={() => setShowAvatarPicker(false)}
          onConfirm={handleAvatarResult}
          currentEmoji={avatarEmoji}
          currentColor={avatarColor}
          name={title || (chatType === 'channel' ? 'Channel' : 'Group')}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  cancelBtn: { marginRight: 14 },
  cancelText: { color: colors.primary, fontSize: fontSize.base },
  headerTitle: { flex: 1, color: colors.textPrimary, fontWeight: '700', fontSize: fontSize.lg },
  createText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
  createTextDisabled: { color: '#374151' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  typeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  typeIconWrapSelected: {
    backgroundColor: colors.primaryDark,
  },
  typeInfo: { flex: 1 },
  typeLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  typeDesc: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 2 },

  // User search
  userSearchSection: { marginTop: 20 },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    columnGap: 10,
  },
  selectedUserName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  clearSelectedBtn: { padding: 2 },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
    columnGap: 12,
  },
  userRowPressed: {
    backgroundColor: colors.bgElevated,
  },
  userRowInfo: { flex: 1 },
  userRowName: { color: colors.textPrimary, fontSize: fontSize.base, fontWeight: '500' },
  userRowUsername: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 1 },
  searchLoader: { paddingVertical: 20 },
  noResults: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  noResultsText: { color: colors.textMuted, fontSize: fontSize.sm },
  searchHint: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 10,
    textAlign: 'center',
  },

  // Group / Channel name
  titleSection: { marginTop: 20 },
  titleInput: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  titleInputActive: {
    borderColor: colors.primaryDark,
  },
  savedSection: { marginTop: 4 },
  storageToggle: { gap: 8 },
  storageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 14,
  },
  storageOptionSelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  storageIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageIconWrapSelected: { backgroundColor: colors.primaryDark },
  storageLabel: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  storageDesc: { color: colors.textMuted, fontSize: fontSize.sm, marginTop: 1 },
  storageWarning: {
    marginTop: 10,
    color: '#f59e0b',
    fontSize: fontSize.sm,
    lineHeight: 18,
  },

  // Avatar picker row
  avatarPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    gap: 14,
  },
  avatarPickerCircle: {
    position: 'relative',
  },
  avatarPickerBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgSurface,
  },
  avatarPickerLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
})
