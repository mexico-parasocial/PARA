import {BskyAgent} from '@atproto/api'

// Relative import for ts-node
import {MOCK_REPS} from '../src/lib/mock-representatives'

const SERVICE = 'http://localhost:2583'
const DEFAULT_PASSWORD = 'password'

async function main() {
  const agent = new BskyAgent({service: SERVICE})

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

    try {
      console.log(`Creating account: ${handle}...`)

      const {data: account} = await agent.createAccount({
        handle,
        email,
        password: DEFAULT_PASSWORD,
      })

      console.log(`  -> Created! DID: ${account.did}`)

      // 2. Login as new user to set profile
      const userAgent = new BskyAgent({service: SERVICE})
      await userAgent.login({identifier: handle, password: DEFAULT_PASSWORD})

      // 3. Set Profile
      // We can't easily upload images in this simple script without local file checking,
      // so we'll just set the display name and description.
      // Avatar color logic is client-side, but we could upload a placeholder if we had one.
      await userAgent.upsertProfile(profile => {
        const p: Record<string, any> = profile || {}
        p.displayName = rep.name
        p.description = `${rep.category} - ${rep.affiliate} (${rep.state})`
        return p
      })

      console.log(`  -> Profile updated for ${rep.name}`)
    } catch (e: any) {
      if (
        (e.message &&
          typeof e.message === 'string' &&
          e.message.includes('Handle already taken')) ||
        e.error === 'HandleDate'
      ) {
        console.log(`  -> Account ${handle} already exists. Skipping creation.`)
        // Potentially update profile even if exists?
        // We'd need to login.
        try {
          const userAgent = new BskyAgent({service: SERVICE})
          await userAgent.login({
            identifier: handle,
            password: DEFAULT_PASSWORD,
          })
          await userAgent.upsertProfile(profile => {
            const p: Record<string, any> = profile || {}
            p.displayName = rep.name
            p.description = `${rep.category} - ${rep.affiliate} (${rep.state})`
            return p
          })
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
