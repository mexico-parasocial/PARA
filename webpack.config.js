const path = require('path')
const webpack = require('webpack')
const createExpoWebpackConfigAsync = require('@expo/webpack-config')
const {withAlias} = require('@expo/webpack-config/addons')
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer')
const {sentryWebpackPlugin} = require('@sentry/webpack-plugin')
const {version} = require('./package.json')

const GENERATE_STATS = process.env.EXPO_PUBLIC_GENERATE_STATS === '1'
const OPEN_ANALYZER = process.env.EXPO_PUBLIC_OPEN_ANALYZER === '1'

const reactNativeWebWebviewConfiguration = {
  test: /postMock.html$/,
  use: {
    loader: 'file-loader',
    options: {
      name: '[name].[ext]',
    },
  },
}

// Walk a rule tree and wrap source-map-loader's filterSourceMappingUrl to
// drop sourcemap references matching the given path pattern. Mutates in place.
function patchSourceMapFilter(rules, pathPattern) {
  if (!rules) return
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue
    if (rule.oneOf) patchSourceMapFilter(rule.oneOf, pathPattern)
    if (rule.rules) patchSourceMapFilter(rule.rules, pathPattern)
    const uses = Array.isArray(rule.use) ? rule.use : rule.use ? [rule.use] : []
    for (const use of uses) {
      if (!use?.loader?.includes('source-map-loader')) continue
      const prev = use.options?.filterSourceMappingUrl
      use.options = {
        ...use.options,
        filterSourceMappingUrl(url, resourcePath) {
          if (pathPattern.test(resourcePath)) return 'remove'
          return prev ? prev(url, resourcePath) : true
        },
      }
    }
  }
}


module.exports = async function (env, argv) {
  env.babel = {
    ...env.babel,
    dangerouslyAddModulePathsToTranspile: [
      ...(env.babel?.dangerouslyAddModulePathsToTranspile || []),
      '@bsky.app/expo',
      '@bsky.app/expo-scroll-edge-effect',
    ],
  }
  let config = await createExpoWebpackConfigAsync(env, argv)
  config = withAlias(config, {
    'react-native$': 'react-native-web',
    'react-native-webview': 'react-native-web-webview',
    'react-native-maps': '@teovilla/react-native-web-maps',
    'react-native-uitextview': path.resolve(
      __dirname,
      'src/platform/react-native-uitextview-mock.web.tsx',
    ),
    'react-native-gesture-handler': false, // RNGH should not be used on web, so let's cause a build error if it sneaks in
    '@sentry-internal/replay': false, // not used, ~300kb of dead weight
  })
  // react-native-uuid ships sourceMappingURL comments but no .map files.
  patchSourceMapFilter(config.module.rules, /react-native-uuid/)

  // Fix source-map-loader looking for hoisted tslib in non-existent nested paths.
  // pnpm1 hoists tslib to root node_modules, but @atproto source maps reference
  // nested paths that don't exist. Exclude all node_modules from source-map-loader.
  const sourceMapLoaderRule = config.module.rules?.find(
    rule =>
      rule.use &&
      Array.isArray(rule.use) &&
      rule.use.some(u => u.loader && u.loader.includes('source-map-loader')),
  )
  if (sourceMapLoaderRule) {
    sourceMapLoaderRule.exclude = /node_modules/
  }

  config.module.rules = [
    ...(config.module.rules || []),
    // Fix abort-controller/polyfill.mjs: strict ESM resolution requires
    // file extensions on relative imports, but the package omits `.mjs`.
    {
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    },
    reactNativeWebWebviewConfiguration,
  ]
  const mode = env?.mode || 'development'
  if (mode === 'development') {
    config.plugins.push(new ReactRefreshWebpackPlugin())
  } else {
    // Support static CDN for chunks
    config.output.publicPath = 'auto'
  }

  if (GENERATE_STATS || OPEN_ANALYZER) {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        openAnalyzer: OPEN_ANALYZER,
        generateStatsFile: true,
        statsFilename: '../stats.json',
        analyzerMode: OPEN_ANALYZER ? 'server' : 'json',
        defaultSizes: 'parsed',
      }),
    )
  }
  if (process.env.SENTRY_AUTH_TOKEN) {
    config.plugins.push(
      sentryWebpackPlugin({
        org: 'blueskyweb',
        project: 'app',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: {
          // fallback needed for Render.com deployments
          name: process.env.SENTRY_RELEASE || version,
          dist: process.env.SENTRY_DIST,
        },
      }),
    )
  }

  // Suppress expo-contacts warning: ContactAccessButtonProps is a type-only
  // re-export that doesn't exist at runtime on web.
  config.plugins.push(
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/ContactAccessButton$/,
      contextRegExp: /expo-contacts/,
    }),
  )

  return config
}
