import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { Ionicons } from '@expo/vector-icons'
import { storiesApi } from '@/api/stories'
import { QUERY_KEYS } from '@/config'
import { Avatar } from '@/components/ui/Avatar'
import type { Story } from '@/types'

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')
const STORY_DURATION = 5_000  // ms per story

// ─── Phantom welcome slides ────────────────────────────────────────────────────

interface PhantomSlide {
  id: string
  gradient: readonly [string, string, ...string[]]
  icon: string
  title: string
  subtitle: string
}

const PHANTOM_SLIDES: PhantomSlide[] = [
  {
    id: 'p1',
    gradient: ['#1e1b4b', '#3730a3', '#1d4ed8'],
    icon: 'planet-outline',
    title: 'Welcome to Stories',
    subtitle: 'Share moments that disappear after 24 hours — only the people you choose can see them.',
  },
  {
    id: 'p2',
    gradient: ['#4c1d95', '#7c3aed', '#a855f7'],
    icon: 'images-outline',
    title: 'Share Your Moments',
    subtitle: 'Tap the + button on the Stories tab to pick a photo and post your first story.',
  },
  {
    id: 'p3',
    gradient: ['#0c4a6e', '#0369a1', '#06b6d4'],
    icon: 'hand-left-outline',
    title: 'Navigate Stories',
    subtitle: 'Tap the right side to jump forward, the left side to go back. Simple.',
  },
  {
    id: 'p4',
    gradient: ['#7c2d12', '#c2410c', '#f97316'],
    icon: 'pause-circle-outline',
    title: 'Pause Anytime',
    subtitle: 'Hold your finger on the screen to pause a story and take your time reading it.',
  },
  {
    id: 'p5',
    gradient: ['#14532d', '#15803d', '#4ade80'],
    icon: 'shield-checkmark-outline',
    title: 'Fully Anonymous',
    subtitle: 'Stories are end-to-end private. Only invited users can see your content.',
  },
]

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  active,
  done,
  duration,
  paused,
  onComplete,
}: {
  active: boolean
  done: boolean
  duration: number
  paused: boolean
  onComplete: () => void
}) {
  const progress = useSharedValue(done ? 1 : 0)

  // Start animation when this bar becomes active.
  // The cleanup cancels it immediately when active→false (go back/forward),
  // so onComplete is never called for a bar the user navigated away from.
  useEffect(() => {
    if (!active || done) return
    progress.value = 0
    progress.value = withTiming(1, { duration, easing: Easing.linear }, (finished) => {
      if (finished) runOnJS(onComplete)()
    })
    return () => { cancelAnimation(progress) }
  }, [active, done, duration, onComplete, progress])

  // Fill to 100% instantly when manually skipped forward (done becomes true)
  useEffect(() => {
    if (done) progress.value = 1
  }, [done, progress])

  // Reset visual when bar is neither active nor completed (e.g. going backwards)
  useEffect(() => {
    if (!active && !done) progress.value = 0
  }, [active, done, progress])

  // Pause / resume without restarting from zero
  useEffect(() => {
    if (!active || done) return
    if (paused) {
      cancelAnimation(progress)
    } else {
      const remaining = (1 - progress.value) * duration
      if (remaining > 0) {
        progress.value = withTiming(1, { duration: remaining, easing: Easing.linear }, (finished) => {
          if (finished) runOnJS(onComplete)()
        })
      }
    }
  }, [paused, active, done, duration, onComplete, progress])

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  return (
    <View
      style={{
        flex: 1,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
        borderRadius: 1,
        overflow: 'hidden',
        marginHorizontal: 2,
      }}
    >
      <Animated.View
        style={[
          barStyle,
          { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
        ]}
      />
    </View>
  )
}

// ─── Phantom slide view ───────────────────────────────────────────────────────

function PhantomSlideView({ slide }: { slide: PhantomSlide }) {
  return (
    <LinearGradient
      colors={slide.gradient}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ width: SCREEN_W, height: SCREEN_H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 }}
    >
      <View style={{ alignItems: 'center', gap: 24 }}>
        <View style={{
          width: 96, height: 96, borderRadius: 48,
          backgroundColor: 'rgba(255,255,255,0.12)',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons name={slide.icon as any} size={48} color="rgba(255,255,255,0.92)" />
        </View>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 32 }}>
          {slide.title}
        </Text>
        <Text style={{
          color: 'rgba(255,255,255,0.75)', fontSize: 16, textAlign: 'center',
          lineHeight: 24, maxWidth: 300,
        }}>
          {slide.subtitle}
        </Text>
      </View>
    </LinearGradient>
  )
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function StoryViewerScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>()
  const isPhantom = userId === 'phantom'

  const { data: apiStories = [] } = useQuery({
    queryKey: QUERY_KEYS.STORY(userId ?? ''),
    queryFn: () => storiesApi.getUserStories(userId ?? ''),
    enabled: !!userId && !isPhantom,
  })

  const stories: Story[] = isPhantom ? [] : apiStories
  const totalCount = isPhantom ? PHANTOM_SLIDES.length : stories.length

  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const translateY = useSharedValue(0)
  const screenOpacity = useSharedValue(1)

  const currentStory: Story | undefined = stories[currentIndex]
  const currentSlide: PhantomSlide | undefined = isPhantom ? PHANTOM_SLIDES[currentIndex] : undefined

  // Mark as viewed
  useEffect(() => {
    if (currentStory) {
      storiesApi.view(currentStory.id).catch(() => {})
    }
  }, [currentStory])

  const goBack = useCallback(() => router.back(), [])
  const dismiss = useCallback(() => {
    translateY.value = withTiming(SCREEN_H, { duration: 280, easing: Easing.in(Easing.ease) }, (finished) => {
      if (finished) runOnJS(goBack)()
    })
    screenOpacity.value = withTiming(0, { duration: 220 })
  }, [translateY, screenOpacity, goBack])

  // ── Stable JS callbacks for use inside gestures (worklet thread → JS thread) ──
  // goNext/goPrev capture currentIndex and change on every slide switch, which would
  // force gesture objects to be recreated. Instead we store latest versions in refs
  // and expose stable wrapper callbacks so gestures are created exactly once.
  const goNext = useCallback(() => {
    if (currentIndex < totalCount - 1) setCurrentIndex((i) => i + 1)
    else dismiss()
  }, [currentIndex, totalCount, dismiss])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1)
  }, [currentIndex])

  const goNextRef = useRef(goNext)
  const goPrevRef = useRef(goPrev)
  useEffect(() => { goNextRef.current = goNext }, [goNext])
  useEffect(() => { goPrevRef.current = goPrev }, [goPrev])

  const onTapNext = useCallback(() => goNextRef.current(), [])
  const onTapPrev = useCallback(() => goPrevRef.current(), [])
  const onPause   = useCallback(() => setPaused(true),    [])
  const onResume  = useCallback(() => setPaused(false),   [])

  // ── Gestures — memoized so GestureDetector never gets a new object ──────────
  const tapGesture = useMemo(() =>
    Gesture.Tap().onEnd((e) => {
      if (e.x < SCREEN_W * 0.35) runOnJS(onTapPrev)()
      else runOnJS(onTapNext)()
    }),
  [onTapNext, onTapPrev])

  const longPressGesture = useMemo(() =>
    Gesture.LongPress()
      .minDuration(200)
      .onStart(() => runOnJS(onPause)())
      .onEnd(() => runOnJS(onResume)())
      .onFinalize(() => runOnJS(onResume)()),
  [onPause, onResume])

  const panGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetY([10, 999])
      .failOffsetX([-20, 20])
      .onUpdate((e) => {
        if (e.translationY > 0) {
          translateY.value = e.translationY
          screenOpacity.value = 1 - e.translationY / (SCREEN_H * 0.6)
        }
      })
      .onEnd((e) => {
        if (e.translationY > SCREEN_H * 0.25 || e.velocityY > 800) {
          runOnJS(dismiss)()
        } else {
          translateY.value = withSpring(0, { damping: 18 })
          screenOpacity.value = withTiming(1, { duration: 200 })
        }
      }),
  [translateY, screenOpacity, dismiss])

  const composed = useMemo(() =>
    Gesture.Simultaneous(panGesture, Gesture.Exclusive(longPressGesture, tapGesture)),
  [panGesture, longPressGesture, tapGesture])

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: screenOpacity.value,
  }))

  if (!isPhantom && !currentStory) return null
  if (isPhantom && !currentSlide) return null

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar hidden />
      <GestureDetector gesture={composed}>
        <Animated.View style={[containerStyle, { flex: 1 }]}>
          {/* Story content */}
          {isPhantom ? (
            <PhantomSlideView slide={currentSlide!} />
          ) : (
            <Image
              source={{ uri: currentStory!.media?.url ?? '' }}
              style={{ width: SCREEN_W, height: SCREEN_H }}
              contentFit="cover"
              transition={150}
            />
          )}

          {/* Top gradient + UI */}
          <LinearGradient
            colors={['rgba(0,0,0,0.65)', 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 140,
            }}
          >
            <SafeAreaView>
              {/* Progress bars */}
              <View
                style={{
                  flexDirection: 'row',
                  paddingHorizontal: 8,
                  paddingTop: 8,
                  gap: 0,
                }}
              >
                {Array.from({ length: totalCount }).map((_, i) => (
                  <ProgressBar
                    key={i}
                    active={i === currentIndex}
                    done={i < currentIndex}
                    duration={STORY_DURATION}
                    paused={paused}
                    onComplete={goNext}
                  />
                ))}
              </View>

              {/* Author row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingTop: 10,
                }}
              >
                {isPhantom ? (
                  <View style={{
                    width: 38, height: 38, borderRadius: 19,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 20 }}>👻</Text>
                  </View>
                ) : (
                  <Avatar name={currentStory!.userId} size={38} />
                )}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                    {isPhantom ? 'Phantom' : currentStory!.userId}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
                    {isPhantom
                      ? `${currentIndex + 1} of ${totalCount}`
                      : new Date(currentStory!.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Pressable onPress={dismiss} hitSlop={16}>
                  <Ionicons name="close" size={26} color="#fff" />
                </Pressable>
              </View>
            </SafeAreaView>
          </LinearGradient>

          {/* Bottom gradient + caption */}
          {!isPhantom && currentStory!.caption ? (
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingTop: 60,
                paddingBottom: 48,
                paddingHorizontal: 20,
              }}
            >
              <Text
                style={{
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: 22,
                  textShadowColor: 'rgba(0,0,0,0.5)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {currentStory!.caption}
              </Text>
            </LinearGradient>
          ) : null}

          {/* Tap zones (invisible) */}
          <View
            style={{
              position: 'absolute',
              top: 120,
              left: 0,
              width: SCREEN_W * 0.35,
              bottom: 60,
            }}
            pointerEvents="none"
          />
          <View
            style={{
              position: 'absolute',
              top: 120,
              right: 0,
              width: SCREEN_W * 0.65,
              bottom: 60,
            }}
            pointerEvents="none"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  )
}
