# PARA Project: Agent & Developer Knowledge Base

This file serves as a high-fidelity "Brain" for future AI agents and human developers working on the PARA project. It tracks the core architecture, fundamental design decisions, and local environment quirks that aren't captured in the code comments alone.

---

## 🏛️ Project Architecture & DNA

PARA is a React Native mobile application built on the **AT Protocol (atproto)** architecture. It uses a custom lexicon layer (`com.para`) to extend or specialize its functionality.

### Core Stack

- **Framework:** React Native (Native/Web parity via `.web.tsx` files).
- **Styling (`Alf`):** A custom, atomic-based design system (`src/alf`). Components should use `atoms` (aliased as `a`) for layout and `useTheme` for semantic coloring.
- **Data Layer:** Lexicon-driven APIs. Types and definitions are located in `src/lib/api/para-lexicons.ts`.
- **Localization:** Managed via `@lingui/js`. Message files are located in `src/locale/locales/`.

---

## 🛠️ Local Development & Environment Quirks

### M8 login handoff (2026-10-05)

PARA's explicit DID-bound native/web login candidate is implemented; read
`docs/M8_LOGIN.md` and the canonical queue before re-auditing auth. The broker
must deploy its paired migration/configuration first. Web bearer tokens stay
in memory and reconnect after reload; native release storage requires
SecureStore. Local tests are not real-provider or staging acceptance.

### React Query Notes

- QV statistics must distinguish `BallotPrivacyUnavailable` / `FeatureNotEnabled`
  from retryable network failures and partition viewer-dependent caches by DID.
  Public delegation registration is not proof of effective electoral weight;
  never infer voting power from candidate delegation counts in the UI.

- **Persistence:** In Para, persisted React Query entries are still keyed off `PERSISTED_QUERY_ROOT` in [src/state/queries/index.ts](/Users/mlv/Desktop/Home/macserver/PARA/src/state/queries/index.ts). If a query should survive app restarts, its query key needs that root at index `0`, and it should usually pair with `PERSISTED_QUERY_GCTIME`.
- **Refresh behavior:** For paginated feeds and similar infinite queries, prefer `truncateAndInvalidate` from [src/state/queries/util.ts](/Users/mlv/Desktop/Home/macserver/PARA/src/state/queries/util.ts) over a bare `refetch()` when the goal is “reload from the top.” That trims cached pages back to the first page before invalidation so pull-to-refresh actually fetches fresh leading data.
- **Invalidation safety:** When a query key includes params, pass the full key shape during invalidation or truncation. Refresh bugs in feed surfaces often come from invalidating only the root feed descriptor while the live query also depends on `feedParams`.

### iOS Provisioning & App Clips

- **Issue:** The project includes an Apple App Clip target (`PARAAppClip`).
- **Personal Team Limitation:** Personal Apple Developer Teams (free accounts) do _not_ support the "App Clip" capability or the associated provisioning profiles.
- **Current Setup:** The `PARAAppClip` target has been manually removed from the Xcode project to allow local deployments to physical devices.
- **Future Reversion:** If building for production or a paid Enterprise/Organization team, restore the `PARAAppClip` target from `ios/PARA.xcodeproj/project.pbxproj` and ensure the `com.miguelabundis.para.AppClip` identifier is correctly provisioned.

### iOS Personal-Team Capability Restrictions (2026-06-02)

- **Issue:** `ios/PARA/PARA.entitlements` declared capabilities that even a paid
  personal Apple Developer team cannot provision:
  `aps-environment` (Push Notifications),
  `com.apple.developer.associated-domains` (Universal Links / App Clips),
  `com.apple.developer.kernel.extended-virtual-addressing`,
  `com.apple.developer.kernel.increased-memory-limit`, and
  `com.apple.developer.usernotifications.communication`.
- **Symptom:** Xcode fails to create a development provisioning profile with
  `Personal development teams, including "<name>", do not support the
  Communication Notifications, Extended Virtual Addressing, Push
  Notifications, and Associated Domains capabilities.`
- **Decision:** Split into two entitlements files. Debug builds use a stripped
  entitlements file; Release builds keep the full one for production.
  - `ios/PARA/PARA.dev.entitlements` — Debug only. Contains only
    `com.apple.security.application-groups` (the one capability safe for
    personal teams).
  - `ios/PARA/PARA.entitlements` — Release (unchanged). Full capabilities.
- **Xcode wiring:** Debug config (`13B07F941A680F5B00A75B9A`) at
  `ios/PARA.xcodeproj/project.pbxproj:659` now points to
  `PARA/PARA.dev.entitlements`. Release config at line 698 still points to
  `PARA/PARA.entitlements`.
- **Implications:** Debug builds lose push notifications, universal links, and
  the kernel extended-VA / increased-memory entitlements. Acceptable for local
  dev — the user is running the app on their own device, not shipping.

### iOS Bundle ID Rename (2026-06-02): `com.parasocial.app` → `com.para.app`

- **Decision:** Consolidated all bundle IDs and app groups to a single
  identifier prefix `com.para.app` (single app group `group.com.para.app`).
- **Reasoning:** The user had duplicate/stale identifiers across the PARA
  main target, BlueskyNSE, Share-with-Bluesky, and the App Clip extension.
  One identifier everywhere simplifies signing and the Apple Developer
  portal config.
- **Files updated:**
  - `ios/PARA.xcodeproj/project.pbxproj` — 6 `PRODUCT_BUNDLE_IDENTIFIER` lines
    (PARA / PARA.BlueskyNSE / PARA.Share-with-Bluesky × Debug/Release)
  - `ios/PARA/Info.plist` — `CFBundleURLSchemes` entry
  - `ios/PARA/PARA.entitlements` + `PARA.dev.entitlements` — app group
  - `ios/BlueskyNSE/BlueskyNSE.entitlements` — app group
  - `ios/Share-with-Bluesky/Share-with-Bluesky.entitlements` — app group
  - `ios/Share-with-Bluesky/ShareViewController.swift` — `containerURL`
  - `ios/BlueskyNSE/NotificationService.swift` — `APP_GROUP` constant
  - `app.config.js` — 4 `bundleIdentifier` + 3 `application-groups` + Android
    `package`
  - `plugins/shareExtension/*`, `plugins/notificationsExtension/*`,
    `plugins/starterPackAppClipExtension/*` — Expo config plugins
  - `google-services.json` (root + `android/app/`) — Android `package_name`
- **Build flag:** `package.json` `ios` script now passes
  `--allowProvisioningUpdates` to `xcodebuild` so automatic signing can
  create the App ID + app group on first build (instead of failing with
  "No profiles for ... were found").
- **Apple Developer Portal setup required:** Before the first build, make
  sure the team allows automatic signing. Xcode with the
  `-allowProvisioningUpdates` flag will register `com.para.app` and
  `group.com.para.app` automatically when the user is signed in with their
  Apple ID.

### Local PDS Connection (Networking)

