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
import { colors, radius, fontSize } from '@/constants/theme'

type Step = 'form' | 'backup'

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('form')
  const [displayName, setDisplayName] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [anonymousToken, setAnonymousToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ displayName?: string }>({})

  const register = useAuthStore((s) => s.register)

  const validate = () => {
    const errs: typeof errors = {}
    if (!displayName.trim()) errs.displayName = 'Name is required'
    else if (displayName.trim().length < 2) errs.displayName = 'Name must be at least 2 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleRegister = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const { anonymousToken: token } = await register(
        displayName.trim(),
        deviceName.trim() || undefined,
      )
      setAnonymousToken(token)
      setStep('backup')
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      Alert.alert('Registration failed', msg ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToken = async () => {
    await Clipboard.setStringAsync(anonymousToken)
    Alert.alert('Copied!', 'Keep this token somewhere very safe. You cannot get it again.')
  }

  const handleContinue = () => {
    router.replace('/(app)/(tabs)/chats')
  }

  // ── Step: backup token ────────────────────────────────────────────────────

  if (step === 'backup') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          <View style={styles.headerBlock}>
            <Text style={styles.heading}>Save your key</Text>
            <Text style={styles.subheading}>
              This is your recovery token. Without it, you cannot restore your account
              if you lose access. Store it in a password manager or write it down.
            </Text>
          </View>

          <View style={styles.tokenBox}>
            <Text style={styles.tokenText} selectable>
              {anonymousToken}
            </Text>
          </View>

          <View style={styles.formActions}>
            <Button
              label="Copy to Clipboard"
              variant="secondary"
              fullWidth
              onPress={handleCopyToken}
            />

            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                PhantomMsgr has no servers storing your identity. If you lose this token,
                your account is gone permanently.
              </Text>
            </View>

            <Button
              label="I've saved it — Continue"
              variant="primary"
              fullWidth
              onPress={handleContinue}
            />
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // ── Step: registration form ───────────────────────────────────────────────

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
              <Text style={styles.heading}>Create Account</Text>
              <Text style={styles.subheading}>
                Anonymous — no email or phone needed.
              </Text>
            </View>

            <View style={styles.formFields}>
              <TextInput
                label="Display Name"
                placeholder="How should others see you?"
                value={displayName}
                onChangeText={setDisplayName}
                error={errors.displayName}
                maxLength={64}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                label="Device Name (optional)"
                placeholder="e.g. My iPhone"
                value={deviceName}
                onChangeText={setDeviceName}
                maxLength={128}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
            </View>

            <View style={styles.submitActions}>
              <Button
                label="Create Account"
                variant="primary"
                fullWidth
                loading={loading}
                onPress={handleRegister}
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
  tokenBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenText: {
    color: colors.primary,
    fontFamily: 'monospace',
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  formFields: {
    rowGap: 16,
  },
  formActions: {
    rowGap: 12,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    columnGap: 8,
    backgroundColor: 'rgba(234,179,8,0.1)',
    borderRadius: radius.lg,
    padding: 12,
  },
  warningIcon: {
    fontSize: fontSize.lg,
  },
  warningText: {
    color: '#facc15',
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },
  submitActions: {
    flex: 1,
    justifyContent: 'flex-end',
    rowGap: 12,
  },
})
