// Learn more https://docs.expo.io/guides/customizing-metro
import {type CustomResolver} from '@expo/metro/metro-resolver'
import {getDefaultConfig} from '@expo/metro-config'
import {getSentryExpoConfig} from '@sentry/react-native/metro.js'

const config = getSentryExpoConfig(import.meta.dirname, {
  // TODO: confirm this doesn't break anything when we switch to metro web
  includeWebReplay: false,
  annotateReactComponents: {
    textComponentNames: ['Text', 'ButtonText'],
  },
  getDefaultConfig: (projectRoot, options) => {
    const config = getDefaultConfig(projectRoot, options)

    if (typeof process.env.RN_SRC_EXT === 'string') {
      // inject `.e2e.ts` and `.e2e.tsx` into the sourceExts when running tests
      config.resolver.sourceExts.unshift(...process.env.RN_SRC_EXT.split(','))
    }

    if (config.resolver.resolveRequest) {
      throw Error('Update this override because it is conflicting now.')
    }

    if (process.env.BSKY_PROFILE) {
      // @ts-expect-error readonly property
      config.cacheVersion += ':PROFILE'
    }

    config.resolver.assetExts = [...config.resolver.assetExts, 'woff2']
    // Watchman is blocked from this Desktop workspace on some macOS setups.
    // Fall back to Metro's Node crawler so `expo start` stays usable.
    // @ts-expect-error readonly property
    config.resolver.useWatchman = false

    const resolver: CustomResolver = (context, moduleName, platform) => {
      if (process.env.BSKY_PROFILE) {
        if (moduleName.endsWith('ReactNativeRenderer-prod')) {
          return context.resolveRequest(
            context,
            moduleName.replace('-prod', '-profiling'),
            platform,
          )
        }
      }
      if (platform === 'web' && moduleName === 'react-native-maps') {
        return context.resolveRequest(
          context,
          '@teovilla/react-native-web-maps',
          platform,
        )
      }
      // React DevTools setup is native-only and pulls in platform-specific files
      // (ReactDevToolsSettingsManager.android.js / .ios.js) that don't exist on web.
      if (
        platform === 'web' &&
        moduleName === 'react-native/Libraries/Core/setUpReactDevTools.js'
      ) {
        return {type: 'empty'}
      }
      return context.resolveRequest(context, moduleName, platform)
    }

    // @ts-expect-error readonly property
    config.resolver.resolveRequest = resolver

    config.transformer.getTransformOptions = () =>
      Promise.resolve({
        transform: {
          experimentalImportSupport: true,
          inlineRequires: true as false, // ??? typescript why?
          nonInlinedRequires: [],
        },
      })

    return config as unknown as Record<string, unknown>
  },
})

export default config
