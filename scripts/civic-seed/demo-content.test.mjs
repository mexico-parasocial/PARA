import assert from 'node:assert/strict'
import {readFileSync, readdirSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import {test} from 'node:test'
import {Lexicons} from '../../../WatZappa/packages/dev-env/node_modules/@atproto/lexicon/dist/index.js'
import {seedDemoContent, validateContent} from './demo-content.mjs'

const fixtureUrl = new URL(
  '../../../WatZappa/packages/dev-env/assets/demo-content/content.json',
  import.meta.url,
)
const fixture = JSON.parse(readFileSync(fixtureUrl, 'utf8'))
const lexiconDir = fileURLToPath(
  new URL('../../../WatZappa/lexicons/', import.meta.url),
)
const lexicons = new Lexicons(
  readdirSync(lexiconDir, {recursive: true})
    .filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(readFileSync(path.join(lexiconDir, name), 'utf8'))),
)
const did = handle => `did:plc:${handle.split('.')[0]}`
const cid = 'bafyreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

function mockBackend(t, {emptyCommunities = false} = {}) {
  const records = new Map()
  const collections = []
  const contributions = []
  const boards = fixture.communityTrees.map((tree, i) => ({
    name: tree.community,
    communityId: `board-${i}`,
    uri: `at://${did('alice.test')}/com.para.community.board/board-${i}`,
  }))
  if (emptyCommunities) boards.splice(0)
  const graphs = new Map(
    boards.map(board => [board.uri, {nodes: [], edges: []}]),
  )
  const members = [
    ...new Set([
      'alice.test',
      ...fixture.communityTrees.flatMap(tree =>
        tree.cards.map(card => card.author),
      ),
    ]),
  ]
  const memberships = new Map(
    boards.map(board => [board.communityId, new Set(members.map(did))]),
  )
  let treeWrites = 0
  let failApproval = false
  t.mock.method(globalThis, 'fetch', async (url, options = {}) => {
    const request = new URL(url)
    const nsid = request.pathname.split('/xrpc/')[1]
    const body = options.body ? JSON.parse(options.body) : undefined
    const params = Object.fromEntries(request.searchParams)
    if (body && nsid !== 'com.atproto.repo.putRecord')
      lexicons.assertValidXrpcInput(nsid, body)
    const respond = value => new Response(JSON.stringify(value), {status: 200})
    switch (nsid) {
      case 'com.atproto.server.createSession':
        return respond({did: did(body.identifier), accessJwt: body.identifier})
      case 'com.atproto.repo.putRecord': {
        lexicons.assertValidRecord(body.collection, body.record)
        const uri = `at://${body.repo}/${body.collection}/${body.rkey}`
        records.set(uri, body.record)
        return respond({uri, cid})
      }
      case 'com.para.community.listBoards':
        return respond({boards})
      case 'com.para.community.listMembers':
        return respond({
          members: [...memberships.get(params.communityId)].map(actor => ({
            did: actor,
            membershipState: 'active',
          })),
        })
      case 'com.para.community.createBoard': {
        assert.equal(options.headers['atproto-proxy'], undefined)
        assert.ok(!boards.some(board => board.name === body.name))
        const communityId = `board-${boards.length}`
        const board = {
          ...body,
          communityId,
          uri: `at://${did('alice.test')}/com.para.community.board/${communityId}`,
        }
        boards.push(board)
        graphs.set(board.uri, {nodes: [], edges: []})
        memberships.set(communityId, new Set([did('alice.test')]))
        treeWrites++
        return respond({uri: board.uri, cid})
      }
      case 'com.para.community.getBoard': {
        const board = boards.find(board => board.uri === params.uri)
        assert.ok(board, 'getBoard must query by its real URI')
        return respond({board})
      }
      case 'com.para.community.join': {
        assert.equal(options.headers['atproto-proxy'], undefined)
        const board = boards.find(board => board.uri === body.communityUri)
        const actor = did(options.headers.authorization.slice('Bearer '.length))
        memberships.get(board.communityId).add(actor)
        treeWrites++
        return respond({membershipState: 'active'})
      }
      case 'com.para.collection.listCollections':
        return respond({collections})
      case 'com.para.collection.createCollection': {
        treeWrites++
        const id = `collection-${collections.length}`
        collections.push({...body, id, items: [], relations: []})
        return respond({id})
      }
      case 'com.para.collection.applyOps': {
        treeWrites++
        const collection = collections.find(entry => entry.id === body.id)
        for (const op of body.ops) {
          if (op.type === 'addItem') collection.items.push(op.item)
          else if (op.type === 'addRelation')
            collection.relations.push(op.relation)
          else assert.fail(`Unexpected op: ${op.type}`)
        }
        return respond({})
      }
      case 'com.para.community.getCivicTree':
        return respond(graphs.get(params.community))
      case 'com.para.community.civicTree.listContributions':
        return respond({
          contributions: contributions.filter(
            c => c.community_uri === params.community && c.status === 'pending',
          ),
        })
      case 'com.para.community.civicTree.submitContribution': {
        treeWrites++
        const contribution = {
          ...body,
          id: `contribution-${contributions.length}`,
          community_uri: body.communityUri,
          status: 'pending',
          votes: new Set(),
        }
        contributions.push(contribution)
        return respond({contribution})
      }
      case 'com.para.community.civicTree.voteContribution': {
        if (failApproval)
          return new Response(JSON.stringify({error: 'NotAMember'}), {
            status: 403,
          })
        treeWrites++
        const contribution = contributions.find(c => c.id === body.contribution)
        assert.notEqual(body.voterDid, contribution.authorDid)
        contribution.votes.add(body.voterDid)
        if (contribution.votes.size >= 3) {
          contribution.status = 'approved'
          contribution.approved_card_id = `card-${contribution.id}`
          graphs.get(contribution.communityUri).nodes.push({
            id: contribution.approved_card_id,
            title: contribution.title,
            card_type: contribution.sourceType,
          })
        }
        return respond({contribution})
      }
      case 'com.para.community.civicTree.createRelationship': {
        treeWrites++
        const graph = graphs.get(body.communityUri)
        assert.ok(graph.nodes.some(node => node.id === body.sourceCardId))
        assert.ok(graph.nodes.some(node => node.id === body.targetCardId))
        graph.edges.push({
          source: body.sourceCardId,
          target: body.targetCardId,
          relationship_type: body.relationshipType,
        })
        return respond({relationship: body})
      }
      default:
        assert.fail(`Unexpected request: ${nsid}`)
    }
  })
  return {
    records,
    collections,
    contributions,
    graphs,
    get treeWrites() {
      return treeWrites
    },
    failApprovals() {
      failApproval = true
    },
    resumeApprovals() {
      failApproval = false
    },
  }
}

