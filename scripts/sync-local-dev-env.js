// Keeps PARA/.env pointed at the dev Mac's current address and the dev-env's
// live service DIDs by delegating to WatZappa's sync-local-dev-service.sh.
// Wired ahead of `pnpm start` / `pnpm ios` / `pnpm android` / `pnpm web` in
// package.json. Skips (without failing the build) when the sibling WatZappa
// checkout is absent, e.g. in worktrees.
const {existsSync} = require('node:fs')
const {join} = require('node:path')
const {execFileSync} = require('node:child_process')

const script = join(
  __dirname,
  '..',
  '..',
  'WatZappa',
  'scripts',
  'sync-local-dev-service.sh',
)

if (existsSync(script)) {
  try {
    execFileSync('bash', [script], {stdio: 'inherit'})
  } catch (err) {
    console.warn(
      `[sync-local-dev-env] sync script failed; keeping previous .env (${err.message})`,
    )
  }
} else {
  console.log(
    '[sync-local-dev-env] WatZappa checkout not found; skipping local-dev env sync',
  )
}
