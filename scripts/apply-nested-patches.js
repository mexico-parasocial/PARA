#!/usr/bin/env node
/**
 * apply-nested-patches.js
 *
 * patch-package only scans root node_modules. Some dependencies live in
 * nested node_modules (e.g. dev-env/node_modules/@atproto/dev-env).
 * This script applies patches to those nested packages manually.
 */

const {execSync} = require('child_process')
const fs = require('fs')
const path = require('path')

const PROJECT_ROOT = path.join(__dirname, '..')
const PATCHES_DIR = path.join(PROJECT_ROOT, 'patches')

const NESTED_PACKAGES = [
  {
    patch: '@atproto+dev-env+0.4.7.patch',
    target: path.join(PROJECT_ROOT, 'dev-env', 'node_modules', '@atproto', 'dev-env'),
    strip: 0, // patch paths are relative to package root (dist/pds.js)
  },
]

function applyPatch({patch, target, strip}) {
  const patchFile = path.join(PATCHES_DIR, patch)
  if (!fs.existsSync(patchFile)) {
    console.log(`⚠️  Patch file not found: ${patch}`)
    return
  }
  if (!fs.existsSync(target)) {
    console.log(`⚠️  Target package not found: ${target}`)
    return
  }

  console.log(`🔧 Applying ${patch} → ${path.relative(PROJECT_ROOT, target)}`)
  try {
    execSync(`patch -p${strip} -d "${target}" < "${patchFile}"`, {
      stdio: 'inherit',
    })
    console.log(`✅ ${patch} applied`)
  } catch (err) {
    // patch may already be applied; ignore "already applied" errors
    const stdout = execSync(`patch -p${strip} -d "${target}" --dry-run < "${patchFile}" 2>&1 || true`, {
      encoding: 'utf-8',
    })
    if (stdout.includes('already applied') || stdout.includes('Skipping patch')) {
      console.log(`✅ ${patch} already applied (skipping)`)
    } else {
      console.error(`❌ Failed to apply ${patch}`)
      process.exit(1)
    }
  }
}

for (const pkg of NESTED_PACKAGES) {
  applyPatch(pkg)
}