- **Issue:** The app needs to connect to a local Personal Data Server (PDS) running on the development machine.
- **Problem:** Hardcoded IP addresses in `src/lib/constants.ts` can drift if the host machine's local IP changes.
- **Technical Note:** `LOCAL_DEV_SERVICE` for iOS is configured to `http://192.168.100.31:2583`. This must match the host machine's local IP for physical device connectivity.

### Java & macOS Build Requirements

- **JDK Version:** You **must** use Zulu 17. Ensure your `JAVA_HOME` points to exactly this path in your `.zshrc` or `.bashrc`:
  `export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home`
- **Apple Silicon (M1/M2/M3):** If building for RN 0.74+ for the first time on ARM, you may need to run:

  ```bash
  arch -arm64 brew install llvm
  sudo gem install ffi
  ```

---

### 2026-03-01: App Clip Target Removal

- **Decision:** Deleted `PARAAppClip` from Targets.
- **Reasoning:** Unblocks dev loop on physical hardware (see _iOS Provisioning_ section above).
- **Functionality Loss:** Temporary loss of native App Clip preview testing. Main app routing and business logic are unaffected.

---

## 📝 Future Agent Onboarding (Handover Notes)

If you are a new agent taking over this workspace:

0. **Read the current execution queue and evidence first:** `../WatZappa/docs/QUARTER_PLAN_2026Q4.md` is the canonical pilot plan (re-baselined 2026-10-05). The old September sprint calendar is superseded. Start with the next open item and inspect only relevant changes; do not repeat the whole code audit or rebuild completed OD-6/MAS/QVL/data paths. Distinguish implemented, tested, merged and deployed. On closure, remove the action from active roadmaps and retain commit/test/deployment evidence in the plan or a linked record. Private voting has separate governance gates.
   - **Map feature roadmap:** the in-repo map plan doc (`docs/MAP_QUARTER_PLAN_2027Q1.md`) was removed on 2026-09-21; map work (Dec 2026 – Feb 2027) remains deliberately outside the Q4 pilot plan until a new planning doc lands.
1. **Check the Lexicons:** Before modifying API calls, inspect `src/lib/api/para-lexicons.ts` to understand the data schema.
2. **Respect the Atoms:** Always use the `alf` design system. Do not write ad-hoc CSS/Styles unless absolutely necessary for custom animations.
3. **Check target files:** This codebase supports both Native and Web. When modifying a screen, check if a `.web.tsx` counterpart exists to maintain parity.

---

## 🚀 PARA DEMO RUNBOOK (Local Environment)

### Goal

Raise the full local demo with the current workspace split:

- **website**: docs / marketing site (SvelteKit)
- **PARA**: app client (Expo Web)
- **PARA/bskyweb**: browser-facing web demo server (Go)
- **watx**: backend stack (PLC, PDS, AppView)

### Terminal 1: WEBSITE

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/website
  pnpm install
  pnpm dev
  ```
- **Note**: The path is `/Users/mlv/Desktop/website` (verified).

### Terminal 2: PARA EXPO WEB CLIENT

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/Home/macserver/PARA
  pnpm install
  pnpm web
  ```

### Terminal 3: NGROK PDS TUNNEL

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  ngrok http --url=https://pds.paramx.social.ngrok.pro 2583
  ```

### Terminal 4: NGROK APPVIEW TUNNEL

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  ngrok http --url=https://appview.paramx.social.ngrok.pro 2584
  ```

### Terminal 5: WATX BACKEND

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/Home/macserver/WatZappa
  make nvm-setup
  make deps
  make build
  cp -n .env.shared-demo.example .env.shared-demo
  make run-dev-env-persistent
  ```
- **Important**:
  - This is the only backend launcher to use for the demo runbook.
  - Do not use `make run-dev-env` here.
  - This backend also exposes a local-only introspection server at `http://127.0.0.1:2581`.
  - If `.env.shared-demo` points to `pds.paramx.social.ngrok.pro` and `appview.paramx.social.ngrok.pro`, both ngrok terminals must already be running before `make run-dev-env-persistent`.
  - If the tunnels are not up first, dev-env bootstrap can fail with `XRPCError: fetch failed` and `UND_ERR_CONNECT_TIMEOUT` while creating the Ozone service profile.

### Seed Demo Data

- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/Home/macserver/PARA
  pnpm seed:civic:apply --introspect-url http://127.0.0.1:2581
  ```
- **Important**:
  - Use the introspection URL on `apply` so AppView catches up after the seed writes.
  - If this command fails, do not continue to the demo UI until AppView responds for `active-a.test`.
  - Expected failures (2026-09-30): the seed's `app.bsky.feed.repost` records are refused (PARA has no reposts), and every `com.para.civic.vote` is refused with "A valid cabildeo vote proof is required". Votes need an m8-issued nullifier and `eligibilityProofRef`, verified by `PARA_CIVIC_VOTE_VERIFIER_URL` (fail closed by design), so the seed cannot write them. Cabildeos and positions do seed; VS/Comparativas shows position stances but 0 votes until a real m8 verifier is wired up.
  - After the manifest, `apply` also runs `scripts/civic-seed/demo-content.mjs`
    (skip with `--skip-demo-content`; run alone with `pnpm seed:demo-content`).
    As the dev-env accounts it seeds eight image memes with threaded comments
    and up/down reactions, alice.test's personal civic tree, and the
    "Medio Ambiente y Clima" / "Movilidad Sostenible Norte" community trees
    (cards go through submit → three approvals → relationships). The shared fixtures and engine live in
    `../WatZappa/packages/dev-env/assets/demo-content/`; the full backend demo
    seed invokes the same engine automatically. Policy/matter posts and public
    highlights use stable record keys; personal collections and community cards
    include their real sources, books with author/year, and connections. Re-runs
    skip existing tree entries. The persistent launcher also runs the civic-tree seed before reporting ready,
    provisioning missing fixture accounts and demo communities with `SEED_PASSWORD`
    (default `para-test-pw`) and reusing existing accounts, memberships and tree entries.
  - The seeded cabildeos carry specific flairs (e.g. `||#EmpresaPublicaDeAgua`) so the six fields in `FLAIR_GROUPS` are exercised. Live thematic-board cabildeos from other seeders use board URIs in `community` and never match VS entities like `p/Jalisco`.

### Terminal 6: PARA BSKYWEB FRONTEND

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/Home/macserver/PARA/bskyweb
  go run ./cmd/bskyweb serve --appview-host https://appview.paramx.social.ngrok.pro --http-address :8100
  ```
- **Important**:
  - Do not send the AppView URL itself to demo users.
  - AppView is backend infrastructure, not the browser-facing client.
  - Use the `bskyweb` URL on port `8100` for browser demos.

### Startup Order

1. **Terminal 3** (ngrok PDS tunnel)
2. **Terminal 4** (ngrok AppView tunnel)
3. **Terminal 5** (watx backend, persistent)
4. **Terminal 6** (bskyweb frontend)
5. **Terminal 2** (Expo Web client)
6. **Terminal 1** (Website)

### Quick Smoke Check

1. Confirm both ngrok terminals are forwarding to `2583` and `2584`.
2. Confirm the backend prints:
   - `Main PDS https://pds.paramx.social.ngrok.pro`
   - `Bsky Appview https://appview.paramx.social.ngrok.pro`
   - `Dev-env introspection server http://127.0.0.1:2581`
