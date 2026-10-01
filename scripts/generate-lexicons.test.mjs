import assert from 'node:assert/strict'
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {dirname, join} from 'node:path'
import {test} from 'node:test'

import {publishLexicons} from './generate-lexicons.mjs'

/** @param {import('node:test').TestContext} t */
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'para-lexicons-test-'))
  t.after(() => rm(root, {recursive: true, force: true}))
  return {staging: join(root, 'staging'), output: join(root, 'output')}
}

/**
 * @param {string} root
 * @param {string} relative
 * @param {string} content
 */
async function file(root, relative, content) {
  const target = join(root, relative)
  await mkdir(dirname(target), {recursive: true})
  await writeFile(target, content)
}

await test('preserves watched directories and unchanged files during regeneration', async t => {
  const {staging, output} = await fixture(t)
  const name = 'com/germnetwork/declaration.defs.ts'
  await file(staging, name, 'export const main = {}\n')
  await file(output, name, 'export const main = {}\n')
  const beforeFile = await stat(join(output, name))
  const beforeDirectory = await stat(join(output, 'com/germnetwork'))

  await publishLexicons(staging, output)

  const afterFile = await stat(join(output, name))
  assert.equal(afterFile.ino, beforeFile.ino)
  assert.equal(afterFile.mtimeMs, beforeFile.mtimeMs)
  assert.equal(
    (await stat(join(output, 'com/germnetwork'))).ino,
    beforeDirectory.ino,
  )
})

await test('publishes updated schemas and new namespace exports', async t => {
  const {staging, output} = await fixture(t)
  await file(output, 'com.ts', 'export const old = true\n')
  await file(staging, 'com.ts', "export * from './com/example.defs'\n")
  await file(staging, 'com/example.defs.ts', 'export const main = {}\n')

  await publishLexicons(staging, output)

  assert.equal(
    await readFile(join(output, 'com.ts'), 'utf8'),
    "export * from './com/example.defs'\n",
  )
  assert.equal(
    await readFile(join(output, 'com/example.defs.ts'), 'utf8'),
    'export const main = {}\n',
  )
})

await test('removes obsolete schemas without deleting their watched directories', async t => {
  const {staging, output} = await fixture(t)
  await file(staging, 'index.ts', 'export {}\n')
  await file(output, 'old/removed.defs.ts', 'export const main = {}\n')
  const before = await stat(join(output, 'old'))

  await publishLexicons(staging, output)

  await assert.rejects(stat(join(output, 'old/removed.defs.ts')), {code: 'ENOENT'})
  assert.equal((await stat(join(output, 'old'))).ino, before.ino)
})
