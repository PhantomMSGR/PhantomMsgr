import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { AvatarConstructorModal, type AvatarResult } from '@/components/ui/AvatarConstructorModal'
import { mediaApi } from '@/api/media'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as SecureStore from 'expo-secure-store'
import * as Clipboard from 'expo-clipboard'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { usersApi } from '@/api/users'
import { authApi } from '@/api/auth'
import { QUERY_KEYS, SECURE_STORE_KEYS } from '@/config'
import { Avatar } from '@phantom/ui'
import { Button } from '@phantom/ui'
import { useAuthStore } from '@/store/auth.store'
import { usePreferencesStore } from '@/store/preferences.store'
import { toast } from '@/store/toast.store'
import { colors, fontSize, radius } from '@/constants/theme'
import type { Session } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>
}

function SettingsRow({
  label,
  value,
  onPress,
  rightElement,
  isLast,
  danger,
}: {
  label: string
  value?: string
  onPress?: () => void
  rightElement?: React.ReactNode
  isLast?: boolean
  danger?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && onPress && styles.rowPressed,
      ]}
    >
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {rightElement ?? (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
      {onPress && !rightElement ? (
        <Ionicons name="chevron-forward" size={16} color={danger ? colors.danger : colors.textMuted} style={styles.chevron} />
      ) : null}
    </Pressable>
  )
}

// ─── Recovery token modal ─────────────────────────────────────────────────────

function RecoveryTokenModal({ token, onClose }: { token: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await Clipboard.setStringAsync(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.tokenSheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.tokenHeader}>
            <Text style={styles.tokenTitle}>Recovery Token</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.tokenHint}>
            Store this token safely. It's the only way to recover your account if you lose access.
          </Text>

          <Pressable
            onPress={handleCopy}
            style={styles.tokenBox}
          >
            <Text selectable style={styles.tokenText}>{token}</Text>
          </Pressable>

          <Pressable
            onPress={handleCopy}
            style={[styles.copyBtn, copied && styles.copyBtnSuccess]}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.copyBtnText}>{copied ? 'Copied!' : 'Copy Token'}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ─── Edit profile modal ───────────────────────────────────────────────────────

interface EditProfileModalProps {
  visible: boolean
  onClose: () => void
  initialDisplayName: string
  initialUsername: string | null
  initialBio: string | null
  initialAvatarEmoji: string | null
  initialAvatarColor: string | null
}