3. Check health:
   ```bash
   curl http://localhost:2583/xrpc/_health
   curl http://localhost:2584/xrpc/_health
   curl https://pds.paramx.social.ngrok.pro/xrpc/_health
   curl https://appview.paramx.social.ngrok.pro/xrpc/_health
   ```
4. Confirm AppView sees seeded demo actors and posts:
   ```bash
   curl 'http://localhost:2584/xrpc/app.bsky.actor.getProfile?actor=active-a.test'
   curl 'http://localhost:2584/xrpc/app.bsky.feed.getAuthorFeed?actor=active-a.test&limit=3'
   ```
5. Open `http://localhost:8100` and verify Home/Base are not empty.
6. Only send the `bskyweb` URL to demo users, not the raw AppView URL.

---

## 🛠️ Node Version Management (WatZappa)

### The problem (2026-06-02)

`better-sqlite3` is a native module. It compiles a `.node` binary for the
exact Node version that was active at `pnpm install` time. If you run
`pnpm install` with Node 24, then run scripts with Node 22 (or vice
versa), the binary won't load and you get:

```
Error: The module '.../better_sqlite3.node' was compiled against a
different Node.js version using NODE_MODULE_VERSION 137. This version
of Node.js requires NODE_MODULE_VERSION 127.
```

### Current pinning

**The two repos are on different Node majors on purpose. Do not "align" them.**

| | `.nvmrc` | `engines.node` | `devEngines.runtime` | pnpm |
| --- | --- | --- | --- | --- |
| PARA | `24.18.0` | `>=24.18.0` | `^24.18.0`, `onFail: download` | `11.21.0` |
| WatZappa | `22` | `>=22` | `22.x`, **`onFail: error`** | `11.11.0` |

WatZappa's `22.x` with `onFail: error` means `pnpm` **refuses to run** there on
any other major — it is not a floor, it is a pin. PARA's `onFail: download`
fetches 24.18.0 instead of failing.

So "install with one version everywhere" is wrong for this workspace: each
subproject must be installed under the Node its own `.nvmrc` names, or
`better-sqlite3` is built for the wrong ABI.

### Safeguards in place (WatZappa/package.json)

- **`preinstall`** — bails out with a clear error if `node --version`
  is below 22. Run `nvm use` and retry.
- **`postinstall`** — runs `pnpm rebuild better-sqlite3` so the binary
  always matches the Node version that just ran the install, no matter
  what state `node_modules` was in before.

### The rule going forward

- **Always `cd` into the subproject before `pnpm install`.**
  The `load-nvmrc` hook in `~/.zshrc` will auto-switch to the version
  declared in that directory's `.nvmrc` — 24.18.0 in PARA, 22 in WatZappa.
  Don't run install from a parent directory — you'll build against the
  wrong Node.
- If you ever see the `NODE_MODULE_VERSION` mismatch again, the fix is:
  ```bash
  cd /Users/mlv/Desktop/Home/macserver/WatZappa
  nvm use
  pnpm rebuild better-sqlite3
  ```
  Don't `pnpm install --force` unless the rebuild fails — it's slower
  and you risk re-introducing other inconsistencies.

### Why WatZappa stays on 22 (checked against upstream, 2026-10-05)

Upstream `bluesky-social/atproto` at `61c915a4b`:

| | upstream/main | WatZappa |
| --- | --- | --- |
| `.nvmrc` | `24` | `22` |
| `engines.node` | `>=22` | `>=22` |
| `devEngines.runtime` | `>=22.12.0` (a floor) | `22.x` (pins the major) |
| packageManager | `pnpm@11.11.0` | `pnpm@11.11.0` |

So upstream's *floor* is 22.12 but it **develops on 24**; WatZappa narrowed
that to the 22 major. The runtime floor claim still matches upstream — the
`.nvmrc` and the `22.x` pin do not.

**What the 22 pin cost, and how it was paid:** the ozone jest suites could not
load at all. `packages/bsky` depends on `natural@8.1.1` (PARA's own addition for
`discourse-nlp.ts`, with `keyword-extractor` and `stopword` — none of the three
exist upstream), whose `SentimentAnalyzer` does `require('afinn-165')`, and
`afinn-165` is ESM-only. Plain Node handles that from 22.12 on; jest 30 cannot
before Node 24.9. Ozone's fixtures pull `@atproto/bsky` in through dev-env, so
every ozone suite paid for an import none of them used.

Fixed in WatZappa by loading `natural` on first use through `createRequire`
rather than at module top level — not by moving the repo to 24. Keep it lazy;
a plain top-level import there breaks the ozone suites again.

---

# PARA — AI Agent Notes

This file captures decisions, conventions, and rules that AI agents must follow
when working in this codebase. Update it whenever a significant architectural
decision is made.

---

## 2026-09-25: PARA has no reposts (keep it that way across upstream syncs)

- **Product decision:** a post is shared by quoting it or by highlighting part
  of its text. The post controls show the pencil `QuoteButton` (Highlight /
  Quote / Remove highlights), never Bluesky's `RepostButton`.
- **How it was lost:** the August 2026 SDK sync (`05cfb0bd2`) replaced
  `PostControls/index.tsx` with upstream's version, which put `RepostButton`
  back and dropped the highlight wiring. It also removed the up/down
  `RedditVoteButton` (still unrestored; `VoteButton.tsx` is unused).
- **Guard:** `src/lib/__tests__/no-reposts.test.ts` fails if repost screens,
  buttons or repost writes come back. When an upstream sync touches post
  controls, feeds or notifications, re-apply PARA's version instead of
  accepting upstream's.
- **Backend:** WatZappa refuses `app.bsky.feed.repost` on write (PDS) and on
  index (AppView) unless `PARA_REPOSTS_ENABLED=1`, and the
  `20260925T120000000Z-drop-para-reposts` migration removed the reposts
  already indexed. See `@atproto/common` `para-repost-policy.ts`.
- **Deliberately kept:** the protocol types (`reasonRepost`, `repostCount`,
  `feedViewPrefs.hideReposts`) and the feed-slicing logic in
  `lib/api/feed-manip.ts`. They describe atproto data, not PARA features, and
  removing them would only make upstream merges harder.

---

## 2026-08-29: Local dev networking + error-surface fixes

