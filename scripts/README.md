# Tool Scripts

## updateExtensions.sh

Updates the extensions in `/modules` with the current iOS/Android project changes.

## AT Protocol client helper (`lib/para-client.mjs`)

Shared login/client factory for the seed & verification utilities below. All
of these scripts were migrated off the removed `AtpAgent` package onto the lex
stack the app itself uses (`@atproto/lex` + `@atproto/lex-password-session`):

```js
import {createParaClient} from './lib/para-client.mjs'
const client = await createParaClient({service, identifier, password})
const body = await client.call(com.atproto.repo.createRecord, {...})
```

Notes:

- `client.call(ns, paramsOrBody)` resolves to the response BODY directly (the
  old agent resolved to `{data: body}`).
- `agent.session.did` becomes `client.assertDid` (or `client.did`).
- Lexicon schemas come from `@bsky/sdk/lexicons` (plain JS, usable from
  `.mjs` under plain node). Do NOT import `src/lexicons` from scripts: those
  generated TS files are CJS-format for tsx, and any graph that reaches the
  ESM-only `@atproto/lex` through them crashes under tsx with
  `ERR_PACKAGE_PATH_NOT_EXPORTED` (multiformats/cid).

## Local PDS seed & verification utilities

These target the local dev PDS at `http://localhost:2583` (alice.test /
bob.test). Runners:

- Plain node (`.mjs`): `reseed_public_posts`, `reseed_para_posts`,
  `verify_author_feed`, `ensure_follow_self`, `verify_para_features`,
  `publish_cabildeo_feeds`, `debug_feed`, `verify_para_api`,
  `test_validation`, `debug_pipeline`.
  ```bash
  node scripts/reseed_public_posts.mjs
  ```
- tsx (`.mts` — they import TS mock data from `src/lib/mock-*`):
  `seed_representatives`, `seed_highlights`.
  ```bash
  pnpm exec tsx scripts/seed_representatives.mts
  pnpm exec tsx scripts/seed_highlights.mts
  ```

## Civic Seed (Community Hub Demo)

Idempotent seed CLI for civic demo data (governance, cabildeos, positions, votes, delegations, open questions, badge-driving posts, PARA public-figure identity records, and optional verification records).

### Commands

Run from `/Users/mlv/Desktop/MASTER/PARA`:

```bash
pnpmseed:civic:apply --introspect-url http://127.0.0.1:2581
pnpmseed:civic:reset
pnpmseed:civic:test
```

For the local shared-demo stack, always include `--introspect-url http://127.0.0.1:2581` on `apply` so AppView catches up after the PDS writes.

If you are logged into the built-in dev moderator account `mod.test`, use the bundled dev-env profile so the civic seed maps its main moderator role onto that existing account:

```bash
pnpmseed:civic:apply --profile dev-env --introspect-url http://127.0.0.1:2581
```

That profile currently maps `mod_jalisco` to `mod.test`, which makes the civic demo feed and its notifications show up under the account you are already using.

### Targeting a different environment

```bash
node ./scripts/civic-seed/index.mjs apply --service https://your-pds-or-gateway
node ./scripts/civic-seed/index.mjs reset --service https://your-pds-or-gateway
```

You can also use a built-in profile:

```bash
node ./scripts/civic-seed/index.mjs apply --profile dev-env --introspect-url http://127.0.0.1:2581
```

### Credentials override file

Use `--credentials <path>` with a JSON file shaped like:

```json
{
  "service": "https://optional-service-override",
  "actors": {
    "mod_jalisco": {
      "identifier": "mod-jalisco.example",
      "password": "secret",
      "createAccount": false
    }
  }
}
```

This lets local dev use default `.test` accounts while shared demos can reuse pre-provisioned accounts.

### Public figure seed data

The civic manifest now supports two related concepts for seeded people:

- `actors[].identity`: writes a `com.para.identity` record in that actor's repo.
- `verificationRecords[]`: writes an `app.bsky.graph.verification` record from an issuer repo to a subject repo.

Current intended meaning:

- `com.para.identity` is PARA's product-level source of truth that the account is approved for `f/` public-figure treatment.
- `app.bsky.graph.verification` is the current AppView-visible verification path that the client already knows how to render.

Important limitation for local/dev demos:

- A verification record only shows up as a valid verification in profile responses when the issuer account is configured in backend/AppView as a trusted verifier.
- The seed includes `para_verifier_mx`, but that account still has to be promoted manually in backend data if you want seeded `f/` accounts to render as verified immediately in the client.

### Manual verification workflow for now

Current operational plan:

1. Approve a person manually off-platform.
2. Write or update their `com.para.identity` record with `isVerifiedPublicFigure: true`.
3. Use a trusted verifier account to issue `app.bsky.graph.verification` for the same subject.

This is the current bridge between PARA's public-figure model and the existing Bluesky-style verification UI.

### Future plan

For Mexico, the long-term plan is to replace manual review with a privacy-preserving verification flow based on:

- an Instituto Nacional Electoral credential check
- zero-knowledge proofs so the user can prove eligibility with their ID without revealing their full identity to PARA or to the public

When that ships, `com.para.identity` should remain the durable PARA-level authorization record, while the proof pipeline and verifier issuance become automated.
