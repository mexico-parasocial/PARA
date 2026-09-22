import {app, com} from '@bsky/sdk/lexicons'

import {createParaClient} from './lib/para-client.mjs'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'
const PARA_COLLECTION = 'com.para.post'

async function main() {
  console.log('--- Verifying Para Privacy Features ---')

  // 1. Login
  let client
  try {
    client = await createParaClient({
      service: SERVICE,
      identifier: USER,
      password: PASS,
    })
    console.log(`✅ Logged in as ${USER}`)
  } catch (e) {
    console.error(
      '❌ Failed to login. Ensure PDS is running and credentials are correct.',
    )
    console.error(e)
    process.exit(1)
  }

  const did = client.assertDid
  const uniqueText = `Private Para Post ${Date.now()}`

  // 2. Create Private Post
  console.log(`\nCreating Private Post with text: "${uniqueText}"...`)
  let createdUri
  try {
    const res = await client.call(com.atproto.repo.createRecord, {
      repo: did,
      collection: PARA_COLLECTION,
      record: {
        text: uniqueText,
        createdAt: new Date().toISOString(),
        $type: PARA_COLLECTION,
      },
    })
    createdUri = res.uri
    console.log(`✅ Created post: ${createdUri}`)
  } catch (e) {
    console.error('❌ Failed to create private post.')
    console.error(e)
    process.exit(1)
  }

  // 3. Verify Isolation (Should NOT be in Bsky feed)
  console.log('\nChecking Public Bsky Feed (getAuthorFeed)...')
  try {
    const feed = await client.call(app.bsky.feed.getAuthorFeed, {actor: did})
    const found = feed.feed.find(item => {
      const record = item.post.record
      return record.text === uniqueText
    })

    if (found) {
      console.error('❌ FAILURE: Private post found in Public Feed!')
      console.error('URI:', found.post.uri)
      process.exit(1)
    } else {
      console.log('✅ Success: Private post NOT found in Public Feed.')
    }
  } catch (e) {
    console.error('❌ Error checking public feed', e)
  }

  // 4. Verify Presence in Para Collection (listRecords)
  console.log('\nChecking Private Para Collection (listRecords)...')
  try {
    const res = await client.call(com.atproto.repo.listRecords, {
      repo: did,
      collection: PARA_COLLECTION,
    })
    const found = res.records.find(r => r.value.text === uniqueText)
    if (found) {
      console.log('✅ Success: Post found in com.para.post collection.')
      console.log('URI:', found.uri)
    } else {
      console.error('❌ FAILURE: Private post NOT found in Para Collection!')
      console.error('(Created URI was:', createdUri, ')')
      process.exit(1)
    }
  } catch (e) {
    console.error('❌ Error checking private collection', e)
    process.exit(1)
  }

  console.log('\n--- Verification Complete: ALL TESTS PASSED ---')
}

main().catch(console.error)