- **`EXPO_PUBLIC_LOCAL_DEV_IP` drift:** The dev machine's LAN IP is set in
  `PARA/.env.local` (`EXPO_PUBLIC_LOCAL_DEV_IP`, plus `EXPO_PUBLIC_M8_BROKER_URL`
  which uses the same IP). When the Mac's DHCP address changes, update both.
  `WatZappa/scripts/sync-local-dev-service.sh` auto-detects the IP and writes
  `PARA/.env` — but `.env.local` **overrides** `.env`, so its stale
  `EXPO_PUBLIC_LOCAL_DEV_IP` line silently defeats the script. Delete that line
  from `.env.local` if you want the script to manage it.
- **Metro caches env vars at transform time.** Editing `.env.local` does
  nothing until Metro is restarted with a cleared cache
  (`npx expo start --clear`). Verified by grepping the served bundle
  (`curl localhost:8081/index.bundle?platform=ios... | grep LOCAL_DEV_IP`).
  On the iOS simulator the PDS URL is `localhost:2583` (IP-independent), but
  `DEV_ENV_APPVIEW` in `src/lib/constants.ts` always uses
  `http://${LOCAL_DEV_IP}:2584`, so a stale IP breaks AppView calls even on
  the simulator.
- **"XRPCError: could not resolve proxy did" on sign-in (2026-09-23/24).** The
  app sends `atproto-proxy: <DEV_ENV_APPVIEW_DID>#bsky_appview` for local
  accounts; if the local PLC (`:2582`) has never registered that DID, the PDS
  (`packages/pds/src/pipethrough.ts`) rejects every proxied call. Current
  dev-env builds derive the AppView DID from the fixed dev `bsky` key +
  `localhost:2584`, giving `did:plc:6gcjjmsoeyaq4xgvkofdklqc` on every machine
  (the default in `src/lib/constants.ts`). Builds from before that fix minted
  a random DID per run (e.g. `did:plc:sbj4k…`), so a backend running a stale
  `dist/` produces a different DID. Always read the live value from `bsky.did`
  on `curl http://127.0.0.1:2581` and check it with
  `curl http://localhost:2582/<did>`. Git worktrees do not copy the untracked
  `.env.local`, so worktree builds use the code default.
  `../para-platform/scripts/doctor.sh` checks all of this.
- **Background/backgrounded-service queries must degrade gracefully.** Two
  known local-dev error sources were converted from red LogBox screens to
  `logger.warn`:
  - `useUnreadCountQuery` (matrix bridge on `:3001`) now returns
    `{unread: 0, communities: []}` when the bridge is unreachable. The bridge
    container (`para-matrix-bridge`) does not build currently — its Dockerfile
    fails compiling `@atproto/lex-data`; the rest of the matrix compose stack
    runs.
  - Global `QueryCache.onError` in `src/lib/react-query.tsx` now logs
    `MethodNotImplemented` (501) responses at warn level. The local watx
    AppView intentionally throws "Suggestions/Topics agent not available"
    because IRIS is not part of the dev stack.
- **Open Questions search fixed (2026-09-30):** Uses the compatibility
  `app.bsky.feed.searchPosts` endpoint (`q`, `sort: 'latest'`) so AppView
  selects the available search implementation without requiring the v2 gate.
- **Remaining local-dev red-screen source (not yet handled):** chat
  "Poll latest failed" 500s from the local AppView chat routes.

---

## 2026-07-13: pnpm 11.11.0 alignment and web dev build fix

- **pnpm version:** both repos declared `packageManager: "pnpm@11.11.0"` at the
  time, matching the upstream atproto workspace. **Superseded:** PARA moved to
  `pnpm@11.21.0` with the SDK 57 work (see the 2026-09-30 entry); WatZappa is
  still on 11.11.0, as upstream is. Run `corepack enable pnpm` so the corepack
  shim is used instead of any Homebrew/global pnpm binary.
- **PARA web dev build (`pnpm web`):** Webpack now stubs out
  `react-native/Libraries/Core/setUpReactDevTools.js` via a
  `NormalModuleReplacementPlugin`, because the real module imports a private
  `ReactDevToolsSettingsManager` path that does not exist in the installed
  `react-devtools-core` version. The dev server and `expo export:web --dev`
  compile successfully (with pre-existing non-fatal warnings).
- **PARA patch config:** Removed a stray duplicate `react-native` patch entry
  from `pnpm-workspace.yaml` so the workspace `patchedDependencies` matches
  `pnpm-lock.yaml` under pnpm 11.

---

## 2026-06-01: pnpm patch configuration (pnpm 11.11.0)

- **Decision:** Use pnpm-native `patchedDependencies` managed in
  `pnpm-workspace.yaml`.
- **Reasoning:** The repo uses pnpm 11.11.0 (mirroring the upstream atproto
  workspace). In pnpm 11 the `patchedDependencies` setting belongs in
  `pnpm-workspace.yaml`; the `pnpm.patchedDependencies` field in `package.json`
  is ignored. Patch filenames in this repo use the `package+version.patch`
  convention.
- **Changes made:**
  - Kept the 18 patch files using the `+` filename convention.
  - `patchedDependencies` block lives in `pnpm-workspace.yaml` (not
    `package.json`).
  - Removed a duplicate `react-native: patches/react-native.patch` entry so the
    workspace config matches the lockfile (`react-native@0.81.5`).
  - Three packages with `^`/`~` ranges are pinned via `overrides` in
    `pnpm-workspace.yaml` so their patches keep matching:
    - `expo-updates: 29.0.17` (was `~29.0.17`)
    - `react-native-drawer-layout: 4.2.3` (was `^4.2.3`)
    - `react-native-keyboard-controller: 1.21.8` (was `^1.21.8`)
  - `patch-package` is not used; pnpm-native patching runs automatically.
  - `scripts/apply-nested-patches.js` is still run from `postinstall` (handles
    nested deps like `dev-env/node_modules/@atproto/dev-env`).
- **Pre-existing issue:** `apply-nested-patches.js` warns about a missing
  `@atproto+dev-env+0.4.7.patch` — the installed dev-env version no longer
  matches the hard-coded patch name. This is a no-op (the script logs a warning
  and returns).

## 2026-06-02: Restored missing `src/components/Pills.tsx` (fixes QuoteEmbed crash)

- **Symptom:** React Native red box on iOS: "Element type is invalid:
  expected a string ... but got: undefined. Check the render method of
  `QuoteEmbed`." Component stack: `Embed` → `RecordEmbed` →
  `QuoteEmbed` → renders `PostAlerts` (when post has moderation alerts)
  → throws.
- **Root cause:** `src/components/moderation/PostAlerts.tsx:5` does
  `import * as Pills from '#/components/Pills'` and uses `<Pills.Row>`
  and `<Pills.Label>`. The `Pills` module did not exist in the PARA
  fork (it was dropped during a bsky-upstream sync). 11+ files import
  from `'#/components/Pills'`, all broken: `PostAlerts`, `ProfileCard`,
  `ProfileHoverCard`, `ProfileHeaderAlerts`,
  `ModerationDetailsDialog`, `ThreadItemPost`, `ThreadItemAnchor`,
  `ThreadItemTreePost`, `maybeApplyGalleryOffsetStyles`, `PostFeedItem`.
