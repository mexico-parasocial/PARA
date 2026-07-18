// Learn more https://docs.expo.io/guides/customizing-metro
const {getSentryExpoConfig} = require('@sentry/react-native/metro')
const cfg = getSentryExpoConfig(__dirname)

// inject `.e2e.ts` and `.e2e.tsx` into the sourceExts when running tests
cfg.resolver.sourceExts = process.env.RN_SRC_EXT
  ? process.env.RN_SRC_EXT.split(',').concat(cfg.resolver.sourceExts)
  : cfg.resolver.sourceExts

if (process.env.BSKY_PROFILE) {
  cfg.cacheVersion += ':PROFILE'
}

cfg.resolver.assetExts = [...cfg.resolver.assetExts, 'woff2']
// Watchman is blocked from this Desktop workspace on some macOS setups.
// Fall back to Metro's Node crawler so `expo start` stays usable.
cfg.resolver.useWatchman = false

// @sentry/react-native >= 6 installs its own resolveRequest; chain it for the
// default case instead of replacing it.
const sentryResolveRequest = cfg.resolver.resolveRequest

cfg.resolver.resolveRequest = (context, moduleName, platform) => {
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
  if (sentryResolveRequest) {
    return sentryResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

cfg.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: true,
    inlineRequires: true,
    nonInlinedRequires: [],
  },
})

module.exports = cfg
