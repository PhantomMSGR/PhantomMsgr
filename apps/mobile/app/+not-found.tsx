import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, fontSize, radius } from '@/constants/theme'

export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.icon}>🌫️</Text>
        <Text style={styles.title}>Screen not found</Text>
        <Text style={styles.subtitle}>This page doesn't exist.</Text>
        <Link href="/(app)/(tabs)/chats" style={styles.link}>
          Go to Chats
        </Link>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    rowGap: 16,
  },
  icon: {
    fontSize: fontSize['5xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.base,
  },
  link: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '500',
    marginTop: 16,
  },
})