- **Fix:** Added `src/components/Pills.tsx` from bsky upstream
  `1.122.0`. Exports `Row`, `Label`, `FollowsYou`, `CommonProps`,
  `AppModerationCause`, `LabelProps`.
- **Lesson learned:** When the PARA fork diverges from bsky upstream, a
  missing file at a popular import path silently makes every consumer
  render `undefined`. The "Element type is invalid" error from React
  then points to whichever component happened to mount the broken
  child — not to the missing module. When debugging this class of
  error, always check that *every* import in the failing subtree
  resolves to a real file, not just the import at the top of the
  reported component.

## Political Compass Colors — CANONICAL SOURCE OF TRUTH

**File:** `src/lib/compass/compassColors.ts`

All political-compass position colors are defined **once** in this file.
No other file may hardcode compass colors. Every component, screen, and
feature must import from here.

### The 9 positions and their colors

These are the **classic pale palette** — the standard political compass colors.

| Position ID    | Camelcase key  | Hex       | Description        |
| -------------- | -------------- | --------- | ------------------ |
| `auth-left`    | `authLeft`     | `#efb9bb` | pale rose-red      |
| `auth-center`  | `authCenter`   | `#cda7d8` | pale purple        |
| `auth-right`   | `authRight`    | `#99d0ea` | pale blue          |
| `center-left`  | `centerLeft`   | `#d8d9be` | pale olive/tan     |
| `center`       | `centerCenter` | `#efe7d6` | pale cream/neutral |
| `center-right` | `centerRight`  | `#bfd7e8` | pale sky-blue      |
| `lib-left`     | `libLeft`      | `#c7e4c2` | pale green         |
| `lib-center`   | `libCenter`    | `#dfe498` | pale yellow-green  |
| `lib-right`    | `libRight`     | `#f6efb3` | pale yellow        |

### Grid layout (3 × 3)

```
          Left          Center        Right
Auth   auth-left    auth-center   auth-right
Ctr    center-left  center        center-right
Lib    lib-left     lib-center    lib-right
```

### Exports from `compassColors.ts`

| Export                        | Type                                | Use for                                                                                     |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `COMPASS_COLORS`              | `Record<CompassPositionId, string>` | Background color of any UI element for a position                                           |
| `COMPASS_LABEL_COLORS`        | `Record<CompassPositionId, string>` | Readable text color on top of that background                                               |
| `COMPASS_GRID_ROWS`           | `CompassPositionId[][]`             | Rendering a 3×3 grid in the correct order                                                   |
| `COMPASS_CROSS_GRADIENTS`     | `Partial<Record<...>>`              | Display-only gradients for the 4 edge/transitional cells (CompassMini, CompassScreen board) |
| `NINTH_NAME_TO_COMPASS_COLOR` | `Record<string, string>`            | Maps RAQ "ninth name" strings (e.g. "Auth Econocenter") to the correct color                |
| `COMPASS_POSITION_IDS`        | `readonly string[]`                 | Ordered list of all 9 position IDs                                                          |

### Rules

1. **NEVER hardcode a compass color** (`#efb9bb`, etc.) anywhere except in
   `compassColors.ts` itself.
2. `HIGHLIGHT_COLORS` in `highlightTypes.ts` maps camelCase keys to
   `COMPASS_COLORS` values — always solid strings, never gradient arrays.
3. `NINTHS_COLORS` in `RAQ/logic/scoring.ts` is re-exported from
   `NINTH_NAME_TO_COMPASS_COLOR` — do not override it with local values.
4. `CompassMini` renders gradients for the 4 edge cells using
   `COMPASS_CROSS_GRADIENTS`. These gradients are **display-only** and are
   derived from adjacent corner colors. Never store gradient arrays in
   data/state.
5. `CompassScreen`'s "Classic" palette is wired directly to `COMPASS_COLORS` /
   `COMPASS_LABEL_COLORS`. The "Bold" palette may keep its own colors since
   it is a separate theme option.

### How the "Econocenter" naming maps to position IDs

The RAQ quiz uses "Econocenter" terminology (economic center axis):

| RAQ name           | Compass position ID |
| ------------------ | ------------------- |
| Auth Econocenter   | `auth-center`       |
| Center Econocenter | `center`            |
| Lib Econocenter    | `lib-center`        |

---

## Module Aliases

The codebase uses `#/` as an alias for `src/`:

```
#/lib/compass/compassColors  →  src/lib/compass/compassColors.ts
#/state/highlights/...       →  src/state/highlights/...
#/components/...             →  src/components/...
```

---

## Highlight Feature

- **Types & color definitions:** `src/state/highlights/highlightTypes.ts`
- **Color picker UI:** `src/components/HighlightOptionsModal.tsx`
  - Renders as a **3 × 3 grid of solid-color squares** matching the compass layout
  - Row labels: Auth / Ctr / Lib | Column labels: Left / Ctr / Right
- **Inline text rendering (native):** `src/components/HighlightableRichText.tsx`
- **Inline text rendering (web):** `src/components/HighlightableRichText.web.tsx`

---

## Web Layout Standardization

### Center-Column Screens (Web)

Screens that display a centered content column on web must follow this consistent layout pattern:

```tsx
<Layout.Screen>
  <Header>...</Header>
  <Layout.Center style={styles.center}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* content */}
    </ScrollView>
  </Layout.Center>
</Layout.Screen>

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
```

**Rules:**
1. **`Layout.Center`** wraps the `ScrollView` and receives `flex: 1`.
2. **`ScrollView`** itself receives `flex: 1`.
3. **`contentContainerStyle`** must use `padding: 16` (horizontal + top) and `paddingBottom: 100` (clearance for FAB / bottom bar).
4. **Reference implementation:** `RepresentativesScreen` is the canonical example.
5. **Screens already standardized:** `RepresentativesScreen`, `MyBaseDashboard`, `MyAffiliationsScreen`.
6. **Rationale:** `WebCenterBorders` renders vertical divider lines at `width: 602px` centered. `padding: 16` ensures content doesn't butt up against these borders and matches native card spacing.


---

## Search Filters

The search screen supports two layers of filters:

1. **Upstream/advanced filters** (`author`, `mentions`, `domain`, `tag`, `since`, `until`, etc.) modeled in `src/screens/Search/searchParams.ts` and sent to `app.bsky.feed.searchPosts` (v1) or `app.bsky.feed.searchPostsV2` (v2) when `SearchV2Enable` is on.
2. **PARA-specific filters** (`postType`, `flairs`, `party`, `verifiedPublicFigure`, `state`, `districtKey`, `cabildeoPhase`, plus the array-based `tag`, `communityUris`, `cabildeoUris`, `politicalCompassPositions`) that route the query to `com.para.feed.searchPosts` as soon as any of them is active.

### Where to edit

