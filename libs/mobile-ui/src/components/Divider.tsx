import React from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { colors, fontSize } from '../tokens'

export interface DividerProps {
  label?: string
  orientation?: 'horizontal' | 'vertical'
  color?: string
  thickness?: number
  inset?: number
  style?: ViewStyle
}

export function Divider({
  label,
  orientation = 'horizontal',
  color = colors.border,
  thickness = StyleSheet.hairlineWidth,
  inset = 0,
  style,
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <View
        style={[
          {
            width: thickness,
            alignSelf: 'stretch',
            backgroundColor: color,
          },
          style,
        ]}
      />
    )
  }

  if (label) {
    return (
      <View style={[styles.horizontalWithLabel, { paddingHorizontal: inset }, style]}>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
        <Text style={[styles.labelText, { color: colors.textMuted }]}>{label}</Text>
        <View style={[styles.line, { backgroundColor: color, height: thickness }]} />
      </View>
    )
  }

  return (
    <View
      style={[
        styles.horizontal,
        {
          height: thickness,
          backgroundColor: color,
          marginHorizontal: inset,
        },
        style,
      ]}
    />
  )
}

Divider.displayName = 'Divider'

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  horizontalWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  line: {
    flex: 1,
  },
  labelText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
})
