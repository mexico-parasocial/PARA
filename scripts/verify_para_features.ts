import {BskyAgent} from '@atproto/api'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'
const PARA_COLLECTION = 'com.para.post'

async function main() {
  console.log('--- Verifying Para Privacy Features ---')
  const agent = new BskyAgent({service: SERVICE})

  // 1. Login
  try {
    await agent.login({identifier: USER, password: PASS})
    console.log(`✅ Logged in as ${USER}`)
  } catch (e) {
    console.error(
      '❌ Failed to login. Ensure PDS is running and credentials are correct.',
    )
    console.error(e)
    process.exit(1)
  }

  const uniqueText = `Private Para Post ${Date.now()}`

  // 2. Create Private Post
  console.log(`\nCreating Private Post with text: "${uniqueText}"...`)
  try {
    const res = await agent.api.com.atproto.repo.createRecord({
      repo: agent.session!.did,
      collection: PARA_COLLECTION,
      record: {
        text: uniqueText,
        createdAt: new Date().toISOString(),
        $type: PARA_COLLECTION,
      },
    })
    console.log(`✅ Created post: ${res.data.uri}`)
  } catch (e) {
    console.error('❌ Failed to create private post.')
    console.error(e)
    process.exit(1)
  }

  // 3. Verify Isolation (Should NOT be in Bsky feed)
  console.log('\nChecking Public Bsky Feed (getAuthorFeed)...')
  try {
    const feed = await agent.getAuthorFeed({actor: agent.session!.did})
    const found = feed.data.feed.find(item => {
      const record = item.post.record as any
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
    const res = await agent.api.com.atproto.repo.listRecords({
      repo: agent.session!.did,
      collection: PARA_COLLECTION,
    })
    const found = res.data.records.find((r: any) => r.value.text === uniqueText)
    if (found) {
      console.log('✅ Success: Post found in com.para.post collection.')
      console.log('URI:', found.uri)
    } else {
      console.error('❌ FAILURE: Private post NOT found in Para Collection!')
      process.exit(1)
    }
  } catch (e) {
    console.error('❌ Error checking private collection', e)
    process.exit(1)
  }

  console.log('\n--- Verification Complete: ALL TESTS PASSED ---')
}

main().catch(console.error)