- `src/screens/Search/searchParams.ts` — source of truth for route-param serialization. Use `searchFiltersToParaFilters()` and `paraFiltersToSearchFilters()` to convert between the string-based route representation and the structured `ParaSearchPostsFilters` type.
- `src/screens/Search/ParaSearchFiltersBar.tsx` — horizontal chip bar. It is controlled by `SearchFilters` and reports changes back through `onChange(filters: SearchFilters)`.
- `src/screens/Search/SearchResults.tsx` — derives `ParaSearchPostsFilters` from route `SearchFilters` and forwards them to `useParaSearchPostsQuery`.
- `src/view/shell/desktop/Search.tsx` — desktop header entry point for the advanced filter dialog.

### Routing / share links

All PARA filters are now encoded as route params so they survive URL/share links and search history:

- `tag` stays space-separated (upstream convention).
- All other list filters (`flairs`, `communityUris`, `cabildeoUris`, `politicalCompassPositions`) are comma-separated.
- `verifiedPublicFigure` is stored as the string `'true'`.

### Feature flags

- `SearchV2Enable` — toggles between Bluesky search v1 and structured v2 when no PARA filters are active.
- `AdvancedSearchV2Enable` — gates the advanced search dialog UI (currently wired alongside the PARA chip bar).

### After changing filters or strings

```bash
cd PARA
pnpm intl:extract
pnpm intl:compile
pnpm test src/screens/Search/__tests__/searchParams.test.ts
```

### Backend counterpart

`com.para.feed.searchPosts` lives in `WatZappa/packages/bsky/src/api/com/para/feed/searchPosts.ts` and the data-plane SQL in `WatZappa/packages/bsky/src/data-plane/server/routes/search.ts`. After any lexicon change, run `cd WatZappa && make codegen`.

## 2026-09-30: Community civic tree selection

- Profile entry must honor the exact `communityUri`, including on cached
  navigation screens and for non-members. Name-only lookup must match an exact
  normalized community identity, never an unrelated first search result;
  published versions of that identity remain accessible in the version chooser.
- The compact selector has mutually exclusive Official / Unofficial / Ninths
  lists. Ninths shows only the nine canonical compass positions; geographic
  board `quadrant` values do not identify political ninths.
- Official currently means the existing official-party catalog, not verified
  board ownership. The board lexicon has no official-status field.
- Ninth selection resolves a real backend board. Missing boards show an empty
  state; never synthesize a URI or silently retain the previous tree.
- The right-side workspace toggle uses `Earth_Stroke2_Corner0_Rounded` from
  `components/icons/Globe`, matching `assets/icons/earth_stroke2_corner0_rounded.svg`.

## 2026-09-30: Personal civic tree 2D map workspace

- `CivicTreeScreen` has labeled Collections / Tree / Interactive Map modes.
  Keep all three views. Interactive Map uses the Earth icon specified above and is the
  default and expands into the desktop right-column area. The focus-scoped
  claim in `src/state/shell/civic-tree-workspace.tsx` restores the sidebar when
  leaving the screen or changing modes; do not hide the sidebar by pathname
  alone or keep a claim from an unfocused cached screen.
- `src/features/personalCivicTree/map.ts` derives collection, data-type,
  information-size (saved item count), and six civic-field clusters without
  changing stored collections. Civic fields resolve from `FLAIR_GROUPS`
  metadata or an unambiguous directly connected topic. Unclassified or
  conflicting items stay Unassigned; do not infer a field from free text.
- `CivicTreeMap` uses authored relations only. Web pointer/wheel/keyboard and
  native pan/pinch interaction live in the paired `MapViewport` components.
  Keep node tap regions proportional to displayed nodes: fixed 44px targets
  overlap in zoomed-out maps and select the wrong item.

## 2026-09-30: Community civic tree workspace parity

- Community Civic Tree has Collections / Tree / Interactive Map views. The
  Tree view retains the argument outline toggle. Interactive Map expands
  into the desktop right-column area with the shared focus-scoped claim.
- Community Collections are read-only groups derived from topics and their
  authored connections, not private collection records. A card can appear in
  several collection lists. The map places it once under its first topic in
  stable ID order and preserves all visible authored links.
- Filters change visible cards and links while retaining topic membership and
  explicit civic metadata from the complete community graph. Civic fields use
  flairs/metadata or an unambiguous directly connected classified card; do not
  infer classification from titles or content.
- The community picker lists each normalized community name once. Same-named
  records remain separate: the Tree version chooser exposes their creator and
  record key, preserves exact profile URI selection, and never merges or deletes
  records. Name/ninth entry chooses the most joined, then newest matching tree.

## 2026-09-30: RAQ menu reliability

- Open Questions must keep genuine request failures distinct from successful
  empty results. Empty states invite real questions; never substitute sample
  authors, timestamps or reply counts. An error shows retry controls. Cards show actual reply counts, never invented
  vote scores or voting controls without a backing mutation.
- `RAQMenu` must mount `AddRAQDialog` for its Add / Propose New controls.
- The `react-native-drawer-layout@4.2.3` pnpm patch removes dependency arrays
  from both native drawer animated styles (source and compiled module).
  Reanimated 4.6 derives native dependencies from worklet closures; explicit
  arrays emit warnings. Keep web implementation dependencies unchanged.

## 2026-09-30: Lexicon generation while Metro is running

- `pnpm lexicons:generate` uses `scripts/generate-lexicons.mjs`. Generate into
  staging first, preserve unchanged files and watched directories, and replace
  changed files atomically. Do not restore `lex build --clear` on the live
  `src/lexicons` directory: install-time regeneration can otherwise make Metro
  fail to resolve generated `.defs` imports while the tree is deleted.

## 2026-09-30: SDK 57 patch maintenance

- Current tooling is Node `24.18.0` and pnpm `11.21.0`. Use
  `pnpm exec expo install --check`; `npx` invokes npm, which the repository's
  `devEngines.packageManager` rejects.
- Patched SDK packages are pinned to exact versions in `package.json`, with
  matching version keys and patch filenames in `pnpm-workspace.yaml`:
  Expo `57.0.26`, Haptics `57.0.3`, Media Library `57.0.5`, Modules Core
  `57.0.20`, Notifications `57.0.21`, Updates `57.0.24`, and React Native
  `0.86.3`. Rebase and verify each patch before upgrading its package; do not
  suppress unused-patch errors or discard application fixes to unblock installs.
- Modules Core `57.0.20` already includes the native Worklets `runSync`
  changes, and React Native `0.86.3` includes the font-weight correction.
  Their rebased patches omit those upstream fixes and retain the other hunks.
- Keep Reanimated `4.6.0` paired with Worklets `0.12.2`: Reanimated's
  compatibility manifest requires Worklets `0.12.x`. Both packages are
  overridden in the workspace and excluded from Expo dependency validation,
  whose default Worklets `0.10.x` recommendation targets Reanimated `4.5.x`.
- TypeScript uses the official `typescript@~6.0.3` package. The former
  `@typescript/typescript6` alias only publishes through `6.0.2` and cannot
  satisfy Expo's `~6.0.3` recommendation.