test('both trees reference real records, preserve books and approve without self votes; reruns add nothing', async t => {
  const backend = mockBackend(t)
  const options = {service: 'http://seed.test', includeMemes: false}
  await seedDemoContent(options)
  assert.equal(backend.collections.length, 3)
  assert.equal(backend.records.size, 15)
  for (const record of backend.records.values()) {
    if (record.$type !== 'com.para.highlight.annotation') continue
    const subject = backend.records.get(record.subjectUri)
    assert.equal(subject.text.slice(record.start, record.end), record.text)
    assert.equal(record.subjectCid, cid)
  }
  for (const collection of backend.collections) {
    assert.ok(
      collection.items.some(
        item => item.kind === 'policy' && backend.records.has(item.policyUri),
      ),
    )
    assert.ok(
      collection.items.some(
        item =>
          item.kind === 'post' &&
          backend.records.get(item.sourceUri).postType === 'matter',
      ),
    )
    assert.ok(
      collection.items.some(
        item =>
          item.kind === 'evidence' &&
          item.description &&
          backend.records.has(item.sourceUri),
      ),
    )
    for (const item of collection.items) assert.equal(item.sourceRef, undefined)
  }
  const personalBook = backend.collections[0].items.find(
    item => item.kind === 'book',
  )
  assert.equal(personalBook.sourceLabel, 'Elinor Ostrom')
  assert.equal(personalBook.publishedYear, 1990)
  for (const contribution of backend.contributions) {
    assert.equal(contribution.status, 'approved')
    assert.equal(contribution.votes.size, 3)
    if (contribution.sourceType === 'book') {
      const metadata = JSON.parse(contribution.metadata)
      assert.ok(metadata.author)
      assert.ok(metadata.publishedYear)
    }
    if (contribution.sourceUri)
      assert.ok(backend.records.has(contribution.sourceUri))
  }
  for (const [i, graph] of [...backend.graphs.values()].entries()) {
    assert.equal(graph.nodes.length, fixture.communityTrees[i].cards.length)
    assert.equal(
      graph.edges.length,
      fixture.communityTrees[i].relationships.length,
    )
  }
  const writes = backend.treeWrites
  await seedDemoContent(options)
  assert.equal(backend.treeWrites, writes)
  assert.equal(backend.records.size, 15)
})

