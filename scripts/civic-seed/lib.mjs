import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {TID} from '@atproto/common-web'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FAKE_STRONG_REF_CID =
  'bafyreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku'
const PROFILE_CREDENTIALS = {
  'dev-env': path.resolve(__dirname, 'profiles', 'dev-env.credentials.json'),
  'local-dev': path.resolve(__dirname, 'profiles', 'dev-env.credentials.json'),
}
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

export function defaultManifestPath() {
  return path.resolve(__dirname, 'manifest.v1.json')
}

export function resolveCliConfig(argv, env = process.env) {
  const args = [...argv]
  const command = args.shift()

  if (command !== 'apply' && command !== 'reset') {
    throw new Error('First argument must be "apply" or "reset".')
  }

  const config = {
    command,
    service: env.PARA_CIVIC_SEED_SERVICE || 'http://localhost:2583',
    manifestPath: env.PARA_CIVIC_SEED_MANIFEST || defaultManifestPath(),
    credentialsPath: env.PARA_CIVIC_SEED_CREDENTIALS || null,
    profile: env.PARA_CIVIC_SEED_PROFILE || null,
    introspectUrl: env.PARA_CIVIC_SEED_INTROSPECT_URL || null,
    createAccounts: parseBoolEnv(env.PARA_CIVIC_SEED_CREATE_ACCOUNTS, true),
    dryRun: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--service':
        config.service = requiredValue(args, ++i, '--service')
        break
      case '--manifest':
        config.manifestPath = requiredValue(args, ++i, '--manifest')
        break
      case '--credentials':
        config.credentialsPath = requiredValue(args, ++i, '--credentials')
        break
      case '--profile':
        config.profile = requiredValue(args, ++i, '--profile')
        break
      case '--introspect-url':
        config.introspectUrl = requiredValue(args, ++i, '--introspect-url')
        break
      case '--create-accounts':
        config.createAccounts = true
        break
      case '--no-create-accounts':
        config.createAccounts = false
        break
      case '--dry-run':
        config.dryRun = true
        break
      case '--verbose':
        config.verbose = true
        break
      default:
        throw new Error(`Unknown argument: ${arg}`)
    }
  }

  config.manifestPath = path.resolve(config.manifestPath)
  if (config.credentialsPath) {
    config.credentialsPath = path.resolve(config.credentialsPath)
  } else if (config.profile) {
    config.credentialsPath = resolveProfileCredentialsPath(config.profile)
  }
  if (config.introspectUrl) {
    config.introspectUrl = config.introspectUrl.replace(/\/+$/, '')
  }

  return config
}

export async function syncAppViewFromIntrospection(
  introspectUrl,
  handles = [],
  fetchImpl = fetch,
) {
  const response = await fetchImpl(
    `${introspectUrl}/process-all?timeoutMs=60000`,
    {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({handles}),
    },
  )

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok || payload?.ok === false) {
    const errorMessage =
      payload?.error || `Introspection sync failed with HTTP ${response.status}`
    throw new Error(errorMessage)
  }

  return payload
}

export async function loadManifest(filePath) {
  const manifest = await loadJsonFile(filePath)
  assertManifestShape(manifest)
  return manifest
}

export async function loadCredentials(filePath) {
  if (!filePath) return null
  return loadJsonFile(filePath)
}

export function buildActorInputs(manifest, credentials) {
  const overrides = credentials?.actors || {}
  const actors = manifest.actors.map(actor => {
    const byAlias = asObject(overrides[actor.alias])
    const byHandle = asObject(overrides[actor.handle])
    const override = {...byHandle, ...byAlias}

    const identifier = override.identifier || override.handle || actor.handle
    const handle = override.handle || actor.handle
    const email = override.email || actor.email
    const password = override.password || actor.password
    const inviteCode = override.inviteCode || actor.inviteCode
    const createAccount =
      override.createAccount !== undefined
        ? Boolean(override.createAccount)
        : actor.createAccount !== undefined
          ? Boolean(actor.createAccount)
          : true

    if (!identifier) {
      throw new Error(`Actor "${actor.alias}" is missing identifier/handle.`)
    }
    if (!password) {
      throw new Error(
        `Actor "${actor.alias}" is missing password (manifest or credentials override).`,
      )
    }

    return {
      alias: actor.alias,
      identifier,
      handle,
      email,
      password,
      inviteCode,
      createAccount,
      displayName: actor.displayName,
      description: actor.description,
      roles: actor.roles || [],
      identity: actor.identity || null,
    }
  })

  return actors
}

