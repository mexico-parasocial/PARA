// Learn more https://docs.expo.io/guides/customizing-metro
const {getSentryExpoConfig} = require('@sentry/react-native/metro')
const cfg = getSentryExpoConfig(__dirname)

cfg.resolver.sourceExts = process.env.RN_SRC_EXT
  ? process.env.RN_SRC_EXT.split(',').concat(cfg.resolver.sourceExts)
  : cfg.resolver.sourceExts

if (cfg.resolver.resolveRequest) {
  throw Error('Update this override because it is conflicting now.')
}

if (process.env.BSKY_PROFILE) {
  cfg.cacheVersion += ':PROFILE'
}

cfg.resolver.assetExts = [...cfg.resolver.assetExts, 'woff2']
// Watchman is blocked from this Desktop workspace on some macOS setups.
// Fall back to Metro's Node crawler so `expo start` stays usable.
cfg.resolver.useWatchman = false

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