## Influence

- Account Settings, profile metrics, and Influence details share the viewer-keyed
  `useInfluenceQuery`. Scores come from `com.para.actor.getProfileStats`; do not
  use mocked profile fields or m8 Karma awards. Visibility lives in the PARA
  profile's `revealInfluence` field, defaults to false, and preserves other
  profile fields through `upsertProfile`.

## 2026-09-30: Meme votes and PARA post threads

- Memes are `com.para.post` records. Their up/down votes are public
  reactions: `com.para.civic.openQuestionVote` (-1/0/+1) in the voter's repo,
  one record per meme updated in place (`src/state/queries/para-meme-reactions.ts`).
  OD-7 §5h designates that collection as the public reaction whose count
  decides nothing. A signed reaction overrides a legacy like by the same voter.
- The meme score (`voteScore` from `getParaPostMeta`) is net public reactions
  computed in the WatZappa data-plane, mirroring `para-influence.ts`. The
  author's `postMeta.voteScore` is ignored: metadata never awards points.
- `usePostThread` must route `com.para.post` anchors to
  `com.para.feed.getPostThread`; Bluesky's thread endpoint returns
  `threadItemNotFound` for them ("post not found"). Replies to a
  `com.para.post` are written as `com.para.post`, and their parent/root are
  resolved from the PARA thread because `app.bsky.feed.getPosts` does not
  return PARA posts. The routing was lost in `e84864423`; keep it on SDK syncs.

## 2026-10-01: RAQ flows and questionnaire answer snapshots

- Official axis cards route to `AxisDetail`, not `CommunityRAQ`. Community RAQ
  queries and new proposals use the exact community identifier from the route.
- There is no standalone unofficial-axis catalog. Discovery groups real
  proposals by `targetAxis`, excludes canonical questionnaire axes, and labels
  them as proposed. Support reactions never establish official status.
- Proposal lists share the paginated, viewer-keyed `useProposedQuestions` hook.
  Creation and reactions invalidate both that cache and the legacy RAQ cache.
- `AnswerScale` is the questionnaire's explicit -3…+3 input on native and web.
  Keep it separate from public proposal support reactions. Only valid answers
  to current questionnaire IDs count toward progress; explicit zero counts.
- `RAQResults` receives the individual answer snapshot alongside calculated
  results. Never publish axis raw totals as question answers. When reopening
  local results, attach answers only if they still reproduce the saved result.
- My RAQ distinguishes on-device results from published alignment. Community
  alignment comes from the backend; do not invent matches, regional deltas,
  participation counts, or result dates from questionnaire progress.

## 2026-10-01: Books, book autocomplete and unique community names

- Books are not a record type. A community book is a civic-tree card or
  contribution with `card_type`/`source_type` `book`; the author and
  `publishedYear` live in its JSON `metadata` (`features/civicTree/books.ts`).
  A personal book is a `civicTreeItem` with `kind: 'book'`, the author in
  `sourceLabel` and `publishedYear` as a real field. Personal books never
  appear in Documents; only an explicit contribution reaches a community.
- Book autocomplete is `com.para.book.searchBooks`, an AppView endpoint that
  proxies Open Library (free, keyless; cached 10 min, 4 s timeout, signed-in
  viewers only). The app never calls Open Library directly, so a user's reading
  searches are not shared with a third party. It returns title, authors and
  first publication year only: no covers. Failures degrade to typing by hand.
  Set `PARA_BOOK_SEARCH_USER_AGENT` (with a contact) in production, as Open
  Library asks API users to identify themselves.
- The AppView registers `com.para.book.searchBooks` by hand
  (`api/com/para/book/schemas.ts`) because its generated registry is frozen.
- Community names are unique. PDS `createBoard` checks the creator's repo and
  the AppView index (`name-uniqueness.ts`) and refuses with `CommunityNameTaken`;
  the create screen checks as you type. It is check-then-write, so a race can
  still produce a duplicate. Pickers collapse same-named boards to one entry
  (`collapseCommunityTreeTwins`); the civic tree screen still lists every board.
- The personal civic tree has no "duplicates" relation, and collections have no
  "Duplicate" button.

## 2026-10-01: Community kinds, state `region`, and Cabildeos screen

- A board has no kind field. `quadrant` marks parties (`national` /
  `political`) and ninths (a compass id); `norte` / `sur` / `centro` are topic
  communities, not geography. `screens/Communities/communityGrouping.ts`
  classifies boards into party / ninth / state / other. My Communities shows
  only the saved party and ninth affiliations plus active geographic
  memberships grouped by state. Never infer a state from a name or description.
- Party and ninth choices in My Affiliations are independent. Updating or
  removing one must preserve the other; do not save a party's suggested ninth
  automatically or infer selection provenance from the presence of a party.
  My Communities reads these same saved affiliations, not a party's compass
  distribution.
- A saved party/ninth must remain visible in My Communities even if no matching
  board exists. Show its real affiliation with a community-unavailable message
  and an affiliation-management action; never invent a board URI or member
  count. The local demo currently has party boards but no ninth boards.
  `CompassMini` highlights only an explicit ninth/precision-grid selection;
  a party alone must not imply a selected ninth or default to the center.
- A community's Mexican state is the board record's optional `region`
  (lexicon `com.para.community.board`, set at `createBoard`, indexed into
  `para_community_board.region`, returned on `listBoards` / `getBoard`). It is
  not the governance `metadata.state`, which is a lifecycle value
  (`active` / `draft`) and feeds the board's `status`. Cabildeos already use
  `region` for the state, so the names match. Boards created before this have
  no region and list under Other until one is set.
- `listBoards` filters by `region` (exact match). The directory's state picker
  uses labels like "CDMX", so convert them with `findMexicanState`
  (`lib/constants/mexico.ts`) before filtering; the stored value is the
  `MEXICAN_STATES` spelling ("Ciudad de México"). The older `state` param
  filters governance lifecycle, not geography. WatZappa's dev-env seed
  (`dev-env/src/seed/para-demo.ts`) creates only five unofficial communities
  (three topic ones plus Vivienda Digna CDMX and Agua y Presas de Jalisco); the server lexicon directories
  `bsky/src/lexicon` and `pds/src/lexicon` are tracked and need `region` too.
- `normalizeBoard` in `state/queries/community-boards.ts` copies fields by
  hand: a new view field is dropped until it is added there.
- Cabildeos lives under Community activities → Social, with no standalone
  Ágora card. The dashboard's canonical path is
  `/community-directory/social/cabildeos`; `/agora/cabildeos` remains an alias
  for existing links. Its filters, trending shelf, regional shelf, party desk
  and creation flow remain in `screens/Cabildeos/CabildeosScreen.tsx`.
- CommunityDirectory's optional `category` route parameter preserves the
  Social / Financial selection when navigating or sharing links. The Social
  and All views link to the global Cabildeos dashboard. The activity explorer
  starts with filters and has no "THE COMMONS" banner or summary counters.