export function buildSeedOperations({manifest, actorsByAlias}) {
  const operations = []
  const cabildeoUriByAlias = buildCabildeoUriMap(manifest, actorsByAlias)

  for (const actor of manifest.actors || []) {
    if (!actor.identity) continue
    const repoActor = getActor(actorsByAlias, actor.alias, 'identity actor')
    operations.push({
      group: 'identity',
      actorAlias: actor.alias,
      did: repoActor.did,
      collection: 'com.para.identity',
      rkey: actor.identity.rkey || 'public-figure',
      record: buildIdentityRecord(actor.identity),
    })
  }

  for (const entry of manifest.verificationRecords || []) {
    const issuer = getActor(
      actorsByAlias,
      entry.issuer,
      'verification record issuer',
    )
    operations.push({
      group: 'verification',
      actorAlias: entry.issuer,
      did: issuer.did,
      collection: 'app.bsky.graph.verification',
      rkey:
        entry.rkey ||
        `seed-verify-${sanitizeRkeyComponent(entry.subject || 'subject')}`,
      record: buildVerificationRecord(entry, actorsByAlias),
    })
  }

  for (const entry of manifest.follows || []) {
    const actor = getActor(actorsByAlias, entry.actor, 'follow actor')
    operations.push({
      group: 'follow',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'app.bsky.graph.follow',
      rkey:
        entry.rkey ||
        `seed-follow-${sanitizeRkeyComponent(entry.actor)}-${sanitizeRkeyComponent(entry.subject)}`,
      record: buildFollowRecord(entry, actorsByAlias),
    })
  }

  for (const entry of manifest.governanceRecords || []) {
    const actor = getActor(
      actorsByAlias,
      entry.actor,
      'governance record actor',
    )
    operations.push({
      group: 'governance',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'com.para.community.governance',
      rkey: entry.rkey,
      record: buildGovernanceRecord(entry, actorsByAlias),
    })
  }

  for (const entry of manifest.cabildeos || []) {
    const actor = getActor(actorsByAlias, entry.actor, 'cabildeo actor')
    operations.push({
      group: 'cabildeo',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'com.para.civic.cabildeo',
      rkey: entry.rkey,
      record: buildCabildeoRecord(entry),
    })
  }

  for (const entry of manifest.delegations || []) {
    const actor = getActor(actorsByAlias, entry.actor, 'delegation actor')
    operations.push({
      group: 'delegation',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'com.para.civic.delegation',
      rkey: entry.rkey,
      record: buildDelegationRecord(entry, actorsByAlias, cabildeoUriByAlias),
    })
  }

  for (const entry of manifest.positions || []) {
    const actor = getActor(actorsByAlias, entry.actor, 'position actor')
    operations.push({
      group: 'position',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'com.para.civic.position',
      rkey: entry.rkey,
      record: buildPositionRecord(entry, cabildeoUriByAlias),
    })
  }

  for (const entry of manifest.votes || []) {
    const actor = getActor(actorsByAlias, entry.actor, 'vote actor')
    operations.push({
      group: 'vote',
      actorAlias: entry.actor,
      did: actor.did,
      collection: 'com.para.civic.vote',
      rkey: entry.rkey,
      record: buildVoteRecord(entry, actorsByAlias, cabildeoUriByAlias),
    })
  }

  for (const entry of manifest.openQuestionPosts || []) {
    operations.push(
      buildPostOperation({
        entry,
        actorsByAlias,
        group: 'open-question-post',
        context: 'open question post actor',
      }),
    )
  }

  for (const entry of manifest.badgePosts || []) {
    operations.push(
      buildPostOperation({
        entry,
        actorsByAlias,
        group: 'badge-post',
        context: 'badge post actor',
      }),
    )
  }

  for (const entry of manifest.replyPosts || []) {
    operations.push(
      buildReplyPostOperation({
        entry,
        actorsByAlias,
        group: 'reply-post',
        context: 'reply post actor',
      }),
    )
  }

  for (const entry of manifest.likes || []) {
    operations.push(
      buildLikeOperation({
        entry,
        actorsByAlias,
        group: 'like',
        context: 'like actor',
      }),
    )
  }

  for (const entry of manifest.reposts || []) {
    operations.push(
      buildRepostOperation({
        entry,
        actorsByAlias,
        group: 'repost',
        context: 'repost actor',
      }),
    )
  }

  for (const scenario of manifest.bulkScenarios || []) {
    if (scenario.type === 'high_activity_cabildeo') {
      operations.push(
        ...buildHighActivityOperations({
          scenario,
          actorsByAlias,
          cabildeoUriByAlias,
        }),
      )
      continue
    }
    if (scenario.type === 'demo_social_graph') {
      operations.push(
        ...buildDemoSocialGraphOperations({
          scenario,
          actorsByAlias,
        }),
      )
      continue
    }
    throw new Error(`Unsupported bulk scenario type: ${scenario.type}`)
  }

  return normalizeTidOperations(operations)
}

export function toResetOperations(operations) {
  return [...operations].reverse()
}

export function summarizeOperations(operations) {
  const byCollection = {}
  const byGroup = {}
  for (const op of operations) {
    byCollection[op.collection] = (byCollection[op.collection] || 0) + 1
    byGroup[op.group] = (byGroup[op.group] || 0) + 1
  }
  return {
    total: operations.length,
    byCollection,
    byGroup,
  }
}

