import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '@/components/ui/Button'
import { colors, radius, fontSize } from '@/constants/theme'

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#0f0f0f', '#0a0a1a']} style={styles.gradient}>
        <View style={styles.container}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoBox}>
              <Text style={styles.logoEmoji}>👻</Text>
            </View>

            <View style={styles.titleBlock}>
              <Text style={styles.title}>PhantomMsgr</Text>
              <Text style={styles.subtitle}>
                Encrypted, anonymous messaging.{'\n'}No email. No phone. Just you.
              </Text>
            </View>

            {/* Feature pills */}
            <View style={styles.pillRow}>
              {['Anonymous', 'Encrypted', 'Open Source'].map((tag) => (
                <View key={tag} style={styles.pill}>
                  <Text style={styles.pillText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              label="Create Account"
              variant="primary"
              size="lg"
              fullWidth
              onPress={() => router.push('/(auth)/register')}
            />
            <Button
              label="Recover Account"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => router.push('/(auth)/recover')}
            />
            <Text style={styles.terms}>
              By continuing you agree to our Terms of Service
            </Text>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    rowGap: 24,
  },
  logoBox: {
    width: 96,
    height: 96,
    borderRadius: radius.xxl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: fontSize['5xl'],
  },
  titleBlock: {
    alignItems: 'center',
    rowGap: 12,
  },
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.base,
    lineHeight: 24,
    maxWidth: 280,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  pill: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  actions: {
    width: '100%',
    rowGap: 12,
  },
  terms: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: 8,
  },
})
