import {app} from '@bsky/sdk/lexicons'

// Relative import for tsx
import {MOCK_REPS} from '../src/lib/mock-representatives'
import {
  createParaAccountClient,
  createParaClient,
  type ParaLexClient,
} from './lib/para-client.mjs'

const SERVICE = 'http://localhost:2583'
const DEFAULT_PASSWORD = 'password'

type ProfileUpdate = (profile: Record<string, any>) => Record<string, any>

// Replacement for the old AtpAgent#upsertProfile: fetch the current profile
// record (if any), apply the update callback, and put it back at rkey 'self'.
async function upsertProfile(client: ParaLexClient, update: ProfileUpdate) {
  let current: Record<string, any> = {}
  try {
    const res = await client.get(app.bsky.actor.profile, {rkey: 'self'})
    current = res.value as Record<string, any>
  } catch {
    // No profile yet — start from scratch.
  }
  const updated = update(current)
  await client.put(app.bsky.actor.profile, {...updated} as any, {
    rkey: 'self',
  })
}

async function main() {
  console.log(`Connecting to ${SERVICE}...`)
  console.log(`Seeding ${MOCK_REPS.length} representative accounts...`)

  for (const rep of MOCK_REPS) {
    // 1. Create Account
    // Handle format: claudia-sheinbaum (cleanup dots/spaces) to avoid invalid chars if needed,
    // but MOCK_REPS handles are like 'claudia.sheinbaum', which is valid if domain is appended.
    // In local dev, usually handles are 'handle.test'.

    // We'll strip the @ if present and replace dots with dashes for valid handle
    const rawHandle = rep.handle.replace('@', '').replace(/\./g, '-')
    // For local dev, handles must end with .test
    const handle = `${rawHandle}.test`
    const email = `${rawHandle}@test.com`

    const profileUpdate: ProfileUpdate = profile => {
      const p = profile || {}
      p.displayName = rep.name
      p.description = `${rep.category} - ${rep.affiliate} (${rep.state})`
      return p
    }

    try {
      console.log(`Creating account: ${handle}...`)

      // Creates the account and returns an authenticated client for it.
      const accountClient = await createParaAccountClient({
        service: SERVICE,
        handle,
        email,
        password: DEFAULT_PASSWORD,
      })

      console.log(`  -> Created! DID: ${accountClient.assertDid}`)

      // 2. Set Profile
      // We can't easily upload images in this simple script without local file checking,
      // so we'll just set the display name and description.
      // Avatar color logic is client-side, but we could upload a placeholder if we had one.
      await upsertProfile(accountClient, profileUpdate)

      console.log(`  -> Profile updated for ${rep.name}`)
    } catch (e: any) {
      if (
        (e.message &&
          typeof e.message === 'string' &&
          e.message.includes('Handle already taken')) ||
        e.error === 'HandleDate'
      ) {
        console.log(`  -> Account ${handle} already exists. Skipping creation.`)
        // Potentially update profile even if exists, so login and retry.
        try {
          const userAgent = await createParaClient({
            service: SERVICE,
            identifier: handle,
            password: DEFAULT_PASSWORD,
          })
          await upsertProfile(userAgent, profileUpdate)
          console.log(`  -> Profile updated for existing user ${rep.name}`)
        } catch (loginErr: any) {
          console.log(
            `  -> Could not login to existing account: ${loginErr.message || loginErr}`,
          )
        }
      } else {
        console.error(`  -> Failed to create ${handle}:`, e.message || e)
      }
    }

    // throttle
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('Seeding complete!')
}

main().catch(console.error)