export async function applySeedOperations(operations, writer, options = {}) {
  const dryRun = Boolean(options.dryRun)
  const verbose = Boolean(options.verbose)
  const result = {
    attempted: operations.length,
    written: 0,
    failed: 0,
    byCollection: {},
  }
  const runtimeState = {
    recordRefs: new Map(),
  }

  for (const op of operations) {
    let resolvedOp
    if (dryRun) {
      resolvedOp = resolveSeedOperation(op, runtimeState)
      result.written += 1
      increment(result.byCollection, resolvedOp.collection)
      registerRecordRef(runtimeState, resolvedOp, {
        uri: `at://${resolvedOp.did}/${resolvedOp.collection}/${resolvedOp.rkey}`,
        cid: FAKE_STRONG_REF_CID,
      })
      continue
    }

    try {
      resolvedOp = resolveSeedOperation(op, runtimeState)
      const writeResult = await writer.putRecord(resolvedOp)
      registerRecordRef(runtimeState, resolvedOp, writeResult)
      result.written += 1
      increment(result.byCollection, resolvedOp.collection)
      if (verbose) {
        console.log(
          `put ${resolvedOp.collection}/${resolvedOp.rkey} as ${resolvedOp.actorAlias}`,
        )
      }
    } catch (err) {
      result.failed += 1
      console.error(
        `Failed put ${op.collection}/${op.rkey} (${op.actorAlias}):`,
        err?.message || err,
      )
    }
  }

  return result
}

export async function resetSeedOperations(operations, writer, options = {}) {
  const dryRun = Boolean(options.dryRun)
  const verbose = Boolean(options.verbose)
  const result = {
    attempted: operations.length,
    deleted: 0,
    missing: 0,
    failed: 0,
    byCollection: {},
  }

  for (const op of operations) {
    if (dryRun) {
      result.deleted += 1
      increment(result.byCollection, op.collection)
      continue
    }

    try {
      await writer.deleteRecord(op)
      result.deleted += 1
      increment(result.byCollection, op.collection)
      if (verbose) {
        console.log(`del ${op.collection}/${op.rkey} as ${op.actorAlias}`)
      }
    } catch (err) {
      if (isMissingRecordError(err)) {
        result.missing += 1
        continue
      }
      result.failed += 1
      console.error(
        `Failed delete ${op.collection}/${op.rkey} (${op.actorAlias}):`,
        err?.message || err,
      )
    }
  }

  return result
}

export class InMemorySeedWriter {
  constructor(initialEntries = []) {
    this.store = new Map()
    for (const entry of initialEntries) {
      this.store.set(entry.key, entry.value)
    }
  }

  keyFor(op) {
    return `${op.did}/${op.collection}/${op.rkey}`
  }

  async putRecord(op) {
    const key = this.keyFor(op)
    this.store.set(key, structuredClone(op.record))
    return {
      uri: `at://${op.did}/${op.collection}/${op.rkey}`,
      cid: FAKE_STRONG_REF_CID,
    }
  }

  async deleteRecord(op) {
    const key = this.keyFor(op)
    if (!this.store.has(key)) {
      const err = new Error('RecordNotFound')
      err.code = 'RecordNotFound'
      throw err
    }
    this.store.delete(key)
  }

  size() {
    return this.store.size
  }

  hasKey(key) {
    return this.store.has(key)
  }

  dumpValues() {
    return Array.from(this.store.values(), value => structuredClone(value))
  }
}

function resolveSeedOperation(op, runtimeState) {
  if (!op.recordBuilder) return op
  return {
    ...op,
    record: op.recordBuilder(runtimeState),
  }
}

function registerRecordRef(runtimeState, op, writeResult) {
  if (!op.refKey) return
  const uri = writeResult?.uri || `at://${op.did}/${op.collection}/${op.rkey}`
  const cid = writeResult?.cid || FAKE_STRONG_REF_CID
  runtimeState.recordRefs.set(op.refKey, {uri, cid})
}

function resolveRecordRef(runtimeState, refKey, context) {
  const ref = runtimeState.recordRefs.get(refKey)
  if (!ref) {
    throw new Error(`Unknown record ref "${refKey}" in ${context}.`)
  }
  return ref
}

