import React, { useCallback, useRef, useState } from 'react'
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { colors, fontSize, radius } from '@/constants/theme'
import { Avatar } from './Avatar'

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width
const PREVIEW_SIZE = 120
const CIRCLE_R = PREVIEW_SIZE / 2

const EMOJI_LIST = [
  '😀','😎','🤩','😍','🥰','😇','🤓','😈','👻','🤖',
  '🐱','🐶','🦊','🐻','🐼','🐨','🐯','🦁','🐸','🐲',
  '🦋','🌸','🌺','🌻','🌈','⭐','🔥','💎','🎸','🎭',
  '🚀','🌙','🍕','🍦','🎮','🏆','💡','🎯','🎨','🌊',
  '🏔','🌴','🍀','🦄','👑','💜','💙','💚','❤️','🖤',
]

const COLOR_PALETTE = [
  '#1d4ed8', '#7c3aed', '#db2777', '#dc2626', '#d97706',
  '#16a34a', '#0891b2', '#374151', '#1e293b', '#7f1d1d',
  '#134e4a', '#1e1b4b', '#701a75', '#064e3b', '#78350f',
  '#312e81', '#1c1917', '#0f172a', '#4a044e', '#042f2e',
]

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'emoji' | 'photo'

export type AvatarResult =
  | {
      type: 'emoji'
      emoji: string
      color: string
    }
  | {
      type: 'photo'
      imageUri: string
      offsetX: number
      offsetY: number
      scale: number
    }

interface Props {
  visible: boolean
  onClose: () => void
  onConfirm: (result: AvatarResult) => void
  currentEmoji?: string | null
  currentColor?: string | null
  name: string
}

// ─── Photo pan/zoom preview ───────────────────────────────────────────────────

