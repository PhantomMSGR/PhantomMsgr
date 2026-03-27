import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { useAuthStore } from '@/store/auth.store'
import { colors, fontSize } from '@/constants/theme'

export default function RecoverScreen() {
  const [token, setToken] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const recover = useAuthStore((s) => s.recover)

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync()
    if (text) setToken(text.trim())
  }

  const validate = () => {
    if (!token.trim()) { setError('Token is required'); return false }
    if (token.trim().length !== 64) { setError('Token must be exactly 64 characters'); return false }
    if (!/^[0-9a-f]+$/i.test(token.trim())) { setError('Token must be a hex string'); return false }
    setError(undefined)
    return true
  }

  const handleRecover = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      await recover(token.trim(), deviceName.trim() || undefined)
      router.replace('/(app)/(tabs)/chats')
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? 'Token not found or account deleted.'
      Alert.alert('Recovery failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.screen}>
            <View style={styles.headerBlock}>
              <Text style={styles.heading}>Recover Account</Text>
              <Text style={styles.subheading}>
                Paste your 64-character recovery token to restore access to your account.
              </Text>
            </View>

            <View style={styles.formFields}>
              <View style={styles.tokenFieldRow}>
                <TextInput
                  label="Recovery Token"
                  placeholder="Paste your 64-character token here"
                  value={token}
                  onChangeText={(v) => { setToken(v); setError(undefined) }}
                  error={error}
                  multiline
                  numberOfLines={3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{ fontFamily: 'monospace', minHeight: 80 }}
                />
                <Button
                  label="Paste from Clipboard"
                  variant="ghost"
                  size="sm"
                  onPress={handlePaste}
                />
              </View>

              <TextInput
                label="Device Name (optional)"
                placeholder="e.g. My Android"
                value={deviceName}
                onChangeText={setDeviceName}
                maxLength={128}
                returnKeyType="done"
                onSubmitEditing={handleRecover}
              />
            </View>

            <View style={styles.submitActions}>
              <Button
                label="Recover Account"
                variant="primary"
                fullWidth
                loading={loading}
                onPress={handleRecover}
              />
              <Button
                label="Back"
                variant="ghost"
                fullWidth
                onPress={() => router.back()}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexGrow: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    rowGap: 24,
  },
  headerBlock: {
    rowGap: 8,
  },
  heading: {
    fontSize: fontSize['3xl'],
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 22,
  },
  formFields: {
    rowGap: 16,
  },
  tokenFieldRow: {
    rowGap: 6,
  },
  submitActions: {
    flex: 1,
    justifyContent: 'flex-end',
    rowGap: 12,
  },
})
