module.exports = function (api) {
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          lazyImports: true,
          native: {
            // Disable ESM -> CJS compilation because Metro takes care of it.
            // However, we need it in Jest tests since those run without Metro.
            disableImportExportTransform: !api.env('test'),
          },
        },
      ],
    ],
    plugins: [
      // Required by pre-bundled node_modules that contain class static blocks
      // (e.g. @formatjs/intl-displaynames/polyfill-force.js).
      '@babel/plugin-transform-class-static-block',
      '@lingui/babel-plugin-lingui-macro',
      ['babel-plugin-react-compiler', {target: '19'}],
      [
        'module:react-native-dotenv',
        {
          envName: 'APP_ENV',
          moduleName: '@env',
          path: '.env',
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: true,
          verbose: false,
        },
      ],
      [
        'module-resolver',
        {
          alias: {
            // This needs to be mirrored in tsconfig.json
            crypto: './src/platform/crypto.ts',
            // `expo-age-range` has no Expo SDK 54 build; stand-in until Expo 56+.
            'expo-age-range': './src/lib/shims/expo-age-range.ts',
            '#': './src',
          },
        },
      ],
      'react-native-reanimated/plugin', // NOTE: this plugin MUST be last
    ],
    env: {
      production: {
        plugins: ['transform-remove-console'],
      },
      test: {
        plugins: [
          '@babel/plugin-transform-class-static-block',
          // Compile `import()` to require so jest (which runs without
          // `--experimental-vm-modules`) can execute lazily-loaded modules
          // like `@ipld/dag-cbor` via its moduleNameMapper.
          '@babel/plugin-transform-dynamic-import',
        ],
      },
    },
  }
}
