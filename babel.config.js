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
            '#': './src',
          },
        },
      ],
      // cannot use the `env` field because it would place these after
      // the `react-native-worklets/plugin` plugin
      ...(api.env('test')
        ? [
            '@babel/plugin-transform-class-static-block',
            // Compile `import()` to require so jest (which runs without
            // `--experimental-vm-modules`) can execute lazily-loaded modules
            // like `@ipld/dag-cbor` via its moduleNameMapper.
            '@babel/plugin-transform-dynamic-import',
          ]
        : []),
      ...(api.env('production') ? ['transform-remove-console'] : []),

      'react-native-worklets/plugin', // NOTE: this plugin MUST be last
    ],
  }
}