function PhotoCropPreview({
  uri,
  onOffsetChange,
}: {
  uri: string
  onOffsetChange: (x: number, y: number, scale: number) => void
}) {
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const scale = useSharedValue(1)
  const savedX = useSharedValue(0)
  const savedY = useSharedValue(0)
  const savedScale = useSharedValue(1)

  const CONTAINER = SCREEN_W - 80
  const IMG_SIZE = CONTAINER

  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max)

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const maxOffset = (IMG_SIZE * (scale.value - 1)) / 2
      translateX.value = clamp(savedX.value + e.translationX, -maxOffset, maxOffset)
      translateY.value = clamp(savedY.value + e.translationY, -maxOffset, maxOffset)
    })
    .onEnd(() => {
      savedX.value = translateX.value
      savedY.value = translateY.value
      onOffsetChange(translateX.value, translateY.value, scale.value)
    })

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4)
    })
    .onEnd(() => {
      savedScale.value = scale.value
      onOffsetChange(translateX.value, translateY.value, scale.value)
    })

  const composed = Gesture.Simultaneous(pan, pinch)

  const imgStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  return (
    <View style={{ alignItems: 'center', marginVertical: 16 }}>
      <View
        style={{
          width: CONTAINER,
          height: CONTAINER,
          borderRadius: CONTAINER / 2,
          overflow: 'hidden',
          borderWidth: 3,
          borderColor: colors.primary,
        }}
      >
        <GestureDetector gesture={composed}>
          <Animated.Image
            source={{ uri }}
            style={[{ width: IMG_SIZE, height: IMG_SIZE }, imgStyle]}
            resizeMode="cover"
          />
        </GestureDetector>
      </View>
      <Text style={styles.photoHint}>Pinch to zoom · Drag to reposition</Text>
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AvatarConstructorModal({
  visible,
  onClose,
  onConfirm,
  currentEmoji,
  currentColor,
  name,
}: Props) {
  const [tab, setTab] = useState<Tab>('emoji')
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji ?? EMOJI_LIST[0])
  const [selectedColor, setSelectedColor] = useState(currentColor ?? COLOR_PALETTE[0])
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const photoOffset = useRef({ x: 0, y: 0, scale: 1 })

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    })
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri)
    }
  }

  const handleConfirm = useCallback(() => {
    if (tab === 'emoji') {
      onConfirm({ type: 'emoji', emoji: selectedEmoji, color: selectedColor })
    } else if (photoUri) {
      onConfirm({
        type: 'photo',
        imageUri: photoUri,
        offsetX: photoOffset.current.x,
        offsetY: photoOffset.current.y,
        scale: photoOffset.current.scale,
      })
    }
  }, [tab, selectedEmoji, selectedColor, photoUri, onConfirm])

  const canConfirm = tab === 'emoji' || (tab === 'photo' && !!photoUri)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Set Avatar</Text>
          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={styles.headerBtn}
          >
            <Text style={[styles.headerBtnText, styles.headerSave, !canConfirm && styles.headerSaveDisabled]}>
              Done
            </Text>
          </Pressable>
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <Avatar
            name={name}
            emoji={tab === 'emoji' ? selectedEmoji : undefined}
            color={tab === 'emoji' ? selectedColor : undefined}
            mediaUrl={tab === 'photo' && photoUri ? photoUri : undefined}
            size={PREVIEW_SIZE}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab('emoji')}
            style={[styles.tab, tab === 'emoji' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'emoji' && styles.tabTextActive]}>Emoji</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('photo')}
            style={[styles.tab, tab === 'photo' && styles.tabActive]}
          >
            <Text style={[styles.tabText, tab === 'photo' && styles.tabTextActive]}>Photo</Text>
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {tab === 'emoji' ? (
            <>
              {/* Emoji grid */}
              <Text style={styles.sectionLabel}>Choose Emoji</Text>
              <View style={styles.emojiGrid}>
                {EMOJI_LIST.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setSelectedEmoji(e)}
                    style={[
                      styles.emojiCell,
                      selectedEmoji === e && styles.emojiCellSelected,
                    ]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </Pressable>
                ))}
              </View>

              {/* Color palette */}
              <Text style={styles.sectionLabel}>Background Color</Text>
              <View style={styles.colorGrid}>
                {COLOR_PALETTE.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[
                      styles.colorCell,
                      { backgroundColor: c },
                      selectedColor === c && styles.colorCellSelected,
                    ]}
                  >
                    {selectedColor === c && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              {photoUri ? (
                <PhotoCropPreview
                  uri={photoUri}
                  onOffsetChange={(x, y, s) => {
                    photoOffset.current = { x, y, scale: s }
                  }}
                />
              ) : (
                <Pressable onPress={handlePickPhoto} style={styles.pickPhotoBtnLarge}>
                  <Ionicons name="image-outline" size={32} color={colors.primary} />
                  <Text style={styles.pickPhotoLabel}>Choose from gallery</Text>
                </Pressable>
              )}
              {photoUri && (
                <Pressable onPress={handlePickPhoto} style={styles.changePhotoBtn}>
                  <Ionicons name="refresh-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.changePhotoBtnText}>Change photo</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const EMOJI_COLS = 8
const CELL_SIZE = Math.floor((SCREEN_W - 32 - (EMOJI_COLS - 1) * 4) / EMOJI_COLS)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  headerBtn: {
    width: 70,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  headerBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
  },
  headerSave: {
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerSaveDisabled: {
    opacity: 0.4,
  },

  preview: {
    alignItems: 'center',
    paddingVertical: 24,
  },

  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.lg,
    padding: 3,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.md,
  },
  tabActive: {
    backgroundColor: colors.bgSurface,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.textPrimary,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  sectionLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 10,
  },

  // Emoji grid
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  emojiCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  },
  emojiCellSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  emojiText: {
    fontSize: CELL_SIZE * 0.48,
  },

  // Color grid
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorCell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCellSelected: {
    borderWidth: 3,
    borderColor: colors.white,
  },

  // Photo picker
  pickPhotoBtnLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
    borderRadius: radius.xl,
    paddingVertical: 48,
    marginVertical: 16,
    gap: 12,
  },
  pickPhotoLabel: {
    color: colors.primary,
    fontSize: fontSize.base,
    fontWeight: '500',
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  changePhotoBtnText: {
    color: colors.primary,
    fontSize: fontSize.sm,
  },
  photoHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 8,
    textAlign: 'center',
  },
})