function buildHighActivityOperations({
  scenario,
  actorsByAlias,
  cabildeoUriByAlias,
}) {
  const operations = []
  const cabildeoUri = cabildeoUriByAlias[scenario.cabildeoAlias]
  if (!cabildeoUri) {
    throw new Error(
      `Bulk scenario references unknown cabildeo alias: ${scenario.cabildeoAlias}`,
    )
  }

  if (
    !Array.isArray(scenario.positionActors) ||
    !scenario.positionActors.length
  ) {
    throw new Error('Bulk scenario must include non-empty positionActors.')
  }
  if (!Array.isArray(scenario.voteActors) || !scenario.voteActors.length) {
    throw new Error('Bulk scenario must include non-empty voteActors.')
  }

  const stanceCycle = scenario.stanceCycle || ['for', 'against', 'amendment']
  const optionCycle = scenario.optionCycle || [0, 1, 2]
  const baseDate = scenario.startAt || new Date().toISOString()
  const textPrefix = scenario.textPrefix || 'High-activity generated content.'

  for (let i = 0; i < scenario.positionCount; i++) {
    const actorAlias =
      scenario.positionActors[i % scenario.positionActors.length]
    const actor = getActor(actorsByAlias, actorAlias, 'bulk position actor')
    const stance = stanceCycle[i % stanceCycle.length]
    const optionIndex = optionCycle[i % optionCycle.length]
    operations.push({
      group: 'bulk-position',
      actorAlias,
      did: actor.did,
      collection: 'com.para.civic.position',
      rkey: `seed-bulk-pos-${scenario.cabildeoAlias}-${String(i).padStart(4, '0')}`,
      record: compactObject({
        $type: 'com.para.civic.position',
        cabildeo: cabildeoUri,
        stance,
        optionIndex,
        text: `${textPrefix} Position ${i + 1} (${stance}) for option ${optionIndex + 1}.`,
        compassQuadrant: BULK_QUADRANTS[i % BULK_QUADRANTS.length],
        createdAt: plusMinutes(baseDate, i),
      }),
    })
  }

  for (let i = 0; i < scenario.voteCount; i++) {
    const actorAlias = scenario.voteActors[i % scenario.voteActors.length]
    const actor = getActor(actorsByAlias, actorAlias, 'bulk vote actor')
    const selectedOption = optionCycle[i % optionCycle.length]
    const delegatedAlias =
      i % 6 === 0
        ? scenario.voteActors[(i + 1) % scenario.voteActors.length]
        : null
    const delegatedFrom = delegatedAlias
      ? [getActor(actorsByAlias, delegatedAlias, 'bulk delegated actor').did]
      : undefined

    operations.push({
      group: 'bulk-vote',
      actorAlias,
      did: actor.did,
      collection: 'com.para.civic.vote',
      rkey: `seed-bulk-vote-${scenario.cabildeoAlias}-${String(i).padStart(4, '0')}`,
      record: compactObject({
        $type: 'com.para.civic.vote',
        cabildeo: cabildeoUri,
        selectedOption,
        isDirect: !delegatedFrom,
        delegatedFrom,
        createdAt: plusMinutes(baseDate, i + scenario.positionCount),
      }),
    })
  }

  return operations
}

