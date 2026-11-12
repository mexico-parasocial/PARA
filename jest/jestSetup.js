/* global jest */
import 'react-native-gesture-handler/jestSetup'

import {configure} from '@testing-library/react-native'

configure({asyncUtilTimeout: 20000})

/*
 * Expo SDK 58's runtime replaces `globalThis.fetch` with `expo/fetch` when it
 * loads, and that needs a native module Jest does not have. It also overwrites
 * any fetch a suite installed before requiring app code. Keep React Native's
 * fetch in tests; the app itself still uses expo/fetch.
 */
process.env.EXPO_PUBLIC_USE_RN_FETCH = '1'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => {
  // eslint-disable-next-line import-x/no-nodejs-modules
  const {EventEmitter} = require('events')
  return {
    __esModule: true,
    default: EventEmitter,
  }
})

jest.mock('react-native-safe-area-context', () => {
  const inset = {top: 0, right: 0, bottom: 0, left: 0}
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({children}) => children),
    SafeAreaConsumer: jest.fn().mockImplementation(
      /** @param {{children: (i: typeof inset) => unknown}} props */
      ({children}) => children(inset),
    ),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  }
})

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({exists: true, size: 100}),
  deleteAsync: jest.fn(),
  moveAsync: jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(),
}))

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn().mockResolvedValue({
    uri: 'file://resized-image',
  }),
  SaveFormat: {
    JPEG: 'jpeg',
    WEBP: 'webp',
  },
}))

jest.mock('expo-camera', () => ({
  Camera: {
    useCameraPermissions: jest.fn(() => [true]),
  },
}))

jest.mock('expo-media-library', () => ({
  __esModule: true, // this property makes it work
  default: jest.fn(),
  usePermissions: jest.fn(() => [true]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({granted: true}),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('expo-media-library/legacy', () => ({
  __esModule: true,
  default: jest.fn(),
  usePermissions: jest.fn(() => [true]),
  requestPermissionsAsync: jest.fn().mockResolvedValue({granted: true}),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@bsky.app/expo-guess-language', () => ({
  guessLanguageSync: jest
    .fn()
    .mockReturnValue([{language: 'en', confidence: 1}]),
  guessLanguageAsync: jest
    .fn()
    .mockResolvedValue([{language: 'en', confidence: 1}]),
}))

jest.mock('sentry-expo', () => ({
  init: () => jest.fn(),
  Native: {
    ReactNativeTracing: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    ReactNavigationInstrumentation: jest.fn(),
  },
}))

jest.mock('crypto', () => ({}))

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '1',
}))

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
  requireNativeModule: jest.fn().mockImplementation(
    /** @param {string} moduleName */
    moduleName => {
      if (moduleName === 'ExpoPlatformInfo') {
        return {
          getIsReducedMotionEnabled: () => false,
        }
      }
      if (moduleName === 'BottomSheet') {
        return {
          dismissAll: () => {},
        }
      }

      const expoModules = /** @type {Record<string, unknown> | undefined} */ (
        globalThis.expo?.modules
      )
      return expoModules?.[moduleName]
    },
  ),
  requireNativeViewManager: jest.fn().mockImplementation(_ => {
    return () => null
  }),
  createPermissionHook: () => () => [true],
}))

jest.mock('expo-localization', () => ({
  getLocales: () => [],
}))

/*
 * sonner-native ships only ES modules and builds its animations from
 * Reanimated's Easing as it loads, which breaks any suite that stubs
 * Reanimated. Toasts are reached through the session import chain, so stub the
 * library here; a suite that checks toasts mocks `#/components/Toast` itself.
 */
jest.mock('sonner-native', () => {
  const toast = Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    custom: jest.fn(),
    promise: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    wiggle: jest.fn(),
  })
  return {toast, Toaster: () => null}
})