function EditProfileModal({
  visible,
  onClose,
  initialDisplayName,
  initialUsername,
  initialBio,
  initialAvatarEmoji,
  initialAvatarColor,
}: EditProfileModalProps) {
  const updateUser = useAuthStore((s) => s.updateUser)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [username, setUsername] = useState(initialUsername ?? '')
  const [bio, setBio] = useState(initialBio ?? '')
  const [avatarEmoji, setAvatarEmoji] = useState(initialAvatarEmoji)
  const [avatarColor, setAvatarColor] = useState(initialAvatarColor)
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null)
  const [avatarPhotoUri, setAvatarPhotoUri] = useState<string | null>(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        displayName: displayName.trim() || undefined,
        username: username.trim() || null,
        bio: bio.trim() || null,
        avatarEmoji,
        avatarColor,
        avatarMediaId,
      }),
    onSuccess: (user) => {
      updateUser({
        displayName: user.displayName,
        username: user.username,
        bio: user.bio,
        avatarEmoji: user.avatarEmoji,
        avatarColor: user.avatarColor,
        avatarMediaId: user.avatarMediaId,
      })
      toast.success('Profile updated')
      onClose()
    },
    onError: () => toast.error('Could not update profile'),
  })

  const handleSave = () => {
    if (!displayName.trim()) {
      toast.error('Display name cannot be empty')
      return
    }
    updateMutation.mutate()
  }

  const handleAvatarResult = async (result: AvatarResult) => {
    if (result.type === 'emoji') {
      setAvatarEmoji(result.emoji)
      setAvatarColor(result.color)
      setAvatarMediaId(null)
      setAvatarPhotoUri(null)
    } else if (result.type === 'photo') {
      setIsUploadingAvatar(true)
      try {
        const media = await mediaApi.upload(result.imageUri, 'photo', 'image/jpeg', 'avatar.jpg')
        setAvatarMediaId(media.id)
        setAvatarPhotoUri(result.imageUri)
        setAvatarEmoji(null)
        setAvatarColor(null)
      } catch {
        toast.error('Could not upload photo')
      } finally {
        setIsUploadingAvatar(false)
      }
    }
    setShowAvatarPicker(false)
  }

  return (
    <>
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalSafe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <Pressable onPress={handleSave} disabled={updateMutation.isPending} style={styles.modalSave}>
              {updateMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </Pressable>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.modalContent}>
            <Pressable style={styles.avatarCenter} onPress={() => setShowAvatarPicker(true)} disabled={isUploadingAvatar}>
              <Avatar
                name={displayName || 'Me'}
                emoji={avatarEmoji}
                color={avatarColor}
                uri={avatarPhotoUri}
                size={80}
              />
              {isUploadingAvatar ? (
                <ActivityIndicator style={{ position: 'absolute' }} color={colors.primary} />
              ) : (
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              )}
            </Pressable>

            <SectionHeader title="Name" />
            <View style={styles.section}>
              <View style={[styles.row, styles.inputRow]}>
                <Text style={styles.inputLabel}>Display Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={colors.textMuted}
                  maxLength={64}
                  returnKeyType="next"
                />
              </View>
            </View>

            <SectionHeader title="Username" />
            <View style={styles.section}>
              <View style={[styles.row, styles.inputRow]}>
                <Text style={styles.inputLabel}>@</Text>
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                  placeholder="username (optional)"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={32}
                  returnKeyType="next"
                />
              </View>
            </View>
            <Text style={styles.inputHint}>
              Others can find you by @username. Use letters, numbers, and underscores.
            </Text>

            <SectionHeader title="Bio" />
            <View style={styles.section}>
              <TextInput
                style={[styles.row, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="A few words about yourself…"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                maxLength={255}
              />
            </View>
            <Text style={styles.inputHint}>{bio.length}/255</Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>

    {showAvatarPicker && (
      <AvatarConstructorModal
        visible={showAvatarPicker}
        onClose={() => setShowAvatarPicker(false)}
        onConfirm={handleAvatarResult}
        currentEmoji={avatarEmoji}
        currentColor={avatarColor}
        name={displayName || 'Me'}
      />
    )}
    </>
  )
}

// ─── Profile screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const currentUser = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const deleteAccount = useAuthStore((s) => s.deleteAccount)
  const queryClient = useQueryClient()
  const [showSessions, setShowSessions] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null)
  const use24Hour = usePreferencesStore((s) => s.use24Hour)
  const setUse24Hour = usePreferencesStore((s) => s.setUse24Hour)

  const { data: settings } = useQuery({
    queryKey: QUERY_KEYS.SETTINGS,
    queryFn: usersApi.getSettings,
  })

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: QUERY_KEYS.SESSIONS,
    queryFn: authApi.getSessions,
    enabled: showSessions,
  })

  const updateSettingsMutation = useMutation({
    mutationFn: usersApi.updateSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS }),
  })

  const revokeSessionMutation = useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SESSIONS }),
  })

  const handleLogout = () => {
    Alert.alert('Log out', 'You can recover your account using your anonymous token.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone. Make sure you have saved your recovery token first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'Your account and all messages will be deleted forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: deleteAccount },
              ],
            )
          },
        },
      ],
    )
  }

  const handleShowAnonymousToken = async () => {
    const token = await SecureStore.getItemAsync(SECURE_STORE_KEYS.ANONYMOUS_TOKEN)
    if (token) {
      setRecoveryToken(token)
    } else {
      Alert.alert('Not found', 'Token not stored on this device.')
    }
  }

  if (!currentUser) return null

  const privacyRows = [
    ['Last Seen',      'privacyLastSeen'],
    ['Profile Photo',  'privacyProfilePhoto'],
    ['Online Status',  'privacyOnlineStatus'],
  ] as const

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profile</Text>
        </View>

        {/* User card */}
        <View style={styles.userCard}>
          <Avatar name={currentUser.displayName} emoji={currentUser.avatarEmoji} color={currentUser.avatarColor} size={64} />
          <View style={styles.userInfo}>
            <Text style={styles.displayName} numberOfLines={1}>
              {currentUser.displayName}
            </Text>
            {currentUser.username ? (
              <Text style={styles.username}>@{currentUser.username}</Text>
            ) : null}
            {currentUser.bio ? (
              <Text style={styles.bio} numberOfLines={2}>
                {currentUser.bio}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => setShowEditModal(true)}
            style={({ pressed }) => [styles.editBtn, pressed && styles.editBtnPressed]}
          >
            <Ionicons name="pencil" size={16} color={colors.primary} />
          </Pressable>
        </View>

        {/* Privacy settings */}
        <SectionHeader title="Privacy" />
        <View style={styles.section}>
          {privacyRows.map(([label, key], i) => (
            <SettingsRow
              key={key}
              label={label}
              value={settings?.[key] ?? '—'}
              isLast={i === privacyRows.length - 1}
              onPress={() =>
                Alert.alert(label, undefined, [
                  { text: 'Everyone', onPress: () => updateSettingsMutation.mutate({ [key]: 'everyone' }) },
                  { text: 'Contacts',  onPress: () => updateSettingsMutation.mutate({ [key]: 'contacts' }) },
                  { text: 'Nobody',   onPress: () => updateSettingsMutation.mutate({ [key]: 'nobody' }) },
                  { text: 'Cancel', style: 'cancel' },
                ])
              }
            />
          ))}
        </View>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <View style={styles.section}>
          <SettingsRow
            label="Messages"
            rightElement={
              <Switch
                value={settings?.notifyMessages ?? true}
                onValueChange={(v) => updateSettingsMutation.mutate({ notifyMessages: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsRow
            label="Groups"
            rightElement={
              <Switch
                value={settings?.notifyGroups ?? true}
                onValueChange={(v) => updateSettingsMutation.mutate({ notifyGroups: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
          <SettingsRow
            label="Sound"
            isLast
            rightElement={
              <Switch
                value={settings?.notifySound ?? true}
                onValueChange={(v) => updateSettingsMutation.mutate({ notifySound: v })}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </View>

        {/* App settings */}
        <SectionHeader title="App Settings" />
        <View style={styles.section}>
          <SettingsRow
            label="24-hour time"
            isLast
            rightElement={
              <Switch
                value={use24Hour}
                onValueChange={setUse24Hour}
                trackColor={{ true: colors.primary }}
              />
            }
          />
        </View>

        {/* Security */}
        <SectionHeader title="Security" />
        <View style={styles.section}>
          <SettingsRow
            label="Recovery Token"
            value="Tap to view"
            onPress={handleShowAnonymousToken}
          />
          <SettingsRow
            label="Active Sessions"
            value={showSessions ? 'Hide' : 'Show'}
            isLast
            onPress={() => setShowSessions((v) => !v)}
          />
        </View>

        {/* Sessions list */}
        {showSessions && (
          <View style={styles.sessionsSection}>
            {sessionsLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.sessionsLoader} />
            ) : (
              sessions?.map((session: Session, i: number) => (
                <View key={session.id} style={[styles.sessionRow, i < (sessions.length - 1) && styles.rowBorder]}>
                  <View style={styles.sessionInfo}>
                    <Text style={styles.sessionDevice}>
                      {session.deviceName ?? session.platform}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {session.ipAddress ?? 'Unknown IP'} · {session.platform}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      Alert.alert('Revoke session?', undefined, [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Revoke',
                          style: 'destructive',
                          onPress: () => revokeSessionMutation.mutate(session.id),
                        },
                      ])
                    }
                    style={styles.revokeBtn}
                  >
                    <Text style={styles.revokeText}>Revoke</Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* Account actions */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingsRow
            label="Log Out"
            isLast={false}
            onPress={handleLogout}
          />
          <SettingsRow
            label="Delete Account"
            danger
            isLast
            onPress={handleDeleteAccount}
          />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {showEditModal && (
        <EditProfileModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          initialDisplayName={currentUser.displayName}
          initialUsername={currentUser.username}
          initialBio={currentUser.bio}
          initialAvatarEmoji={currentUser.avatarEmoji}
          initialAvatarColor={currentUser.avatarColor}
        />
      )}

      {recoveryToken !== null && (
        <RecoveryTokenModal
          token={recoveryToken}
          onClose={() => setRecoveryToken(null)}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  pageTitle: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userCard: {
    marginHorizontal: 16,
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 16,
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: fontSize.lg,
  },
  username: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  bio: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: 4,
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnPressed: {
    opacity: 0.7,
  },
  sectionHeader: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  section: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  rowPressed: {
    backgroundColor: colors.bgElevated,
  },
  rowLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
  },
  rowLabelDanger: {
    color: colors.danger,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginRight: 4,
  },
  chevron: {
    marginLeft: 4,
  },
  sessionsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  sessionsLoader: {
    paddingVertical: 16,
  },
  sessionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDevice: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  sessionMeta: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  revokeBtn: {
    marginLeft: 12,
  },
  revokeText: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },

  // Recovery token modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tokenSheet: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.xl,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tokenTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  tokenHint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: 16,
  },
  tokenBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  tokenText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 20,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 13,
  },
  copyBtnSuccess: {
    backgroundColor: '#16a34a',
  },
  copyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: fontSize.base,
  },

  // Edit modal
  modalSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  modalCancel: {
    width: 70,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
  modalSave: {
    width: 70,
    alignItems: 'flex-end',
  },
  modalSaveText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  modalContent: {
    paddingBottom: 40,
  },
  avatarCenter: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  inputRow: {
    paddingVertical: 12,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: fontSize.base,
    width: 100,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.base,
    padding: 0,
  },
  bioInput: {
    color: colors.textPrimary,
    fontSize: fontSize.base,
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
    alignItems: 'flex-start',
  },
  inputHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    paddingHorizontal: 20,
    paddingTop: 6,
  },
})