function buildDemoSocialGraphOperations({scenario, actorsByAlias}) {
  const operations = []
  const actorAliases = scenario.actors || []
  if (!scenario.alias) {
    throw new Error('demo_social_graph must include alias.')
  }
  if (!actorAliases.length) {
    throw new Error('demo_social_graph must include non-empty actors.')
  }
  if (scenario.anchorActor && !actorAliases.includes(scenario.anchorActor)) {
    throw new Error('demo_social_graph anchorActor must be included in actors.')
  }

  const followsPerActor = Math.max(1, scenario.followsPerActor || 4)
  const postsPerActor = Math.max(1, scenario.postsPerActor || 3)
  const replyCount = Math.max(0, scenario.replyCount || actorAliases.length * 2)
  const likesPerPost = Math.max(0, scenario.likesPerPost || 2)
  const repostEvery = Math.max(1, scenario.repostEvery || 4)
  const baseDate = scenario.startAt || new Date().toISOString()
  const bridgeActors = dedupeList([
    ...(scenario.bridgeActors || []),
    ...(scenario.anchorActor ? [scenario.anchorActor] : []),
  ]).filter(alias => actorAliases.includes(alias))
  const topics = (scenario.topics || DEFAULT_SOCIAL_TOPICS).map(
    (topic, index) => ({
      community:
        topic.community ||
        DEFAULT_SOCIAL_TOPICS[index % DEFAULT_SOCIAL_TOPICS.length].community,
      tag:
        topic.tag ||
        DEFAULT_SOCIAL_TOPICS[index % DEFAULT_SOCIAL_TOPICS.length].tag,
      focus:
        topic.focus ||
        DEFAULT_SOCIAL_TOPICS[index % DEFAULT_SOCIAL_TOPICS.length].focus,
      proposal:
        topic.proposal ||
        DEFAULT_SOCIAL_TOPICS[index % DEFAULT_SOCIAL_TOPICS.length].proposal,
    }),
  )

  const followPairs = new Set()
  let minuteCursor = 0

  const pushFollow = (actorAlias, subjectAlias) => {
    if (!actorAlias || !subjectAlias || actorAlias === subjectAlias) return
    const key = `${actorAlias}->${subjectAlias}`
    if (followPairs.has(key)) return
    followPairs.add(key)
    const actor = getActor(
      actorsByAlias,
      actorAlias,
      'demo social follow actor',
    )
    operations.push({
      group: 'demo-follow',
      actorAlias,
      did: actor.did,
      collection: 'app.bsky.graph.follow',
      rkey: `seed-demo-follow-${sanitizeRkeyComponent(actorAlias)}-${sanitizeRkeyComponent(subjectAlias)}`,
      record: buildFollowRecord(
        {
          subject: subjectAlias,
          createdAt: plusMinutes(baseDate, minuteCursor),
        },
        actorsByAlias,
      ),
    })
    minuteCursor += 1
  }

  actorAliases.forEach((actorAlias, index) => {
    for (let offset = 1; offset <= followsPerActor; offset += 1) {
      pushFollow(
        actorAlias,
        actorAliases[(index + offset) % actorAliases.length],
      )
    }
    for (const bridgeAlias of bridgeActors) {
      pushFollow(actorAlias, bridgeAlias)
    }
  })

  if (scenario.anchorActor) {
    for (const actorAlias of actorAliases) {
      pushFollow(scenario.anchorActor, actorAlias)
      pushFollow(actorAlias, scenario.anchorActor)
    }
  }

  const publishedRefs = []
  const primaryRefs = []
  const totalPrimaryPosts = postsPerActor * actorAliases.length

  for (let i = 0; i < totalPrimaryPosts; i += 1) {
    const actorAlias = actorAliases[i % actorAliases.length]
    const actor = getActor(actorsByAlias, actorAlias, 'demo social post actor')
    const topic = topics[i % topics.length]
    const refKey = `demo-post-${scenario.alias}-${String(i).padStart(4, '0')}`
    const createdAt = plusMinutes(baseDate, minuteCursor)
    minuteCursor += 7
    const entry = {
      alias: refKey,
      actor: actorAlias,
      rkey: `seed-demo-post-${sanitizeRkeyComponent(scenario.alias)}-${String(i).padStart(4, '0')}`,
      text: renderPrimaryPostText({actor, actorAlias, topic, index: i}),
      tags: [topic.tag, sanitizeRkeyComponent(actorAlias)],
      langs: ['es'],
      createdAt,
    }
    operations.push(
      buildPostOperation({
        entry,
        actorsByAlias,
        group: 'demo-post',
        context: 'demo social post actor',
      }),
    )
    const refMeta = {refKey, rootRef: refKey, actorAlias}
    primaryRefs.push(refMeta)
    publishedRefs.push(refMeta)
  }

  for (let i = 0; i < replyCount; i += 1) {
    const actorAlias = actorAliases[i % actorAliases.length]
    const actor = getActor(actorsByAlias, actorAlias, 'demo social reply actor')
    const availableParents = publishedRefs.filter(
      ref => ref.actorAlias !== actorAlias,
    )
    const parentRef =
      availableParents[(i * 3) % availableParents.length] ||
      primaryRefs[i % primaryRefs.length]
    const rootRef = parentRef.rootRef || parentRef.refKey
    const topic = topics[(i + 1) % topics.length]
    const refKey = `demo-reply-${scenario.alias}-${String(i).padStart(4, '0')}`
    const createdAt = plusMinutes(baseDate, minuteCursor)
    minuteCursor += 5
    const entry = {
      alias: refKey,
      actor: actorAlias,
      rkey: `seed-demo-reply-${sanitizeRkeyComponent(scenario.alias)}-${String(i).padStart(4, '0')}`,
      text: renderReplyPostText({actor, actorAlias, topic, index: i}),
      tags: [topic.tag, 'debate'],
      langs: ['es'],
      createdAt,
      parentRef: parentRef.refKey,
      rootRef,
    }
    operations.push(
      buildReplyPostOperation({
        entry,
        actorsByAlias,
        group: 'demo-reply-post',
        context: 'demo social reply actor',
      }),
    )
    publishedRefs.push({refKey, rootRef, actorAlias})
  }

  publishedRefs.forEach((postRef, index) => {
    const likers = rotateUniqueOtherActors({
      actorAliases,
      excludedAlias: postRef.actorAlias,
      startIndex: index,
      count: likesPerPost,
    })
    likers.forEach((actorAlias, likerIndex) => {
      operations.push(
        buildLikeOperation({
          entry: {
            actor: actorAlias,
            subjectRef: postRef.refKey,
            rkey: `seed-demo-like-${sanitizeRkeyComponent(actorAlias)}-${String(index).padStart(4, '0')}-${likerIndex}`,
            createdAt: plusMinutes(baseDate, minuteCursor + likerIndex),
          },
          actorsByAlias,
          group: 'demo-like',
          context: 'demo social like actor',
        }),
      )
    })

    if ((index + 1) % repostEvery === 0) {
      const repostActor = rotateUniqueOtherActors({
        actorAliases,
        excludedAlias: postRef.actorAlias,
        startIndex: index + 2,
        count: 1,
      })[0]
      if (repostActor) {
        operations.push(
          buildRepostOperation({
            entry: {
              actor: repostActor,
              subjectRef: postRef.refKey,
              rkey: `seed-demo-repost-${sanitizeRkeyComponent(repostActor)}-${String(index).padStart(4, '0')}`,
              createdAt: plusMinutes(baseDate, minuteCursor + 1),
            },
            actorsByAlias,
            group: 'demo-repost',
            context: 'demo social repost actor',
          }),
        )
      }
    }

    minuteCursor += Math.max(1, likesPerPost)
  })

  return operations
}

