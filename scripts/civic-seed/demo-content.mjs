#!/usr/bin/env node
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {
  seedDemoContent,
  parseArgs,
} from '../../../WatZappa/packages/dev-env/assets/demo-content/seed.mjs'

export {
  seedDemoContent,
  deterministicTid,
  validateContent,
} from '../../../WatZappa/packages/dev-env/assets/demo-content/seed.mjs'

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  seedDemoContent(parseArgs(process.argv.slice(2))).catch(err => {
    console.error(err.message)
    process.exitCode = 1
  })
}
