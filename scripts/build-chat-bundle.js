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
    fs.mkdirSync(OUT_DIR, { recursive: true })
  }

  const result = await esbuild.build({
    entryPoints: [require.resolve('matrix-js-sdk')],
    bundle: true,
    format: 'iife',
    globalName: 'matrixcs',
    outfile: OUT_FILE,
    sourcemap: false,
    minify: true,
    target: ['chrome90', 'ios14'],
    define: {
      global: 'window',
    },
    metafile: true,
  })

  const size = (fs.statSync(OUT_FILE).size / 1024 / 1024).toFixed(2)
  console.log(`✅ Built ${OUT_FILE} (${size} MB)`)
  console.log(`   Bundle includes ${Object.keys(result.metafile.inputs).length} inputs`)
}

main().catch((err) => {
  console.error('❌ Failed to build chat bundle:', err)
  process.exit(1)
})