function buildGovernanceRecord(entry, actorsByAlias) {
  return compactObject({
    $type: 'com.para.community.governance',
    community: entry.community,
    communityId: entry.communityId,
    slug: entry.slug,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    moderators: (entry.moderators || []).map(mod => {
      const actor = mod.actor
        ? getActor(actorsByAlias, mod.actor, 'governance moderator')
        : null
      return compactObject({
        did: actor?.did,
        handle: actor?.handle,
        displayName: mod.displayName || actor?.displayName,
        role: mod.role,
        badge: mod.badge,
        capabilities: mod.capabilities || [],
      })
    }),
    officials: (entry.officials || []).map(official => {
      const actor = official.actor
        ? getActor(actorsByAlias, official.actor, 'governance official')
        : null
      return compactObject({
        did: actor?.did,
        handle: actor?.handle,
        displayName: official.displayName || actor?.displayName,
        office: official.office,
        mandate: official.mandate,
      })
    }),
    deputies: (entry.deputies || []).map(role => {
      const activeHolder = role.activeHolder
        ? getActor(
            actorsByAlias,
            role.activeHolder,
            'governance deputy active holder',
          )
        : null
      return compactObject({
        key: role.key,
        tier: role.tier,
        role: role.role,
        description: role.description,
        capabilities: role.capabilities || [],
        activeHolder: activeHolder
          ? {
              did: activeHolder.did,
              handle: activeHolder.handle,
              displayName: activeHolder.displayName,
            }
          : undefined,
        activeSince: role.activeSince,
        votes: role.votes || 0,
        applicants: (role.applicants || []).map(applicant => {
          const actor = applicant.actor
            ? getActor(actorsByAlias, applicant.actor, 'governance applicant')
            : null
          return compactObject({
            did: actor?.did,
            handle: actor?.handle,
            displayName: applicant.displayName || actor?.displayName,
            appliedAt: applicant.appliedAt,
            status: applicant.status,
            note: applicant.note,
          })
        }),
      })
    }),
    metadata: entry.metadata || undefined,
    editHistory: (entry.editHistory || []).map(edit => {
      const actor = edit.actor
        ? getActor(actorsByAlias, edit.actor, 'governance edit actor')
        : null
      return compactObject({
        id: edit.id,
        action: edit.action,
        actorDid: actor?.did,
        actorHandle: actor?.handle,
        createdAt: edit.createdAt,
        summary: edit.summary,
      })
    }),
  })
}

function buildIdentityRecord(entry) {
  return compactObject({
    $type: 'com.para.identity',
    createdAt: entry.createdAt,
    isVerifiedPublicFigure: Boolean(entry.isVerifiedPublicFigure),
    proofBlob: entry.proofBlob,
    verifiedAt: entry.verifiedAt,
  })
}

function buildVerificationRecord(entry, actorsByAlias) {
  const subject = getActor(
    actorsByAlias,
    entry.subject,
    'verification record subject',
  )

  return compactObject({
    $type: 'app.bsky.graph.verification',
    subject: subject.did,
    handle: entry.handle || subject.handle,
    displayName: entry.displayName || subject.displayName || subject.handle,
    createdAt: entry.createdAt,
  })
}

function buildFollowRecord(entry, actorsByAlias) {
  return compactObject({
    $type: 'app.bsky.graph.follow',
    subject: resolveDid(entry.subject, actorsByAlias),
    createdAt: entry.createdAt || new Date().toISOString(),
  })
}

function buildCabildeoRecord(entry) {
  return compactObject({
    $type: 'com.para.civic.cabildeo',
    title: entry.title,
    description: entry.description,
    community: entry.community,
    communities: entry.communities,
    flairs: entry.flairs,
    region: entry.region,
    geoRestricted: entry.geoRestricted,
    options: entry.options,
    minQuorum: entry.minQuorum,
    phase: entry.phase,
    phaseDeadline: entry.phaseDeadline,
    createdAt: entry.createdAt,
  })
}

function buildPositionRecord(entry, cabildeoUriByAlias) {
  return compactObject({
    $type: 'com.para.civic.position',
    cabildeo: resolveCabildeoUri(entry.cabildeoAlias, cabildeoUriByAlias),
    stance: entry.stance,
    optionIndex: entry.optionIndex,
    text: entry.text,
    compassQuadrant: entry.compassQuadrant,
    createdAt: entry.createdAt,
  })
}

function buildVoteRecord(entry, actorsByAlias, cabildeoUriByAlias) {
  return compactObject({
    $type: 'com.para.civic.vote',
    cabildeo: resolveCabildeoUri(entry.cabildeoAlias, cabildeoUriByAlias),
    selectedOption: entry.selectedOption,
    isDirect: entry.isDirect,
    delegatedFrom: (entry.delegatedFrom || []).map(aliasOrDid =>
      resolveDid(aliasOrDid, actorsByAlias),
    ),
    createdAt: entry.createdAt,
  })
}

function buildDelegationRecord(entry, actorsByAlias, cabildeoUriByAlias) {
  return compactObject({
    $type: 'com.para.civic.delegation',
    cabildeo: entry.cabildeoAlias
      ? resolveCabildeoUri(entry.cabildeoAlias, cabildeoUriByAlias)
      : undefined,
    delegateTo: resolveDid(entry.delegateTo, actorsByAlias),
    scopeFlairs: entry.scopeFlairs,
    reason: entry.reason,
    createdAt: entry.createdAt,
  })
}

