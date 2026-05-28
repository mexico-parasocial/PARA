import assert from 'node:assert/strict'
import events from 'node:events'
import http from 'node:http'
import path from 'node:path'
import test from 'node:test'
import {fileURLToPath} from 'node:url'
import {TID} from '@atproto/common-web'

import {
  InMemorySeedWriter,
  applySeedOperations,
  buildActorInputs,
  buildSeedOperations,
  loadManifest,
  resetSeedOperations,
  resolveCliConfig,
  syncAppViewFromIntrospection,
  toResetOperations,
} from './lib.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const MANIFEST_PATH = path.resolve(__dirname, 'manifest.v1.json')
const TID_COLLECTIONS = new Set([
  'app.bsky.feed.like',
  'app.bsky.feed.post',
  'app.bsky.feed.repost',
  'app.bsky.graph.follow',
  'app.bsky.graph.verification',
  'com.para.civic.cabildeo',
  'com.para.civic.delegation',
  'com.para.civic.position',
  'com.para.civic.vote',
])

test('resolveCliConfig supports env defaults and cli override', () => {
  const env = {
    PARA_CIVIC_SEED_SERVICE: 'https://demo.example',
    PARA_CIVIC_SEED_MANIFEST: '/tmp/manifest.json',
    PARA_CIVIC_SEED_PROFILE: 'dev-env',
    PARA_CIVIC_SEED_INTROSPECT_URL: 'http://127.0.0.1:2581/',
    PARA_CIVIC_SEED_CREATE_ACCOUNTS: 'false',
  }

  const fromEnv = resolveCliConfig(['apply'], env)
  assert.equal(fromEnv.command, 'apply')
  assert.equal(fromEnv.service, 'https://demo.example')
  assert.equal(fromEnv.createAccounts, false)
  assert.equal(fromEnv.introspectUrl, 'http://127.0.0.1:2581')
  assert.equal(fromEnv.manifestPath, '/tmp/manifest.json')
  assert.match(fromEnv.credentialsPath, /profiles\/dev-env\.credentials\.json$/)

  const fromCli = resolveCliConfig(
    [
      'reset',
      '--service',
      'http://localhost:3000',
      '--profile',
      'local-dev',
      '--introspect-url',
      'http://127.0.0.1:9999/',
      '--create-accounts',
    ],
    env,
  )
  assert.equal(fromCli.command, 'reset')
  assert.equal(fromCli.service, 'http://localhost:3000')
  assert.equal(fromCli.introspectUrl, 'http://127.0.0.1:9999')
  assert.equal(fromCli.createAccounts, true)
  assert.match(fromCli.credentialsPath, /profiles\/dev-env\.credentials\.json$/)
})

test('syncAppViewFromIntrospection posts to process-all and returns payload', async () => {
  let method = null
  let pathName = null
  const server = http.createServer((req, res) => {
    method = req.method
    pathName = req.url
    res.writeHead(200, {'content-type': 'application/json'})
    res.end(
      JSON.stringify({
        ok: true,
        before: {lastSeq: 10, runnerCursor: 4},
        after: {lastSeq: 10, runnerCursor: 10},
      }),
    )
  })
  server.listen(0, '127.0.0.1')
  await events.once(server, 'listening')

  try {
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const payload = await syncAppViewFromIntrospection(
      `http://127.0.0.1:${address.port}`,
    )
    assert.equal(method, 'POST')
    assert.equal(pathName, '/process-all?timeoutMs=60000')
    assert.equal(payload.after.runnerCursor, 10)
  } finally {
    server.close()
    await events.once(server, 'close')
  }
})

test('syncAppViewFromIntrospection throws when sync fails', async () => {
  const server = http.createServer((_req, res) => {
    res.writeHead(500, {'content-type': 'application/json'})
    res.end(JSON.stringify({ok: false, error: 'Sequence timeout'}))
  })
  server.listen(0, '127.0.0.1')
  await events.once(server, 'listening')

  try {
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    await assert.rejects(
      syncAppViewFromIntrospection(`http://127.0.0.1:${address.port}`),
      /Sequence timeout/,
    )
  } finally {
    server.close()
    await events.once(server, 'close')
  }
})

