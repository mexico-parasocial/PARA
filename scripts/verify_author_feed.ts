import {BskyAgent} from '@atproto/api'

const SERVICE = 'http://localhost:2583'
const USER = 'alice.test'
const PASS = 'hunter2'

async function main() {
  const agent = new BskyAgent({service: SERVICE})

  try {
    await agent.login({identifier: USER, password: PASS})
    const did = agent.session!.did
    console.log(`✅ Logged in as ${USER} (${did})`)

    console.log('--- Fetching Author Feed ---')
    const {data} = await agent.getAuthorFeed({actor: did, limit: 10})

    console.log(`Found ${data.feed.length} items in Author Feed.`)

    data.feed.forEach((item, i) => {
      const record = item.post.record as any
      console.log(`[${i}] ${record.text} (Type: ${record.$type})`)
    })

    if (data.feed.length === 0) {
      console.log('⚠️ Feed is empty! Checking rawRepo...')
      const {data: repoData} = await agent.api.com.atproto.repo.listRecords({
        repo: did,
        collection: 'app.bsky.feed.post',
        limit: 5,
      })
      console.log(
        `Raw Repo 'app.bsky.feed.post' count: ${repoData.records.length}`,
      )
      repoData.records.forEach((r: any) => console.log(`- ${r.value.text}`))
    }
  } catch (e) {
    console.error('Failed to fetch feed:', e)
  }
}

main()