test('dry-run makes no network requests and validates references before writes', async t => {
  t.mock.method(globalThis, 'fetch', () =>
    assert.fail('Unexpected network request'),
  )
  await seedDemoContent({dryRun: true})
  const broken = structuredClone(fixture)
  broken.highlights[0].text = 'A quote absent from the source'
  assert.throws(() => validateContent(broken), /must quote its source/)
  broken.highlights = fixture.highlights
  broken.personalTree.collections[0].relations[0].to = 'missing-item'
  assert.throws(() => validateContent(broken), /Unknown item/)
})

test('failed approval is surfaced instead of skipped', async t => {
  const backend = mockBackend(t)
  backend.failApprovals()
  await assert.rejects(
    seedDemoContent({includeMemes: false}),
    /Approval .* failed: .*NotAMember/,
  )
  assert.equal(backend.contributions.length, 1)
  assert.equal(backend.contributions[0].status, 'pending')
  const pendingId = backend.contributions[0].id
  backend.resumeApprovals()
  await seedDemoContent({includeMemes: false})
  assert.equal(backend.contributions[0].id, pendingId)
  assert.equal(backend.contributions[0].status, 'approved')
  assert.equal(
    backend.contributions.length,
    fixture.communityTrees.reduce((n, tree) => n + tree.cards.length, 0),
  )
})

test('persistent startup provisions missing communities and memberships, then safely reuses them', async t => {
  const backend = mockBackend(t, {emptyCommunities: true})
  const accounts = new Map([
    [
      'alice.test',
      {handle: 'alice.test', did: did('alice.test'), token: 'alice.test'},
    ],
  ])
  let createdAccounts = 0
  let syncs = 0
  const options = {
    includeMemes: false,
    ensureCommunities: true,
    sync: async () => {
      syncs++
    },
    ensureSession: async handle => {
      if (!accounts.has(handle)) {
        accounts.set(handle, {handle, did: did(handle), token: handle})
        createdAccounts++
      }
      return accounts.get(handle)
    },
  }
  await seedDemoContent(options)
  assert.ok(createdAccounts > 0)
  assert.equal(backend.graphs.size, 2)
  assert.equal(backend.collections.length, 3)
  assert.ok(
    syncs >= 4,
    'boards and memberships must be indexed before contributions',
  )
  const writes = backend.treeWrites
  const created = createdAccounts
  await seedDemoContent(options)
  assert.equal(backend.treeWrites, writes)
  assert.equal(createdAccounts, created)
  assert.equal(backend.collections.length, 3)
})

test('persistent startup flag enables the civic-tree seed while the full seed is skipped', async () => {
  const {buildDevEnvRuntimeConfig} =
    await import('../../../WatZappa/packages/dev-env/src/config.ts')
  const config = buildDevEnvRuntimeConfig({
    DEV_ENV_SKIP_PARA_DEMO_SEED: '1',
    DEV_ENV_SEED_CIVIC_TREES_ON_START: '1',
  })
  assert.equal(config.skipParaDemoSeed, true)
  assert.equal(config.seedCivicTreesOnStart, true)
  assert.equal(buildDevEnvRuntimeConfig({}).seedCivicTreesOnStart, false)
})
