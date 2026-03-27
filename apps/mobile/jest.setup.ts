import '@testing-library/jest-native/extend-expect'

// ─── Reanimated ───────────────────────────────────────────────────────────────
jest.mock('react-native-reanimated', () => {
  const { View, Text, Image } = require('react-native')
  const React = require('react')

  // Minimal shared value — mutable box
  const useSharedValue = (init: any) => {
    const ref = { value: init }
    return new Proxy(ref, {
      get: (t, p) => (p === 'value' ? t.value : undefined),
      set: (t, p, v) => { if (p === 'value') { t.value = v }; return true },
    })
  }

  // useAnimatedStyle — just return the style synchronously (worklet fn called normally)
  const useAnimatedStyle = (fn: () => any) => {
    try { return fn() } catch { return {} }
  }

  // withTiming — immediately return target value in test
  const withTiming = (toValue: any) => toValue

  // interpolate — simple linear between input/output ranges, clamped
  const interpolate = (value: number, inputRange: number[], outputRange: number[]) => {
    if (value <= inputRange[0]) return outputRange[0]
    if (value >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1]
    for (let i = 0; i < inputRange.length - 1; i++) {
      if (value >= inputRange[i] && value <= inputRange[i + 1]) {
        const t = (value - inputRange[i]) / (inputRange[i + 1] - inputRange[i])
        return outputRange[i] + t * (outputRange[i + 1] - outputRange[i])
      }
    }
    return outputRange[0]
  }

  const Extrapolation = { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' }

  // runOnJS — just return the function as-is (already on JS thread in tests)
  const runOnJS = (fn: any) => fn

  // Animated components — just use RN components
  const Animated = {
    View,
    Text,
    Image,
    ScrollView: View,
    FlatList: View,
    createAnimatedComponent: (Component: any) => Component,
  }

  return {
    default: Animated,
    ...Animated,
    useSharedValue,
    useAnimatedStyle,
    useAnimatedProps: (fn: any) => { try { return fn() } catch { return {} } },
    useAnimatedScrollHandler: () => ({}),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedReaction: jest.fn(),
    useDerivedValue: (fn: any) => { const sv = useSharedValue(undefined); try { sv.value = fn() } catch {}; return sv },
    useAnimatedGestureHandler: () => ({}),
    withTiming,
    withSpring: (toValue: any) => toValue,
    withDecay: () => 0,
    withDelay: (_: any, animation: any) => animation,
    withSequence: (...anims: any[]) => anims[anims.length - 1],
    withRepeat: (animation: any) => animation,
    cancelAnimation: jest.fn(),
    runOnJS,
    runOnUI: (fn: any) => fn,
    interpolate,
    interpolateColor: () => 0,
    Extrapolation,
    ExtrapolationType: Extrapolation,
    Easing: {
      linear: (t: number) => t,
      ease: (t: number) => t,
      bezier: () => (t: number) => t,
      in: (easing: any) => easing,
      out: (easing: any) => easing,
      inOut: (easing: any) => easing,
    },
    // Enums / constants
    SensorType: {},
    IOSReferenceFrame: {},
    InterfaceOrientation: {},
    KeyboardState: {},
    ReduceMotion: {},
    ColorSpace: {},
    reanimatedVersion: '4.x.x',
    // Test utilities (no-ops in this env)
    setUpTests: jest.fn(),
    advanceAnimationByFrame: jest.fn(),
    advanceAnimationByTime: jest.fn(),
    getAnimatedStyle: (style: any) => style,
    withReanimatedTimer: (fn: any) => fn(),
    // Layout animations — must support chaining: .duration().springify().delay() etc.
    ...[
      'FadeIn', 'FadeOut', 'FadeInDown', 'FadeOutDown', 'FadeInUp', 'FadeOutUp',
      'SlideInRight', 'SlideOutLeft', 'SlideInLeft', 'SlideOutRight',
      'ZoomIn', 'ZoomOut', 'BounceIn', 'BounceOut', 'Layout',
    ].reduce((acc: any, name: string) => {
      const make = (): any => {
        const obj: any = {}
        ;['duration', 'delay', 'springify', 'damping', 'stiffness', 'easing', 'withInitialValues'].forEach((m) => {
          obj[m] = jest.fn(() => obj)
        })
        return obj
      }
      acc[name] = make()
      return acc
    }, {}),
  }
})

// ─── Gesture Handler ──────────────────────────────────────────────────────────
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View

  // Each Pan instance stores its registered callbacks so tests can invoke them directly.
  const makePan = () => {
    const cbs: Record<string, Function> = {}
    const g: any = {
      // Call a named lifecycle callback with a synthetic event
      _fire: (name: string, event: object = {}) => cbs[name]?.(event),
    }
    // Config setters — just chain
    ;['activeOffsetX', 'failOffsetY', 'minVelocityX', 'simultaneousWithExternalGesture'].forEach((m) => {
      g[m] = jest.fn(() => g)
    })
    // Lifecycle callbacks — store the fn AND chain
    ;['onBegin', 'onUpdate', 'onEnd', 'onStart', 'onFinalize'].forEach((m) => {
      g[m] = jest.fn((cb: Function) => {
        cbs[m] = cb
        return g
      })
    })
    return g
  }

  const makeTap = () => {
    const g: any = {}
    const methods = ['numberOfTaps', 'onStart', 'onEnd', 'onTouchesCancelled']
    methods.forEach((m) => { g[m] = jest.fn(() => g) })
    return g
  }
  const makeLongPress = () => {
    const g: any = {}
    const methods = ['minDuration', 'onStart', 'onEnd']
    methods.forEach((m) => { g[m] = jest.fn(() => g) })
    return g
  }
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: any) => children,
    Gesture: {
      Pan: jest.fn(makePan),
      Tap: jest.fn(makeTap),
      LongPress: jest.fn(makeLongPress),
      Native: jest.fn(() => ({})),
      Exclusive: jest.fn((...args: any[]) => args[0]),
      Simultaneous: jest.fn((...args: any[]) => args[0]),
    },
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    NativeViewGestureHandler: View,
  }
})