test('apply is idempotent and reset removes only managed records', async () => {
  const manifest = await loadManifest(MANIFEST_PATH)
  const actorInputs = buildActorInputs(manifest, null)
  const actorsByAlias = {}
  for (const actor of actorInputs) {
    const slug = actor.alias.replace(/_/g, '-')
    actorsByAlias[actor.alias] = {
      did: `did:plc:${slug}`,
      handle: actor.handle,
      displayName: actor.displayName || actor.handle,
    }
  }

  const operations = buildSeedOperations({manifest, actorsByAlias})
  assert.ok(operations.length > 0)
  assert.ok(operations.some(op => op.collection === 'com.para.identity'))
  assert.ok(
    operations.some(op => op.collection === 'app.bsky.graph.verification'),
  )
  assert.ok(operations.some(op => op.collection === 'app.bsky.feed.post'))
  assert.ok(operations.some(op => op.collection === 'app.bsky.feed.like'))
  assert.ok(operations.some(op => op.collection === 'app.bsky.feed.repost'))
  assert.ok(operations.some(op => op.group === 'demo-reply-post'))
  assert.ok(operations.some(op => op.recordBuilder))
  assert.ok(operations.some(op => op.refKey))

  const writer = new InMemorySeedWriter([
    {
      key: 'did:plc:foreign/app.bsky.feed.post/foreign-rkey',
      value: {$type: 'app.bsky.feed.post', text: 'foreign'},
    },
  ])
  const foreignKey = 'did:plc:foreign/app.bsky.feed.post/foreign-rkey'

  const first = await applySeedOperations(operations, writer, {dryRun: false})
  assert.equal(first.failed, 0)
  const records = writer.dumpValues()
  assert.ok(records.some(record => record.$type === 'app.bsky.feed.like'))
  assert.ok(records.some(record => record.$type === 'app.bsky.feed.repost'))
  assert.ok(
    records.some(
      record => record.$type === 'app.bsky.feed.post' && record.reply,
    ),
  )
  const firstSize = writer.size()

  const second = await applySeedOperations(operations, writer, {dryRun: false})
  assert.equal(second.failed, 0)
  assert.equal(writer.size(), firstSize)

  const resetOps = toResetOperations(operations)
  const reset = await resetSeedOperations(resetOps, writer, {dryRun: false})
  assert.equal(reset.failed, 0)
  assert.equal(writer.hasKey(foreignKey), true)
  assert.equal(writer.size(), 1)
})

test('buildActorInputs preserves optional identity metadata', async () => {
  const manifest = await loadManifest(MANIFEST_PATH)
  const actorInputs = buildActorInputs(manifest, null)

  const official = actorInputs.find(actor => actor.alias === 'official_jalisco')
  assert.ok(official)
  assert.equal(official.identity?.isVerifiedPublicFigure, true)
  assert.equal(
    official.identity?.proofBlob,
    'manual-review://mx/jalisco/carlos-ramirez',
  )
})

test('buildSeedOperations assigns valid TIDs to tid-keyed collections', async () => {
  const manifest = await loadManifest(MANIFEST_PATH)
  const actorInputs = buildActorInputs(manifest, null)
  const actorsByAlias = {}

  for (const actor of actorInputs) {
    const slug = actor.alias.replace(/_/g, '-')
    actorsByAlias[actor.alias] = {
      did: `did:plc:${slug}`,
      handle: actor.handle,
      displayName: actor.displayName || actor.handle,
    }
  }

  const operations = buildSeedOperations({manifest, actorsByAlias})

  for (const op of operations) {
    if (!TID_COLLECTIONS.has(op.collection)) continue
    assert.doesNotThrow(() => TID.fromStr(op.rkey))
  }
})

test('demo_social_graph resolves reply, like, and repost refs in memory', async () => {
  const manifest = {
    seedId: 'demo-social-graph-test',
    version: '1.0.0',
    actors: [
      {
        alias: 'alpha',
        handle: 'alpha.test',
        email: 'alpha@test.com',
        password: 'hunter2',
      },
      {
        alias: 'beta',
        handle: 'beta.test',
        email: 'beta@test.com',
        password: 'hunter2',
      },
      {
        alias: 'gamma',
        handle: 'gamma.test',
        email: 'gamma@test.com',
        password: 'hunter2',
      },
    ],
    bulkScenarios: [
      {
        type: 'demo_social_graph',
        alias: 'micro-social',
        startAt: '2026-03-25T10:00:00.000Z',
        anchorActor: 'alpha',
        bridgeActors: ['beta'],
        actors: ['alpha', 'beta', 'gamma'],
        followsPerActor: 2,
        postsPerActor: 2,
        replyCount: 3,
        likesPerPost: 1,
        repostEvery: 2,
      },
    ],
  }
  const actorsByAlias = {
    alpha: {did: 'did:plc:alpha', handle: 'alpha.test', displayName: 'Alpha'},
    beta: {did: 'did:plc:beta', handle: 'beta.test', displayName: 'Beta'},
    gamma: {did: 'did:plc:gamma', handle: 'gamma.test', displayName: 'Gamma'},
  }

  const operations = buildSeedOperations({manifest, actorsByAlias})
  assert.ok(operations.some(op => op.group === 'demo-post'))
  assert.ok(operations.some(op => op.group === 'demo-reply-post'))
  assert.ok(operations.some(op => op.collection === 'app.bsky.feed.like'))
  assert.ok(operations.some(op => op.collection === 'app.bsky.feed.repost'))

  const writer = new InMemorySeedWriter()
  const applied = await applySeedOperations(operations, writer, {dryRun: false})
  assert.equal(applied.failed, 0)

  const storedRecords = writer.dumpValues()
  assert.ok(
    storedRecords.some(
      record =>
        record.$type === 'app.bsky.feed.post' &&
        record.reply?.root?.uri &&
        record.reply?.parent?.uri,
    ),
  )
  assert.ok(storedRecords.some(record => record.$type === 'app.bsky.feed.like'))
  assert.ok(
    storedRecords.some(record => record.$type === 'app.bsky.feed.repost'),
  )
})
