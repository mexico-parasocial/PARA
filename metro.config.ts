// Learn more https://docs.expo.io/guides/customizing-metro
import {type CustomResolver} from '@expo/metro/metro-resolver'
import {getDefaultConfig} from '@expo/metro-config'
import {getSentryExpoConfig} from '@sentry/react-native/metro.js'

const config = getSentryExpoConfig(import.meta.dirname, {
  // TODO: confirm this doesn't break anything when we switch to metro web
  includeWebReplay: false,
  includeWebFeedback: false,
  annotateReactComponents: {
    textComponentNames: ['Text', 'ButtonText'],
  },
  getDefaultConfig: (projectRoot, options) => {
    const config = getDefaultConfig(projectRoot, options)

    if (typeof process.env.RN_SRC_EXT === 'string') {
      // inject `.e2e.ts` and `.e2e.tsx` into the sourceExts when running tests)
      config.resolver.sourceExts.unshift(...process.env.RN_SRC_EXT.split(','))
    }

    config.resolver.assetExts = [...config.resolver.assetExts, 'woff2']

    // Watchman is blocked from this Desktop workspace on some macOS setups.
    // Fall back to Metro's Node crawler so `expo start` stays usable.
    // @ts-expect-error readonly property
    config.resolver.useWatchman = false

    if (config.resolver.resolveRequest) {
      throw Error('Update this override because it is conflicting now.')
    }

    if (process.env.BSKY_PROFILE) {
      // @ts-expect-error readonly property
      config.cacheVersion += ':PROFILE'
    }

    const resolver: CustomResolver = (context, moduleName, platform) => {
      /*
       * PARA: upstream throws when react-native-gesture-handler is imported
       * on web, but PARA's Map feature (src/screens/Map) imports it there on
       * purpose alongside @teovilla/react-native-web-maps, so the guard is
       * intentionally absent here.
       */

      /*
       * react-native-webview has no web implementation (its fallback renders
       * "does not support this platform"), so swap in react-native-web-webview
       * to keep external media embeds working. Mirrors the old webpack alias.
       */
      if (platform === 'web' && moduleName === 'react-native-webview') {
        return context.resolveRequest(
          context,
          'react-native-web-webview',
          platform,
        )
      }
      // PARA: react-native-maps has no web implementation; render maps with
      // @teovilla/react-native-web-maps instead (MapLibre-based).
      if (platform === 'web' && moduleName === 'react-native-maps') {
        return context.resolveRequest(
          context,
          '@teovilla/react-native-web-maps',
          platform,
        )
      }
      // PARA: React DevTools setup is native-only and pulls in
      // platform-specific files (ReactDevToolsSettingsManager.android.js /
      // .ios.js) that don't exist on web.
      if (
        platform === 'web' &&
        moduleName === 'react-native/Libraries/Core/setUpReactDevTools.js'
      ) {
        return {type: 'empty'}
      }
      if (
        process.env.BSKY_PROFILE &&
        moduleName.endsWith('ReactNativeRenderer-prod')
      ) {
        return context.resolveRequest(
          context,
          moduleName.replace('-prod', '-profiling'),
          platform,
        )
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
        },
      })

    return config as unknown as Record<string, unknown>
  },
})

export default config