- Community Activities also preserves `communityUri` and `time` in its route.
  Use exact board URIs, a searchable community picker, and Upcoming / Past /
  Any time filters. Search covers the published title, description, location
  and community name. Terminal statuses remain past; undated records appear
  under Any time. Keep published data and request failures distinct.
- Uniform activity rows show actual dates, status and financial-plan values.
  The registration shortcut is available only for a selected community's
  entitled organizers (`useCommunityOrganizers`); All activities asks which
  category to register before entering the existing creation screen.

## 2026-10-01: Compact civic Tree workspace

- Both Tree and Interactive Map expand via the focus-scoped workspace hook on desktop. Tree uses compact cards grouped by authored personal collections or community topic connections; community Tree also retains Argument outline. Interactive Map is the spatial graph view; do not add a redundant Network layout to Tree.
- `features/civicTree/components/CivicTreeCards` shows actual relationships, respecting personal relation direction, in a selection inspector. Group headers express membership, never invented graph edges. Search and filters preserve community grouping from the complete graph. Selecting a connection follows its real endpoint; detail actions retain the existing edit, connect and community workflows.
- Tree card lanes scroll independently inside the viewport; the inspector moves below the lanes on narrow screens. Full personal card details open in a dialog. Keep the compact collection shelf from growing vertically.

## 2026-10-01: Web community card details

- `NodeDetailSheet.web.tsx` opens a centered desktop dialog with content and real connections beside a voting/details sidebar. The native renderer retains its sheet layout. Following a connection selects its actual endpoint; Escape restores focus to the originating card.
- Only policies use the horizontal -3…+3 position control. Other community cards reuse the post up/down arrows. `features/civicTree/cardVoting.ts` recognizes explicit policy types and JSON metadata `postType`/`kind: 'policy'`, including seeded article cards. Policy-themed topics and flairs do not make a card a policy.
- Vote and relationship mutations display pending/error feedback. Do not display an unsaved vote as persisted; the current AppView card voting routes are still planned endpoints.

## 2026-10-01: Community chat rooms have fixed purposes

- There are no custom chat groups. A community's rooms come from the bridge by
  `chamberMode`: unicameral gives only Sala principal; bicameral also gives
  Cámara A, Cámara B and Consejo observador. Names and purposes live in
  `lib/chat/roomPurposes.ts`.
- `chamberMode` is a board-record field, not a `createBoard` parameter. The dev
  seed sets it on the six official parties (Morena, PAN, PRI, PVEM, PT, MC) via
  the same record update that activates them; every other seeded board stays
  unicameral. Official parties, PRD and Independientes are always seeded; only
  five unofficial communities are, and cabildeos of dropped ones are re-homed
  (`rehome` in `para-demo.ts`).
- The Messages header button opens `CommunityChats` (`/community-chats`,
  `screens/Messages/CommunityChatsScreen.tsx`): joined communities grouped as
  Partidos / Novenos / Estados / Otras, each with its rooms by purpose and a
  "how to create a chat group" card. Chamber rooms are tappable only once the
  bridge reports them. The Messages list itself stays flat; a tabbed/grouped
  redesign and opening chats in the split-view pane were tried and rejected.
- The web community chat screen has a room rail and a members panel
  (`CommunityChatPanels.tsx`) fed by bridge REST and by `matrix-live-state`
  messages from the iframe (unread counts and presence only).

## 2026-10-04: Civic tree pieces shared by personal and community

- Shared code lives in `features/civicTree/`; `personalCivicTree/` and
  `communityCivicTree/` keep only what depends on their own data. Shared:
  `map.ts` (grouping choices, civic fields, `arrangeCivicMapClusters`, camera
  zoom), `components/MapViewport` (pan/zoom, native and web),
  `CivicTreeHeader`, `CivicTreeViewSwitch` (Collections / Tree / Interactive
  Map) and `CivicTreeFab`. Each tree still builds its own clusters and cards.
- `CivicTreeFab` is phone-only; wider layouts keep header buttons. One action
  runs directly; several open a labeled menu above the "+". Personal offers
  Item and Collection (Collection only while there are none). Community offers
  Add book (`AddBookDialog`; goes through community review). Both maps put
  their zoom controls bottom-left on phones to leave the corner free.
- The community tree no longer has Pulse or Obsidian-export buttons.
  `CommunityPulseSheet`, `useCommunityCivicTreePulseQuery` and
  `lib/civic-export/obsidian.ts` are now unused.

## 2026-10-03: Web chat logs in to the homeserver itself (OIDC), not through the bridge

- `POST /api/matrix-token` cannot serve this deployment and is not a bug to
  fix: MAS owns logins, so Synapse serves no `/login` at all (404
  `M_UNRECOGNIZED`, `m.login.application_service` included) and the bridge
  answers `503 MATRIX_CLIENT_LOGIN_REQUIRED`. Do not re-point web chat at it,
  and never let the bridge hand out an admin or appservice credential instead.
- Web obtains its own session through the homeserver's authorization-code flow
  in `features/encryptedChat/webOidc.ts` (discovery from
  `/_matrix/client/v1/auth_metadata`, dynamic client registration per MSC2966,
  PKCE). `lib/matrix/useMatrixWebSession.ts` replaces `useMatrixTokenQuery` on
  web. The bridge is not in this path and never sees the token.
- The MXID still comes from the bridge's `/api/matrix-identity`, which owns the
  DID↔MXID mapping. The OP's `sub` is its own subject identifier — not an MXID.
- The Matrix device id comes from the granted scope
  (`urn:matrix:org.matrix.msc2967.client:device:…`, MSC2967). The OP chooses it;
  a client that invents one attaches its crypto identity to a device the
  homeserver does not know. That real id is what gets attested to the bridge —
  `useChatBootstrap`'s install id is only a request.
- The OP redirects to `/matrix-auth`. `App.web.tsx` completes the grant there
  before the app renders, then navigates on; the router has no such route, and
  `bskyweb` needs the path registered or the redirect 404s before any app code
  runs.
- MAS access tokens are short-lived and its refresh tokens rotate. The host
  refreshes a restored session before building a client, and the iframe client
  refreshes itself through `tokenRefreshFunction`, reporting the new pair back
  as `matrix-token-refreshed` so the next page load does not replay a retired
  token.
- The web session lives in `localStorage`, so an XSS on this origin can steal a
  chat session — the same exposure as any browser Matrix client, and why native
  keeps its session in the OS keystore. Keep it to the chat session: no identity
  key, no ballot key.
- `lib/storage.ts` must never decide SecureStore is available from a successful
  `require`. On web the require succeeds and only the native binding is missing,
  so the first read throws `getValueWithKeyAsync is not a function`; web uses
  `lib/storage.web.ts` (AsyncStorage, i.e. `localStorage` — not secure storage)
  and native demotes to AsyncStorage on first failure.
