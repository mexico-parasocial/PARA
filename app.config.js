const path = require('path')
const pkg = require('./package.json')
try {
  require('dotenv').config()
} catch (e) {
  // Ignore missing dotenv in environments where vars are already set (like EAS)
}

const splashManifest = require('./assets/splash/manifest.json')

module.exports = function (_config) {
  /**
   * App version number. Should be incremented as part of a release cycle.
   */
  const VERSION = pkg.version

  /**
   * Uses built-in Expo env vars
   *
   * @see https://docs.expo.dev/build-reference/variables/#built-in-environment-variables
   */
  const getPlatform = () => {
    if (process.env.EAS_BUILD_PLATFORM) return process.env.EAS_BUILD_PLATFORM
    if (process.env.EXPO_OS) return process.env.EXPO_OS

    const argv = process.argv || []
    if (argv.some(arg => arg.includes('ios'))) return 'ios'
    if (argv.some(arg => arg.includes('android'))) return 'android'

    const lifecycle = process.env.npm_lifecycle_event || ''
    if (lifecycle.includes('ios')) return 'ios'
    if (lifecycle.includes('android')) return 'android'

    // If we're on a Mac and running prebuild, default to ios
    if (process.platform === 'darwin' && argv.includes('prebuild')) return 'ios'

    return 'web'
  }

  const PLATFORM = getPlatform()
  const DEFAULT_GOOGLE_MAPS_API_KEY = 'AIzaSyDAhKIy2uwTpIKfXqhyPUjyXrRMNgpsueE'
  const GOOGLE_MAPS_IOS_API_KEY =
    process.env.GOOGLE_MAPS_IOS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    DEFAULT_GOOGLE_MAPS_API_KEY
  const GOOGLE_MAPS_ANDROID_API_KEY =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    DEFAULT_GOOGLE_MAPS_API_KEY

  const IS_TESTFLIGHT = process.env.EXPO_PUBLIC_ENV === 'testflight'
  const IS_PRODUCTION = process.env.EXPO_PUBLIC_ENV === 'production'

  // MVP hardening: fail fast if placeholder key leaks into production builds.
  if (IS_PRODUCTION) {
    if (
      GOOGLE_MAPS_IOS_API_KEY === DEFAULT_GOOGLE_MAPS_API_KEY ||
      GOOGLE_MAPS_ANDROID_API_KEY === DEFAULT_GOOGLE_MAPS_API_KEY
    ) {
      throw new Error(
        'Production build requires a real GOOGLE_MAPS_API_KEY. Set GOOGLE_MAPS_IOS_API_KEY and GOOGLE_MAPS_ANDROID_API_KEY env vars.',
      )
    }
  }
  // FIXED: was `!IS_TESTFLIGHT || !IS_PRODUCTION` which always evaluated to true.
  const IS_DEV = !IS_TESTFLIGHT && !IS_PRODUCTION

  const ASSOCIATED_DOMAINS = [
    'applinks:para.social',
    'appclips:para.social', // Allows App Clip to work when scanning QR codes
    // When testing local services, enter an ngrok (et al) domain here. It must use a standard HTTP/HTTPS port.
    ...(IS_DEV || IS_TESTFLIGHT ? [] : []),
  ]

  // OTA updates disabled — self-hosted server is post-launch P0
  const UPDATES_ENABLED = false

  const USE_SENTRY = Boolean(process.env.SENTRY_AUTH_TOKEN)

  return {
    expo: {
      version: VERSION,
      name: 'PARA',
      slug: 'para',
      scheme: 'para',
      owner: 'pararepo',
      runtimeVersion: {
        policy: 'appVersion',
      },
      icon: './assets/app-icons/ios_icon_default_next.png',
      userInterfaceStyle: 'automatic',
      primaryColor: '#006AFF',
      newArchEnabled: false,
      ios: {
        supportsTablet: false,
        bundleIdentifier: 'com.para.app',
        config: {
          usesNonExemptEncryption: false,
          googleMapsApiKey: GOOGLE_MAPS_IOS_API_KEY,
        },
        icon:
          PLATFORM === 'web' // web build doesn't like .icon files
            ? './assets/app-icons/ios_icon_default_next.png'
            : './assets/app-icons/ios_icon_default.icon',
        infoPlist: {
          CADisableMinimumFrameDurationOnPhone: true,
          UIBackgroundModes: ['remote-notification'],
          NSCameraUsageDescription:
            'Used for profile pictures, posts, and other kinds of content.',
          NSMicrophoneUsageDescription:
            'Used for posts and other kinds of content.',
          NSPhotoLibraryAddUsageDescription:
            'Used to save images to your library.',
          NSPhotoLibraryUsageDescription:
            'Used for profile pictures, posts, and other kinds of content',
          NSLocationWhenInUseUsageDescription:
            'Used to show your location on the map and find local communities.',
          NSLocalNetworkUsageDescription:
            'Used to connect to local development services while testing PARA.',
          NSAppTransportSecurity: {
            NSAllowsArbitraryLoads: false,
            NSAllowsLocalNetworking: true,
          },
          CFBundleSpokenName: 'PARA',
          NSUserActivityTypes: ['INSendMessageIntent'],
          CFBundleLocalizations: [
            'en',
            'an',
            'ast',
            'ca',
            'cy',
            'da',
            'de',
            'el',
            'eo',
            'es',
            'eu',
            'fi',
            'fr',
            'fy',
            'ga',
            'gd',
            'gl',
            'hi',
            'hu',
            'ia',
            'id',
            'it',
            'ja',
            'km',
            'ko',
            'ne',
            'nl',
            'pl',
            'pt-BR',
            'pt-PT',
            'ro',
            'ru',
            'sv',
            'th',
            'tr',
            'uk',
            'vi',
            'yue',
            'zh-Hans',
            'zh-Hant',
          ],
        },
        associatedDomains: ASSOCIATED_DOMAINS,
        entitlements: {
          'com.apple.developer.kernel.increased-memory-limit': true,
          'com.apple.developer.kernel.extended-virtual-addressing': true,
          'com.apple.security.application-groups': 'group.com.para.app',
          'com.apple.developer.usernotifications.communication': true,
          //          'com.apple.developer.device-information.user-assigned-device-name': true,
        },
        privacyManifests: {
          NSPrivacyCollectedDataTypes: [
            {
              NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypePerformanceData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
            {
              NSPrivacyCollectedDataType:
                'NSPrivacyCollectedDataTypeOtherDiagnosticData',
              NSPrivacyCollectedDataTypeLinked: false,
              NSPrivacyCollectedDataTypeTracking: false,
              NSPrivacyCollectedDataTypePurposes: [
                'NSPrivacyCollectedDataTypePurposeAppFunctionality',
              ],
            },
          ],
          NSPrivacyAccessedAPITypes: [
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryFileTimestamp',
              NSPrivacyAccessedAPITypeReasons: ['C617.1', '3B52.1', '0A2A.1'],
            },
            {
              NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
              NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategorySystemBootTime',
              NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
            },
            {
              NSPrivacyAccessedAPIType:
                'NSPrivacyAccessedAPICategoryUserDefaults',
              NSPrivacyAccessedAPITypeReasons: ['CA92.1', '1C8F.1'],
            },
          ],
        },
      },
      androidStatusBar: {
        barStyle: 'light-content',
      },
      // Dark nav bar in light mode is better than light nav bar in dark mode
      androidNavigationBar: {
        barStyle: 'light-content',
      },
      android: {
        icon: './assets/app-icons/android_icon_default_next.png',
        adaptiveIcon: {
          foregroundImage: './assets/icon-android-foreground.png',
          monochromeImage: './assets/icon-android-monochrome.png',
          backgroundColor: '#006AFF',
        },
        googleServicesFile: './google-services.json',
        package: 'com.para.app',
        metaData: {
          'com.google.android.geo.API_KEY': GOOGLE_MAPS_ANDROID_API_KEY,
        },
        config: {
          googleMaps: {
            apiKey: GOOGLE_MAPS_ANDROID_API_KEY,
          },
        },
        intentFilters: [
          {
            action: 'VIEW',
            autoVerify: true,
            data: [
              {
                scheme: 'https',
                host: 'bsky.app',
              },
              IS_DEV && {
                scheme: 'http',
                host: 'localhost:19006',
              },
            ],
            category: ['BROWSABLE', 'DEFAULT'],
          },
        ],
      },
      web: {
        favicon: './assets/favicon.png',
      },
      updates: {
        // Disabled for PARA — self-hosted OTA server is post-launch P0
        // Original: https://updates.bsky.app/manifest
        enabled: false,
        url: '',
        checkAutomatically: 'NEVER',
      },
      plugins: [
        'expo-secure-store',
        'expo-video',
        'expo-localization',
        'expo-web-browser',
        [
          'react-native-edge-to-edge',
          {android: {enforceNavigationBarContrast: false}},
        ],
        USE_SENTRY && [
          '@sentry/react-native/expo',
          {
            // Disabled for PARA — set up own Sentry org post-launch
            enabled: false,
            organization: 'pararepo',
            project: 'para-app',
            url: 'https://sentry.io',
          },
        ],
        [
          'expo-build-properties',
          {
            ios: {
              deploymentTarget: '15.1',
              buildReactNativeFromSource: true,
              cxxLanguageStandard: 'c++23',
            },
            android: {
              compileSdkVersion: 36,
              targetSdkVersion: 35,
              buildToolsVersion: '35.0.0',
              buildReactNativeFromSource: IS_PRODUCTION,
            },
          },
        ],
        [
          'expo-notifications',
          {
            icon: './assets/icon-android-notification.png',
            color: '#1185fe',
            sounds:
              PLATFORM === 'ios'
                ? [path.resolve(__dirname, './assets/dm.aiff')]
                : [path.resolve(__dirname, './assets/dm.mp3')],
          },
        ],
        'react-native-compressor',
        [
          '@bitdrift/react-native',
          {
            networkInstrumentation: true,
          },
        ],
        // Disabled: Personal dev teams don't support App Clips
        // './plugins/starterPackAppClipExtension/withStarterPackAppClip.js',
        './plugins/withGradleJVMHeapSizeIncrease.js',
        './plugins/withAndroidManifestLargeHeapPlugin.js',
        './plugins/withAndroidManifestFCMIconPlugin.js',
        './plugins/withAndroidManifestIntentQueriesPlugin.js',
        './plugins/withAndroidStylesAccentColorPlugin.js',
        './plugins/withAndroidNoJitpackPlugin.js',
        './plugins/shareExtension/withShareExtensions.js',
        './plugins/notificationsExtension/withNotificationsExtension.js',
        [
          'expo-font',
          {
            fonts: [
              './assets/fonts/inter/InterVariable.woff2',
              './assets/fonts/inter/InterVariable-Italic.woff2',
              './assets/fonts/Cinzel/Cinzel-VariableFont_wght.ttf',
              './assets/fonts/Cinzel/static/Cinzel-SemiBold.ttf',
              // Android only
              './assets/fonts/inter/Inter-Regular.otf',
              './assets/fonts/inter/Inter-Italic.otf',
              './assets/fonts/inter/Inter-Medium.otf',
              './assets/fonts/inter/Inter-MediumItalic.otf',
              './assets/fonts/inter/Inter-SemiBold.otf',
              './assets/fonts/inter/Inter-SemiBoldItalic.otf',
              './assets/fonts/inter/Inter-Bold.otf',
              './assets/fonts/inter/Inter-BoldItalic.otf',
            ],
          },
        ],
        [
          'expo-splash-screen',
          {
            ios: {
              enableFullScreenImage_legacy:
                splashManifest.native.ios.enableFullScreenImageLegacy, // iOS only
              backgroundColor: splashManifest.colors.light,
              image: splashManifest.native.ios.lightImage,
              resizeMode: splashManifest.native.ios.resizeMode,
              dark: {
                enableFullScreenImage_legacy:
                  splashManifest.native.ios.enableFullScreenImageLegacy, // iOS only
                backgroundColor: splashManifest.colors.dark,
                image: splashManifest.native.ios.darkImage,
                resizeMode: splashManifest.native.ios.resizeMode,
              },
            },
            android: {
              backgroundColor: splashManifest.colors.light,
              image: splashManifest.native.android.lightImage,
              imageWidth: splashManifest.native.android.imageWidth, // even division of 306px
              dark: {
                backgroundColor: splashManifest.colors.dark,
                image: splashManifest.native.android.darkImage,
                imageWidth: splashManifest.native.android.imageWidth,
              },
            },
          },
        ],
        [
          '@bsky.app/expo-dynamic-app-icon',
          {
            /**
             * Default set
             */
            default_light: {
              ios: './assets/app-icons/ios_icon_legacy_light.png',
              android: './assets/app-icons/android_icon_legacy_light.png',
              prerendered: true,
            },
            default_dark: {
              ios: './assets/app-icons/ios_icon_legacy_dark.png',
              android: './assets/app-icons/android_icon_legacy_dark.png',
              prerendered: true,
            },

            /**
             * PARA+ core set
             */
            core_aurora: {
              ios: './assets/app-icons/ios_icon_core_aurora.png',
              android: './assets/app-icons/android_icon_core_aurora.png',
              prerendered: true,
            },
            core_bonfire: {
              ios: './assets/app-icons/ios_icon_core_bonfire.png',
              android: './assets/app-icons/android_icon_core_bonfire.png',
              prerendered: true,
            },
            core_sunrise: {
              ios: './assets/app-icons/ios_icon_core_sunrise.png',
              android: './assets/app-icons/android_icon_core_sunrise.png',
              prerendered: true,
            },
            core_sunset: {
              ios: './assets/app-icons/ios_icon_core_sunset.png',
              android: './assets/app-icons/android_icon_core_sunset.png',
              prerendered: true,
            },
            core_midnight: {
              ios: './assets/app-icons/ios_icon_core_midnight.png',
              android: './assets/app-icons/android_icon_core_midnight.png',
              prerendered: true,
            },
            core_flat_blue: {
              ios: './assets/app-icons/ios_icon_core_flat_blue.png',
              android: './assets/app-icons/android_icon_core_flat_blue.png',
              prerendered: true,
            },
            core_flat_white: {
              ios: './assets/app-icons/ios_icon_core_flat_white.png',
              android: './assets/app-icons/android_icon_core_flat_white.png',
              prerendered: true,
            },
            core_flat_black: {
              ios: './assets/app-icons/ios_icon_core_flat_black.png',
              android: './assets/app-icons/android_icon_core_flat_black.png',
              prerendered: true,
            },
            core_classic: {
              ios: './assets/app-icons/ios_icon_core_classic.png',
              android: './assets/app-icons/android_icon_core_classic.png',
              prerendered: true,
            },
          },
        ],
        ['expo-screen-orientation', {initialOrientation: 'PORTRAIT_UP'}],
        ['expo-location'],
      ].filter(Boolean),
      extra: {
        eas: {
          build: {
            experimental: {
              ios: {
                appExtensions: [
                  {
                    targetName: 'Share-with-PARA',
                    bundleIdentifier: 'com.para.app.Share-with-PARA',
                    entitlements: {
                      'com.apple.security.application-groups': [
                        'group.com.para.app',
                      ],
                    },
                  },
                  {
                    targetName: 'ParaNSE',
                    bundleIdentifier: 'com.para.app.ParaNSE',
                    entitlements: {
                      'com.apple.security.application-groups': [
                        'group.com.para.app',
                      ],
                    },
                  },
                ],
              },
            },
          },
          projectId: '55bd077a-d905-4184-9c7f-94789ba0f302',
        },
      },
    },
  }
}
