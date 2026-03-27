import React, { memo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, fontSize, radius } from '@/constants/theme'

interface Props {
  date: string
}

export const DateSeparator = memo(function DateSeparator({ date }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Text style={styles.text}>{date}</Text>
      </View>
    </View>
  )
})

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: 24,
  },
  pill: {
    backgroundColor: 'rgba(36,36,36,0.8)',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
})
