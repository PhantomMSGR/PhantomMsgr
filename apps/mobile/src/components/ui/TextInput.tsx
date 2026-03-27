import React, { forwardRef } from 'react'
import {
  StyleSheet,
  TextInput as RNTextInput,
  Text,
  View,
  type TextInputProps,
} from 'react-native'
import { colors, radius, fontSize } from '@/constants/theme'

interface Props extends TextInputProps {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const TextInput = forwardRef<RNTextInput, Props>(
  ({ label, error, leftIcon, rightIcon, style, ...rest }, ref) => (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label}</Text>
      ) : null}

      <View style={[styles.inputRow, error ? styles.inputError : styles.inputNormal]}>
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}

        <RNTextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          {...rest}
        />

        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}
    </View>
  ),
)

TextInput.displayName = 'TextInput'

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    rowGap: 6,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  inputNormal: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  leftIcon: {
    marginRight: 12,
  },
  rightIcon: {
    marginLeft: 12,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginLeft: 4,
  },
})