function buildPostOperation({entry, actorsByAlias, group, context}) {
  const actor = getActor(actorsByAlias, entry.actor, context)
  return {
    group,
    actorAlias: entry.actor,
    did: actor.did,
    collection: 'app.bsky.feed.post',
    rkey: entry.rkey,
    createdAt: entry.createdAt,
    refKey: resolvePostRefKey(entry),
    record: buildPostRecord(entry),
  }
}

function buildReplyPostOperation({entry, actorsByAlias, group, context}) {
  const actor = getActor(actorsByAlias, entry.actor, context)
  return {
    group,
    actorAlias: entry.actor,
    did: actor.did,
    collection: 'app.bsky.feed.post',
    rkey: entry.rkey,
    createdAt: entry.createdAt,
    refKey: resolvePostRefKey(entry),
    recordBuilder(runtimeState) {
      const parent = resolveRecordRef(
        runtimeState,
        entry.parentRef,
        `reply parent for ${entry.rkey}`,
      )
      const root = resolveRecordRef(
        runtimeState,
        entry.rootRef || entry.parentRef,
        `reply root for ${entry.rkey}`,
      )
      return buildPostRecord({
        ...entry,
        reply: {root, parent},
      })
    },
  }
}

function buildLikeOperation({entry, actorsByAlias, group, context}) {
  const actor = getActor(actorsByAlias, entry.actor, context)
  return {
    group,
    actorAlias: entry.actor,
    did: actor.did,
    collection: 'app.bsky.feed.like',
    createdAt: entry.createdAt,
    rkey:
      entry.rkey ||
      `seed-like-${sanitizeRkeyComponent(entry.actor)}-${sanitizeRkeyComponent(entry.subjectRef)}`,
    recordBuilder(runtimeState) {
      return buildLikeRecord({
        ...entry,
        subject: resolveRecordRef(
          runtimeState,
          entry.subjectRef,
          `like subject for ${entry.actor}`,
        ),
      })
    },
  }
}

function buildRepostOperation({entry, actorsByAlias, group, context}) {
  const actor = getActor(actorsByAlias, entry.actor, context)
  return {
    group,
    actorAlias: entry.actor,
    did: actor.did,
    collection: 'app.bsky.feed.repost',
    createdAt: entry.createdAt,
    rkey:
      entry.rkey ||
      `seed-repost-${sanitizeRkeyComponent(entry.actor)}-${sanitizeRkeyComponent(entry.subjectRef)}`,
    recordBuilder(runtimeState) {
      return buildRepostRecord({
        ...entry,
        subject: resolveRecordRef(
          runtimeState,
          entry.subjectRef,
          `repost subject for ${entry.actor}`,
        ),
      })
    },
  }
}

function buildPostRecord(entry) {
  return compactObject({
    $type: 'app.bsky.feed.post',
    text: entry.text,
    tags: entry.tags || [],
    langs: entry.langs || ['es'],
    reply: entry.reply,
    createdAt: entry.createdAt,
  })
}

function buildLikeRecord(entry) {
  return compactObject({
    $type: 'app.bsky.feed.like',
    subject: entry.subject,
    via: entry.via,
    createdAt: entry.createdAt || new Date().toISOString(),
  })
}

function buildRepostRecord(entry) {
  return compactObject({
    $type: 'app.bsky.feed.repost',
    subject: entry.subject,
    via: entry.via,
    createdAt: entry.createdAt || new Date().toISOString(),
  })
}

function buildCabildeoUriMap(manifest, actorsByAlias) {
  const map = {}
  for (const cabildeo of manifest.cabildeos || []) {
    const actor = getActor(actorsByAlias, cabildeo.actor, 'cabildeo uri actor')
    map[cabildeo.alias] =
      `at://${actor.did}/com.para.civic.cabildeo/${cabildeo.rkey}`
  }
  return map
}

function resolveCabildeoUri(alias, cabildeoUriByAlias) {
  const uri = cabildeoUriByAlias[alias]
  if (!uri) {
    throw new Error(`Unknown cabildeoAlias: ${alias}`)
  }
  return uri
}

function resolveDid(aliasOrDid, actorsByAlias) {
  if (!aliasOrDid) {
    throw new Error('Expected did or actor alias.')
  }
  if (aliasOrDid.startsWith('did:')) {
    return aliasOrDid
  }
  return getActor(actorsByAlias, aliasOrDid, 'did reference').did
}

function getActor(actorsByAlias, alias, context) {
  const actor = actorsByAlias[alias]
  if (!actor) {
    throw new Error(`Unknown actor alias "${alias}" in ${context}.`)
  }
  return actor
}

function increment(target, key) {
  target[key] = (target[key] || 0) + 1
}

function plusMinutes(isoDate, minutes) {
  const at = new Date(isoDate).getTime()
  return new Date(at + minutes * 60000).toISOString()
}

function compactObject(value) {
  const output = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null) continue
    output[key] = item
  }
  return output
}

