import {BskyAgent, RichText} from '@atproto/api'

// We need to use relative imports because ts-node with paths can be tricky without extra config
// Assuming this script is run from project root: ts-node scripts/seed_highlights.ts
import {MOCK_HIGHLIGHTS} from '../src/lib/mock-highlights'

const SERVICE = process.env.HIGHLIGHT_SEED_SERVICE || 'http://localhost:2583'
// Default local dev credentials (replace if you have different ones)
const HANDLE = process.env.HIGHLIGHT_SEED_HANDLE || 'bob.test'
const PASSWORD = process.env.HIGHLIGHT_SEED_PASSWORD || 'hunter2'
const HIGHLIGHT_COLLECTION = 'com.para.highlight.annotation'

async function main() {
  const agent = new BskyAgent({service: SERVICE})

  console.log(`Connecting to ${SERVICE}...`)
  try {
    await agent.login({identifier: HANDLE, password: PASSWORD})
    console.log(`Logged in as ${HANDLE}`)
  } catch (e) {
    console.error(
      'Failed to login. Make sure your local PDS is running at http://localhost:2583 and you have the default "bob.test" account.',
    )
    console.error(e)
    process.exit(1)
  }

  console.log(
    `Seeding ${MOCK_HIGHLIGHTS.length} highlight posts + annotations...`,
  )

  for (const h of MOCK_HIGHLIGHTS) {
    // Construct a source post with hashtags so the post remains explorable in the app.
    const cleanState = h.state ? `#${h.state.replace(/\s+/g, '')}` : ''
    const cleanCommunity = `#${h.community.replace(/\s+/g, '')}`
    const fullText =
      `${h.postPreview || h.text}\n\n${cleanState} ${cleanCommunity}`.trim()

    const rt = new RichText({text: fullText})
    await rt.detectFacets(agent)

    try {
      const postRes = await agent.post({
        text: rt.text,
        facets: rt.facets,
        createdAt: new Date().toISOString(),
      })

      const start = fullText.indexOf(h.text)
      const safeStart = start >= 0 ? start : 0
      const safeEnd = start >= 0 ? start + h.text.length : h.text.length

      await agent.com.atproto.repo.createRecord({
        repo: agent.session!.did,
        collection: HIGHLIGHT_COLLECTION,
        record: {
          subjectUri: postRes.uri,
          subjectCid: postRes.cid,
          text: h.text,
          start: safeStart,
          end: safeEnd,
          color: h.color,
          community: h.community,
          state: h.state,
          party: h.party,
          visibility: 'public',
          createdAt: new Date().toISOString(),
        },
      })

      console.log(
        `Seeded highlight: ${h.text.substring(0, 32)}... -> ${postRes.uri}`,
      )
    } catch (e) {
      console.error(`Failed to seed highlight: ${h.text}`, e)
    }

    // Small delay to prevent rate limits or overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('Seeding complete!')
}

main().catch(console.error)
