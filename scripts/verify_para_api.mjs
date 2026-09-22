import {app, com} from '@bsky/sdk/lexicons'

import {createParaClient} from './lib/para-client.mjs'

const SERVICE = 'http://localhost:2583'
const PARA_POST_COLLECTION = 'com.para.post'

async function main() {
  const client = await createParaClient({
    service: SERVICE,
    identifier: 'alice.test',
    password: 'hunter2',
  }).catch(e => {
    console.error('Failed to login', e)
    process.exit(1)
  })

  const did = client.assertDid
  console.log('✅ Logged in as alice.test')

  console.log('--- Fetching Para Feed ---')
  try {
    // Mirrors src/lib/api/feed/para.ts (ParaFeedAPI): list com.para.post
    // records newest-first, then hydrate each one into a bsky-shaped feed
    // item (aliasing $type + defaulting langs).
    // NOTE: ParaFeedAPI itself cannot be imported from scripts — its import
    // chain (`#/lib/constants`) pulls in react-native, which doesn't load
    // outside Metro.
    const res = await client.call(com.atproto.repo.listRecords, {
      repo: did,
      collection: PARA_POST_COLLECTION,
      limit: 10,
      cursor: undefined,
      reverse: true, // Newest first
    })

    const feed = res.records.map(record => {
      const val = JSON.parse(JSON.stringify(record.value))
      // HACK: Alias com.para.post to app.bsky.feed.post to pass client-side validation
      // The UI handles rendering, but the feed slicer enforces strict types.
      if (val.$type === PARA_POST_COLLECTION) {
        val.$type = 'app.bsky.feed.post'
      }
      // Ensure langs exists for validation/filtering
      if (!val.langs || !Array.isArray(val.langs)) {
        val.langs = ['en']
      }
      return {
        uri: record.uri,
        cid: record.cid,
        record: val,
      }
    })

    console.log(`Result: ${feed.length} items`)

    feed.forEach((item, i) => {
      console.log(`Item ${i + 1}:`)
      console.log(`  URI: ${item.uri}`)
      const record = item.record
      console.log(`  $type: ${record.$type}`)
      console.log(`  langs: ${JSON.stringify(record.langs)}`)
      console.log(`  text: ${record.text}`)

      // Also verify validation
      const val = app.bsky.feed.post.$safeValidate(record)
      console.log(`  Validation: ${val.success ? '✅ Pass' : '❌ Fail'}`)
      if (!val.success) console.error(val.reason)
    })
  } catch (e) {
    console.error('API Fetch threw error:', e)
  }
}

main()
