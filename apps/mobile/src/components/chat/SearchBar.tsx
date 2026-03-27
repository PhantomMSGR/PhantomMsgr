import React, { useCallback, useRef } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as RNTextInput,
} from 'react-native'
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { ANIM } from '@/constants/animation'
import { colors, fontSize, radius } from '@/constants/theme'

interface Props {
  value: string
  onChange: (text: string) => void
  onCancel: () => void
  isExpanded: boolean
  onExpand: () => void
}

// Cancel button does NOT animate its width — text never gets clipped.
// Instead the button slides in from the right while the input fades in.
const CANCEL_WIDTH = 72

export function SearchBar({ value, onChange, onCancel, isExpanded, onExpand }: Props) {
  const inputRef = useRef<RNTextInput>(null)
  const progress = useSharedValue(isExpanded ? 1 : 0)

  const handleExpand = useCallback(() => {
    progress.value = withTiming(1, { duration: ANIM.duration.normal, easing: ANIM.easing.standard })
    onExpand()
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [progress, onExpand])

  const handleCancel = useCallback(() => {
    progress.value = withTiming(0, { duration: ANIM.duration.normal, easing: ANIM.easing.standard })
    onChange('')
    inputRef.current?.blur()
    onCancel()
  }, [progress, onChange, onCancel])

  // Input wrapper fades + slides in
  const inputWrapperStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: interpolate(progress.value, [0, 0.6, 1], [0, 0.8, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [8, 0]) }],
  }))

  // Cancel button slides in from right, no width animation
  const cancelBtnStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ translateX: interpolate(progress.value, [0, 1], [CANCEL_WIDTH, 0]) }],
    width: CANCEL_WIDTH,
  }))

  return (
    <View style={styles.wrapper}>
      {!isExpanded ? (
        // Collapsed: just the search icon button
        <Pressable onPress={handleExpand} hitSlop={12} style={styles.iconBtn}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
        </Pressable>
      ) : (
        // Expanded: full-width input + cancel
        <>
          <Animated.View style={[styles.inputWrapper, inputWrapperStyle]}>
            <Ionicons name="search" size={15} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChange}
              placeholder="Search chats…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </Animated.View>

          <Animated.View style={cancelBtnStyle}>
            <Pressable onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText} numberOfLines={1}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    marginRight: 6,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    // Fix Android: text vertically centred, no extra built-in padding
    paddingVertical: 0,
    paddingTop: Platform.OS === 'android' ? 0 : undefined,
    paddingBottom: Platform.OS === 'android' ? 0 : undefined,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  cancelBtn: {
    flex: 1,
    height: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 2,
  },
  cancelText: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
})