// ─── @react-native-async-storage/async-storage ───────────────────────────────
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}))

// ─── expo-secure-store ────────────────────────────────────────────────────────
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}))

// ─── expo-router ──────────────────────────────────────────────────────────────
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: 'Link',
  Redirect: 'Redirect',
  Stack: { Screen: 'Stack.Screen' },
  Tabs: { Screen: 'Tabs.Screen' },
}))

// ─── @phantom/ui ──────────────────────────────────────────────────────────────
// Mock the shared UI library so tests don't need reanimated's native module
jest.mock('@phantom/ui', () => {
  const React = require('react')
  const { View, Text } = require('react-native')
  const identity = (t: number) => t
  const Easing = {
    linear: identity,
    ease: identity,
    cubic: identity,
    quad: identity,
    back: () => identity,
    out: (fn: any) => fn,
    in: (fn: any) => fn,
    inOut: (fn: any) => fn,
    bezier: () => identity,
  }

  // Skeleton: base component + Skeleton.Avatar / Skeleton.Text sub-components
  const SkeletonBase = ({ children }: any) => React.createElement(View, null, children)
  SkeletonBase.Avatar = ({ size }: any) => React.createElement(View, { style: { width: size, height: size } })
  SkeletonBase.Text = ({ lines = 1 }: any) =>
    React.createElement(View, null, ...Array.from({ length: lines }, (_, i) => React.createElement(View, { key: i })))

  // Avatar: simple initials placeholder
  const Avatar = ({ name, size }: any) =>
    React.createElement(View, { style: { width: size, height: size } },
      React.createElement(Text, null, (name ?? '?')[0]),
    )

  return {
    ANIM: {
      duration: { fast: 160, normal: 220, slow: 320, snap: 260 },
      easing: {
        standard: identity,
        decelerate: identity,
        accelerate: identity,
        bounce: identity,
      },
    },
    Easing,
    Skeleton: SkeletonBase,
    Avatar,
    colors: {
      bg: '#0f0f0f',
      bgElevated: '#1a1a1a',
      bgSurface: '#1e1e1e',
      bgInput: '#262626',
      primary: '#3b82f6',
      primaryLight: '#60a5fa',
      primaryBg: 'rgba(59,130,246,0.12)',
      bubbleOwn: '#1d4ed8',
      bubbleOther: '#1e1e1e',
      textPrimary: '#f0f0f0',
      textSecondary: '#a0a0a0',
      textMuted: '#6b6b6b',
      borderLight: 'rgba(255,255,255,0.06)',
      online: '#22c55e',
      white: '#ffffff',
    },
    radius: { sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
    fontSize: { xs: 11, sm: 13, base: 15, lg: 17, xl: 20 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    typography: {},
    AVATAR_SIZES: { sm: 28, md: 40, lg: 52 },
  }
})

// ─── @expo/vector-icons ───────────────────────────────────────────────────────
// Each icon renders as a View with testID="icon-{name}" so tests can query it.
jest.mock('@expo/vector-icons', () => {
  const React = require('react')
  const { View } = require('react-native')
  const makeIconSet = (setName: string) => {
    function IconComponent({ name, ...rest }: any) {
      return React.createElement(View, { ...rest, testID: `icon-${name}` })
    }
    IconComponent.displayName = setName
    return IconComponent
  }
  return new Proxy({}, {
    get: (_target, name: string) => {
      if (name === '__esModule') return false
      return makeIconSet(name)
    },
  })
}, { virtual: true })

// ─── expo-haptics ─────────────────────────────────────────────────────────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}))

// ─── expo-image ───────────────────────────────────────────────────────────────
jest.mock('expo-image', () => {
  const { Image } = require('react-native')
  return { Image }
})

// ─── expo-clipboard ───────────────────────────────────────────────────────────
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(() => Promise.resolve('')),
  setStringAsync: jest.fn(() => Promise.resolve()),
}))

// ─── expo-linear-gradient ─────────────────────────────────────────────────────
jest.mock('expo-linear-gradient', () => {
  const React = require('react')
  const { View } = require('react-native')
  return { LinearGradient: ({ children, ...rest }: any) => React.createElement(View, rest, children) }
})

// ─── react-native-safe-area-context ───────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native')
  return {
    SafeAreaView: View,
    SafeAreaProvider: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  }
})

// ─── @react-native-community/netinfo ─────────────────────────────────────────
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => () => {}),
  useNetInfo: () => ({ isConnected: true }),
}))

// ─── socket.io-client ─────────────────────────────────────────────────────────
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn().mockReturnThis(),
    off: jest.fn().mockReturnThis(),
    emit: jest.fn().mockReturnThis(),
    disconnect: jest.fn(),
    connected: false,
  }
  return { io: jest.fn(() => mockSocket) }
})

// ─── expo-notifications ───────────────────────────────────────────────────────
jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test]' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  AndroidImportance: { MAX: 5 },
  setNotificationChannelAsync: jest.fn(),
}))

// ─── expo-splash-screen ───────────────────────────────────────────────────────
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}))

// Silence Alert
jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue({ alert: jest.fn() })
