import React from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { colors, typography } from '../tokens'
import { Button, type ButtonVariant } from './Button'

export interface EmptyStateProps {
  icon?: ComponentProps<typeof Ionicons>['name']
  title: string
  description?: string
  action?: {
    label: string
    onPress: () => void
    variant?: ButtonVariant
  }
  style?: ViewStyle
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      {icon && (
        <View style={styles.iconWrapper}>
          <Ionicons name={icon} size={48} color={colors.textMuted} />
        </View>
      )}

      <Text style={[styles.title, !icon && styles.titleNoIcon]}>{title}</Text>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant={action.variant ?? 'primary'}
          style={styles.actionButton}
        />
      ) : null}
    </View>
  )
}

EmptyState.displayName = 'EmptyState'

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...typography.h4,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleNoIcon: {
    marginTop: 0,
  },
  description: {
    ...typography.bodySmall,
    textAlign: 'center',
    marginBottom: 0,
  },
  actionButton: {
    marginTop: 20,
    minWidth: 160,
  },
})