function normalizeTidOperations(operations) {
  const counters = new Map()
  return operations.map((op, index) => {
    if (!TID_COLLECTIONS.has(op.collection) || isValidTid(op.rkey)) {
      return op
    }

    const createdAt = op.createdAt || op.record?.createdAt
    const createdMs = Date.parse(createdAt || '')
    const baseMicros = Number.isFinite(createdMs)
      ? createdMs * 1000
      : Date.parse('2026-01-01T00:00:00.000Z') * 1000 + index
    const counterKey = `${op.did}:${op.collection}:${baseMicros}`
    const offset = counters.get(counterKey) || 0
    counters.set(counterKey, offset + 1)

    return {
      ...op,
      rkey: TID.fromTime(baseMicros + offset, 0).toString(),
    }
  })
}

function isValidTid(value) {
  if (!value) return false
  try {
    TID.fromStr(value)
    return true
  } catch {
    return false
  }
}

function sanitizeRkeyComponent(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function resolvePostRefKey(entry) {
  return entry.alias || entry.refKey || entry.rkey
}

function dedupeList(values) {
  return [...new Set((values || []).filter(Boolean))]
}

function rotateUniqueOtherActors({
  actorAliases,
  excludedAlias,
  startIndex,
  count,
}) {
  const output = []
  for (
    let offset = 0;
    offset < actorAliases.length && output.length < count;
    offset += 1
  ) {
    const candidate = actorAliases[(startIndex + offset) % actorAliases.length]
    if (
      !candidate ||
      candidate === excludedAlias ||
      output.includes(candidate)
    ) {
      continue
    }
    output.push(candidate)
  }
  return output
}

function renderPrimaryPostText({actor, topic, index}) {
  const templates = [
    `En ${topic.community}, necesitamos ${topic.proposal}. ${topic.focus} no puede seguir sin seguimiento ciudadano.`,
    `Abro hilo corto: ${topic.focus} en ${topic.community}. Mi propuesta es ${topic.proposal} y publicar avances cada semana.`,
    `Estoy revisando comentarios sobre ${topic.focus} en ${topic.community}. Si no medimos impacto barrio por barrio, vamos tarde.`,
    `${actor.displayName} comparte una nota para ${topic.community}: ${topic.proposal}. Hace falta claridad antes de la siguiente votacion.`,
  ]
  return templates[index % templates.length]
}

function renderReplyPostText({topic, index}) {
  const templates = [
    `De acuerdo en parte, pero antes publiquemos costos abiertos y calendario por colonia sobre ${topic.focus}.`,
    `No compro el supuesto central. Para ${topic.community} falta evidencia comparable y metas trimestrales.`,
    `Si esto va a votacion, agreguemos una version piloto enfocada en ${topic.proposal}.`,
    `Buen punto, pero la comunidad necesita seguimiento publico sobre ${topic.focus} y responsables por etapa.`,
  ]
  return templates[index % templates.length]
}

function parseBoolEnv(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return fallback
}

function resolveProfileCredentialsPath(profile) {
  const profilePath = PROFILE_CREDENTIALS[profile]
  if (!profilePath) {
    throw new Error(
      `Unknown seed profile "${profile}". Available profiles: ${Object.keys(PROFILE_CREDENTIALS).join(', ')}`,
    )
  }
  return profilePath
}

function requiredValue(args, index, flag) {
  const value = args[index]
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`)
  }
  return value
}

async function loadJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

function assertManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Manifest must be a JSON object.')
  }
  if (!Array.isArray(manifest.actors) || manifest.actors.length === 0) {
    throw new Error('Manifest must include non-empty "actors".')
  }
  if (!Array.isArray(manifest.cabildeos) || manifest.cabildeos.length === 0) {
    throw new Error('Manifest must include non-empty "cabildeos".')
  }
}

function asObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function isMissingRecordError(err) {
  const msg = String(err?.message || err || '')
  if (msg.includes('RecordNotFound')) return true
  if (msg.includes('Could not locate record')) return true
  if (msg.includes('NotFound')) return true
  return false
}

const BULK_QUADRANTS = [
  'lib-left',
  'auth-left',
  'center-left',
  'center',
  'center-right',
  'lib-right',
  'auth-right',
]

const DEFAULT_SOCIAL_TOPICS = [
  {
    community: 'p/Jalisco',
    tag: 'agua',
    focus: 'el abasto de agua',
    proposal: 'un tablero publico de consumo y fugas',
  },
  {
    community: 'p/CDMX',
    tag: 'movilidad',
    focus: 'el tiempo de traslado',
    proposal: 'priorizar carriles de autobus y datos abiertos por linea',
  },
  {
    community: 'p/Oaxaca',
    tag: 'territorio',
    focus: 'la atencion de incidentes ambientales',
    proposal: 'abrir reportes verificables y seguimiento comunitario',
  },
  {
    community: 'p/NuevoLeon',
    tag: 'vivienda',
    focus: 'la vivienda cerca del empleo',
    proposal: 'mezclar renta protegida con densificacion bien regulada',
  },
]
