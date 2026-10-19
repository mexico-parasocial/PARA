#!/usr/bin/env node
/**
 * Build a self-hosted browser bundle of matrix-js-sdk for the PARA chat WebView.
 *
 * This removes the supply-chain risk of loading the SDK from a remote CDN and
 * pins the exact version in package.json / pnpm-lock.yaml.
 *
 * Run: pnpm build:chat-bundle
 *
 * The output is committed to assets/chat/ so the app works offline and the
 * bundle is reproducible. To update the SDK version:
 *   1. Bump matrix-js-sdk in package.json
 *   2. pnpm install
 *   3. pnpm build:chat-bundle
 *   4. Commit the regenerated assets/chat/matrix-js-sdk.bundle.js
 */

const fs = require('node:fs')
const path = require('node:path')

const esbuild = require('esbuild')

const OUT_DIR = path.join(__dirname, '..', 'assets', 'chat')
const OUT_FILE = path.join(OUT_DIR, 'matrix-js-sdk.bundle.txt')

async function main() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, {recursive: true})
  }

  const result = await esbuild.build({
    stdin: {
      contents: `export * from 'matrix-js-sdk';
        import {Attachment, EncryptedAttachment, initAsync} from '@matrix-org/matrix-sdk-crypto-wasm';
        import {decodeRecoveryKey} from 'matrix-js-sdk/lib/crypto-api/recovery-key.js';
        import {createPendingRecoveryStore} from './src/features/encryptedChat/webPendingRecovery.ts';
        window.paraMatrixCrypto = {Attachment, EncryptedAttachment, decodeRecoveryKey, initAsync, createPendingRecoveryStore};`,
      resolveDir: path.join(__dirname, '..'),
      loader: 'js',
    },
    bundle: true,
    format: 'iife',
    globalName: 'matrixcs',
    outfile: OUT_FILE,
    sourcemap: false,
    minify: true,
    target: ['chrome90', 'ios16.4'],
    define: {
      global: 'window',
    },
    metafile: true,
    plugins: [
      {
        name: 'self-hosted-matrix-crypto',
        setup(build) {
          const cryptoDir = path.dirname(
            require.resolve('@matrix-org/matrix-sdk-crypto-wasm'),
          )
          build.onResolve(
            {filter: /^@matrix-org\/matrix-sdk-crypto-wasm$/},
            () => ({
              path: path.join(cryptoDir, 'index.mjs'),
            }),
          )
          build.onLoad(
            {filter: /matrix-sdk-crypto-wasm\/index\.mjs$/},
            args => ({
              contents: fs
                .readFileSync(args.path, 'utf8')
                .replace(
                  'new URL("./pkg/matrix_sdk_crypto_wasm_bg.wasm", import.meta.url)',
                  'new URL("/assets/chat/matrix-sdk-crypto.wasm", document.baseURI)',
                ),
              loader: 'js',
            }),
          )
          fs.copyFileSync(
            path.join(cryptoDir, 'pkg/matrix_sdk_crypto_wasm_bg.wasm'),
            path.join(OUT_DIR, 'matrix-sdk-crypto.wasm'),
          )
        },
      },
    ],
  })

  const size = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2)
  console.log(`✅ Built ${OUT_FILE} (${size} MB)`)
  console.log(
    `   Bundle includes ${Object.keys(result.metafile.inputs).length} inputs`,
  )
}

main().catch(err => {
  console.error('❌ Failed to build chat bundle:', err)
  process.exit(1)
})
