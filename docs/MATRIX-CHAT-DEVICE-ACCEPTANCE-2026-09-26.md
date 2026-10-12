# Native Matrix device acceptance — 2026-09-26

## Status: incomplete

The environment and two iOS installations are prepared. No recovery key was
created, restored or approved during this run. No reported message was read
on a second authorized device. These are still required acceptance results.

## Reproducible build

- Source: PARA `6d342b975`, isolated branch `chat/recovery-device-acceptance`
  in `/Users/mlv/Desktop/Home/macserver/PARA-chat-acceptance`.
- Local Node 24.18.0, pnpm 11.21.0, Xcode 27.0, iOS 26.5. Installed dependencies
  were copied from the main checkout into an independent directory; this is
  not evidence of a fresh frozen-lockfile installation.
- Generated lexicons and the native iOS project through the package scripts.
  Copied the existing ignored `google-services.json` required by Expo's
  development manifest. No main-checkout source changes were included.
- `pnpm ios --device 'PARA Recovery A' --no-bundler` completed with **Build
  Succeeded**. Expo's formatter also reported two intermediate command errors
  and two warnings; the final native build and installation succeeded.
- The same `com.para.app` binary was installed on both independent simulators:

  | Simulator | UDID |
  | --- | --- |
  | PARA Recovery A, iPhone 17 Pro | `6696FAD8-21B5-4B1C-9227-366A2FD94735` |
  | PARA Recovery B, iPhone 17 | `994D5CAE-09BA-4D6B-89FA-67D5F501D3B4` |

- Metro runs from the isolated checkout on `http://localhost:8081`.
  `.env.local` opts into `EXPO_PUBLIC_CHAT_ENGINE=native` and uses loopback
  endpoints for PDS, broker and bridge. The development manifest returned 200;
  the iOS JavaScript bundle compiled successfully. Installation, launch and
  bundling do not establish that the full chat UI passed a device test.
- Binary:
  `/Users/mlv/Library/Developer/Xcode/DerivedData/PARA-aqpiyibhussxylaktmhvkekyfgqn/Build/Products/Debug-iphonesimulator/PARA.app`.

## Automated checks

- 37 tests in the seven focused recovery, reported-message, account-session,
  Matrix client and timeline suites passed.
- iOS, Android and web typechecks passed in this isolated checkout.
- WatZappa's 30 focused report/retention/projection tests passed.
- The new sync-log regression passed against SQLite and PostgreSQL. The full
  bridge run passed 231 of 232 tests; one existing PostgreSQL replay test hit
  its 5-second timeout while the native build was running. A focused rerun
  of replay and sync-log tests, one worker and a 30-second test timeout,
  passed all four cases in 1.93 seconds total. Test timeout settings in source
  were not changed.
- Bridge build, typecheck and focused ESLint checks passed.

## Local service findings

See WatZappa `docs/MATRIX-LOCAL-ACCEPTANCE-2026-09-26.md` for the fixes to
Element's local proxy, MAS's public IdP URL and sync-log retry fields, plus
the cursor reset and port conflict. The bridge's stale advertised homeserver
was changed to `http://localhost:8008` for this simulator run. The existing
PDS process and fixture accounts were preserved when restarting bridge
supervision.

The final synthetic community is
`at://did:plc:ojdr3xwwixadijm4rqt72cvd/com.para.community.board/3mwfrslsoxq2i`.
Its room `!wLxCNKMEDPDIjavmsa:matrix.para.social` has Megolm encryption enabled.
Three governance memberships exist; verified Matrix joins remain pending.
Private login details are in `/tmp/para-chat-acceptance/fixture-logins.txt`.

## Blocks before device acceptance

- The automation surface rejects Simulator and times out when selecting
  Device Hub. Native screen interactions require an operator for this run.
- iM8 must approve identity proofs using a test identity. No private identity
  key was requested or substituted with an administrator/device token.
- Element now reaches the actual IdP page **Sign in with PARA**, but the
  sign-in was not completed. Static inspection found no handler for its
  `para://idp-login` link in this PARA revision. `authorizeInBrowser` currently
  expects only the final `para://matrix-auth` callback. Complete and test the
  IdP approval/return integration before treating sign-in as functional.
- Static inspection also found no native caller attesting the SDK's actual
  device ID after OIDC. Wire that step before claiming report attribution and
  device revocation work. An installation UUID is not a MAS device ID.
- The fixture owner has moderation powers; revocation of a moderator-only
  role requires a separate governance fixture. Do not remove the owner as a
  substitute for this scenario.

## Acceptance ledger

All rows below require real authorized clients. Automated checks above are
supporting evidence only and do not change these statuses.

| Scenario | Status | Evidence still required |
| --- | --- | --- |
| Create recovery and persist the pending key after restart | Blocked: native authorization | Pending key survives restart; acknowledgement clears only the pending copy; backup completes. |
| Establish B's state before restoration | Blocked: native authorization | Fresh device, other key-sharing devices offline, target event undecryptable before entering the key. |
| Restore history and review the reported event | Blocked: native authorization | Same event decrypts after recovery; record SDK verification separately. |
| Submit and group member reports | Blocked: no authorized member device | Two reports for the same event are grouped, reason retained, event opens; request and stored row contain IDs/reason without message text. |
| Deny members and revoke moderator access | Blocked: device access and moderator-only fixture | Ordinary members cannot access risk badges or queue; former moderator's future requests are denied after role removal. |
| Wrong key, offline, account switch and redaction | Blocked: recovery/report fixture | Comprehensible errors, existing backup preserved, no prior account's keys/content displayed, redacted event no longer rendered. |

## Operator continuation

1. Open **PARA Recovery A** in Device Hub/Simulator. If the dev launcher asks
   for a server, use `http://localhost:8081`. Sign in to the local test PDS with
   the fixture moderator account and connect its test iM8 identity.
2. Open the fixture community's chat and approve its identity/join requests
   in iM8. Record any failure before moving on. Finish the IdP-return and
   actual-device attestation gaps above, then verify room membership.
3. In **Claves y dispositivo**, create recovery, close/reopen the app, verify
   the pending key with **Mostrar clave**, save it privately, select
   **Ya guardé mi clave**, then **Sincronizar respaldo de claves**. Record
   completion without photographing or copying the key into evidence.
4. Join the fixture members and send synthetic messages only after the
   moderator has room access. Report a message by IDs and reason.
5. Shut down A, close Element if it holds the moderator's session, and keep
   every other device capable of sharing the target keys offline. Sign the
   same moderator into fresh B. Establish the
   missing-key state before entering the saved recovery key. If keys arrive
   automatically, record that path and repeat with a clean device.
6. Restore on B and verify the reported event, actual SDK verification status,
   wrong-key handling, offline handling, account isolation and redaction.
   Compare Element with the same account/room. Then exercise ordinary-member
   access denial and moderator-only revocation using the separate fixture.
7. Record each result as passed, failed or blocked, with sanitized evidence.
   Do not include recovery keys, tokens or real message contents.

For each failure scenario, start from the restored fixture and change one
condition at a time: submit an incorrect recovery key and then the correct
one; temporarily disconnect the test Mac and reconnect before synchronizing;
switch to a member account and verify no moderator key or timeline is shown;
redact the synthetic event from an authorized room client and refresh its
moderation review. Perform role removal with an owner account distinct from
the moderator being tested, then retry the former moderator's queue and badge
requests. Record access denials, not just a hidden menu. A previously decrypted
message in that device's local store is not evidence of failed future-access
revocation.

`CHAT_ENGINE` remains `webview` by default. SAS/QR, web encryption, room
migration and production rollout remain outside this acceptance run.


## 2026-10-08 — messaging implementation and acceptance update

**Messaging is not release-ready.** This extends the September record; it does
not turn its blocked device scenarios into passes. The user reports that their
iPhone is unavailable. VLPDS, its fork, relay and dashboard remain deferred.
The native engine remains opt-in, and room mappings were not migrated.

### Revisions and evidence

These are local, uncommitted working trees, including other existing edits:

| Repository | Base revision |
| --- | --- |
| PARA | `d00c7e514f25c9cb9b1ab749408f65f8f1cf031f` |
| WatZappa | `a22dad51467247f922a8b624c12ca2c35e0c4607` |
| mubEZ | `2003f6f14076418e44849cfbd04e1ab0fbf0ec32` |

The exact selected source/dependency/test file hashes are in
`../../messaging-acceptance-2026-10-08/source-manifest.json` (307 files).
Manifest SHA-256:
`a54655122f40ef2453175bcdbae02844658d95feb20a6ebc77e61d29f10dbfb5`.
Sanitized or synthetic test evidence is saved alongside it; logs are mode 0600.
This identifies local source, not merged or deployed revisions.

### Implemented locally

- Native IdP approval supports the `para-idp` audience, validates the configured
  issuer and challenge, calls the existing verification endpoint and resumes
  MAS before `para://matrix-auth`. Intent routing preserves auth callbacks.
  Portable cancellation/deadline helpers support React Native's AbortSignal.
- The native and web clients attest the actual SDK/granted device after new
  login and restoration. Proofs and async state are guarded against account
  changes. Native SDK session callbacks synchronously persist rotated access
  and refresh tokens to the scoped keychain and refuse late post-logout writes.
- Room/room-list states distinguish authentication, permission, provisioning,
  connection and empty results. Account-dependent query keys, bootstrap state,
  sessions and crypto stores are scoped; stale refreshes cannot resurrect a
  cleared web session. Explicit chat logout is exposed in both clients.
- PARA web initializes the SDK's Rust crypto before sync and encrypted sends,
  refuses plaintext rooms, uses account/device-scoped encrypted stores and
  self-hosted WASM, and supports encrypted media, replies, edits and recovery.
  Pending recovery keys are encrypted with the device store key until explicit
  acknowledgement, survive reload, and hide on backgrounding. Native chat adds
  older-history pagination and editing through the SDK.
- Both client paths expose explicit self-device SAS comparison. Symbol match
  is a user action; completion comes from the SDK. Existing native recovery
  and report review remain SDK-based. Reports retain IDs and fixed reasons;
  no message plaintext is added to bridge reports.
- Push registration uses Expo push tokens, including on the actual native SDK
  pusher. Gateway provider outages return retryable errors, invalid tokens are
  returned as rejected, unread updates avoid message alerts, and provider
  responses have decoded size limits. These follow the
  [Matrix gateway contract](https://spec.matrix.org/v1.16/push-gateway-api/) and
  [Expo delivery guidance](https://docs.expo.dev/push-notifications/sending-notifications/).

### Automated and local results

| Check | Result | Scope / evidence |
| --- | --- | --- |
| Focused PARA chat regressions | Passed | 80 tests / 16 suites in `para-chat-focused-final.log`: proofs, account changes, bridge refresh, recovery, media bounds, generated client syntax, session/query behavior and explicit SAS panel approval. |
| Native session persistence | Passed | 3 additional tests in `para-chat-native-session-final.log`: rotated pair, wrong account/device refusal, late save after logout. |
| Browser crypto fixture | Passed | `node scripts/check-local-chat-crypto-browser.cjs`: 10 true checks for real SDK/WASM initialization, media round trip/tamper rejection, scoped wrapping keys, crypto reopen after reload, encrypted pending recovery copy/reload/wrong-key rejection/acknowledgement. No real homeserver login, message exchange or backup history restoration is established by this fixture. |
| SDK bundle | Passed | `pnpm build:chat-bundle`; Matrix JS SDK 41.8.0, crypto WASM 18.5.0, self-hosted assets. |
| PARA changed chat source lint | Passed | Scoped oxlint; `para-chat-lint-final.log`. |
| iOS full typecheck | Failed | 22 diagnostics outside the changed chat/notification files; `para-chat-ios-final.log`. No changed chat file diagnostic, but this is not a passing platform build. |
| Web full typecheck | Failed | 19 diagnostics outside changed chat/notification files; `para-chat-web-final.log`. Full web export/Go server deployment was not verified. |
| Bridge build and typecheck | Passed | `bridge-chat-build-final.log`, `bridge-chat-typecheck-final.log`. |
| SQLite + PostgreSQL bridge regressions | Passed | 378 tests / 33 files; `pnpm test:postgres --configLoader runner`. Includes shared moderation work already present in this checkout. Disposable fixture only. |
| Matrix appservice smoke | Passed | Existing isolated Synapse ingestion/SSE/dedup smoke; `bridge-chat-smoke.log`. This is not a user-device E2EE acceptance run. |
| M8 signing and typecheck | Passed | 6 integration cases including the IdP audience; isolated server on 9876. `m8-chat-tests.log`, `m8-chat-check.log`. |
| Direct-message backend regression | Passed | Existing `dm-smoke.mjs` with two newly created, task-owned synthetic accounts: availability/request admission, messages in both directions, unread/read markers, logs/cursor and fresh-login history. `para-chat-dm-smoke-fixture.log`. Existing accounts were retained; credentials remain private in `/tmp/para-chat-dm-qa-EnODjh`. Does not cover app navigation, notifications or server restart persistence. |
| Direct-message Jest placeholder suite | Not acceptance evidence | Its 28 cases are TODOs; no executed assertions. |

### Remaining acceptance and implementation gates

| Scenario | Status / next evidence |
| --- | --- |
| Restore the actual local bridge on 3001 | Blocked. The active PDS is a disposable demo with in-memory service/PLC state; the persistent launcher build fails on 73 existing Ozone diagnostics. See the WatZappa local acceptance update. Do not stop the demo or combine its data/cursor with the old persistent profile. |
| Real iPhone + browser authorization, join, encrypted text/media | Blocked: no working iPhone, bridge down, current Matrix/IdP advertisements and published ports are loopback-only. Need a consistent working platform, reachable issuer/URLs and signed client. |
| SAS, recovery on a fresh device and Element interoperability | Blocked: actual authorized clients. Demonstrate missing-history state before recovery, recovery using the saved key, incorrect-key handling, and explicit SDK verification. Test supported edits/replies/reactions/pagination/typing/receipts. |
| Expired sessions, cancellation, app restart and account switching | Partial automation only. Test actual MAS/M8 refresh and cancellation on clients, SDK auth-error/reauthorization behavior, offline recovery and logout. Integration of overall app logout with all saved Matrix devices still needs a decision/implementation and acceptance; explicit chat logout alone is not that integration. |
| Ordinary-member denial and moderator revocation | Blocked on a separately authorized moderator-only governance fixture; backend tests do not prove future encrypted-room access removal on clients. |
| Background notifications and DM navigation | Blocked on properly signed client/device. Provider ticket handling is implemented; durable Expo receipt monitoring and push-event duplicate suppression remain implementation work. An Expo ticket is not device delivery. |
| Legacy plaintext release | Not performed. Prepare/test encrypted successor rooms and clearly labeled read-only history; keep mappings unchanged until iOS and PARA web acceptance passes. Mapping cutover/rollback and an explicit upgrade requirement for older mobile builds remain work. |
| Operations | Open. Alert rules exist but are not wired/delivery-tested. Current backup/restore scripts omit the complete MAS/IdP/operator unit and need correction plus an isolated restore drill. Off-host backup, deployment health and rollback evidence are absent. |

Resolve the platform build/data-unit blocker first. Then run the existing
acceptance fixture with supported clients when the iPhone is available and
record deployed revisions and each passed/failed/blocked result. Do not enable
the native engine by default, migrate room mappings or start VLPDS while these
messaging gates remain open.


## 2026-10-08 (later) — build blockers cleared; launch decision pending

Messaging is still **not release-ready**. This records source and build repairs
only; no device scenario above changed status, and the persistent launcher was
**not run**.

### What changed in the environment

- The Mac restarted (uptime ~3.5 h at 12:57). The in-memory demo described
  above is gone: PLC/service keys and the temporary SQLite/PostgreSQL state did
  not survive. `.dev-env-data/backups/demo-messaging-2026-10-08` in WatZappa is
  now the only copy of those 26 accounts' repos and keys. It is still marked
  `completeRestoreUnit: false` (no blobs, PostgreSQL binding, service/rotation
  keys or restore test). Do not delete or prune it.
- Port 3001 remains without a listener.

### Build repairs (uncommitted, in the working trees)

| Area | Before | After |
| --- | --- | --- |
| WatZappa `packages/ozone` typecheck | 64 diagnostics at the start of this pass (the earlier record says 73) | 0 |
| `packages/dev-env`, `packages/pds`, `packages/bsky` builds (the launcher's own compile steps) | dev-env failed | all exit 0 |
| `services/matrix-bridge` build | not re-checked | exit 0 |
| PARA iOS / Android / web typecheck | 22 / not run / 19 | 0 / 0 / 0 |

WatZappa causes and fixes:

- Stale generated code: ozone lexicons (`pnpm codegen:lex`), `bsky_pb.ts` and
  `bsky_connect.ts` (`buf generate ./proto` with the package-local `buf`), and
  the `@atproto/api` client (`pnpm run codegen:lex`, then rebuilt). The generated
  files differ from HEAD because the lexicon/proto sources do.
- `ozone/src/inbox/notification.ts` renamed to `notifications.ts`; eight
  importers, three of them tests, already used the plural name.
- `ozone/src/video-invalidator.ts` added verbatim from upstream commit
  `4dba11136`, which `mod-service/index.ts` already imported. **Its wiring in
  `context.ts` / `index.ts` is still absent**, so the invalidator is never
  constructed.
- `api/communication/listReports.ts` moved to `api/inbox/` (it registers
  `tools.ozone.inbox.listReports`, and `api/index.ts` imports it from there).
- Three string-only guards in `mod-service` now narrow `unknown` first.
- `report/views.ts`: removed 20 reads of `ReportStat` columns that do not exist
  (`closedCount`, `acknowledgedCount`, `labelActionCount`, `tagActionCount`,
  `takedownActionCount`, `aht*`, `resolution*`, `avgResolutionTimeSec`). The
  lexicon declares those fields but nothing computes them, as at HEAD. If they
  are wanted, they need columns, a migration and `stats.ts` computation.

PARA fixes (all in files the 2026-10-07 `update PARA to 1.134` commit left
half-synced): `isXrpcError` added to `lib/xrpc-error.ts`; `compressImage` callers
pass `POST_IMAGE_COMPRESSION` (4000 px, `POST_IMG_MAX.size`, the former
behaviour); `restoreDefaultChannel` in Settings; `PostMeta` gained `linkDisabled`
(author and timestamp render as plain text inside the quote link);
`HandleSuggestions` rebuilt on `@bsky.app/sift` (**the old fade-in animation is
gone**); `KnownLikers` spacing via `outerStyle`; `GrowthBook` context name;
`isPARAOwnedFeed` in `feed/custom.ts`; `useAnalytics` in `FeedPage`;
`fingerprint?: string[]` in logger `Metadata`; a malformed DID in a session test.

### Verification actually run

- PARA: 30 suites / 255 tests across strings, api, logger, session, gallery,
  Newskie and ReportDialog; 14 suites / 82 tests for the Matrix/chat client
  paths. Scoped oxlint reports no errors (existing warnings remain).
- Ozone, run alone: report-stats, stats-computer, inbox-report-reads,
  inbox-notification-routes/-producers/-start, inbox-seen, report-close-reports
  and moderation-events passed (91 tests).
- A first full ozone run with default workers produced mass 60 s hook timeouts
  while the Mac was at load average ~19; that run is not evidence either way.

### Launch is blocked on a decision, not on code

`scripts/dev-env-persistent.sh` brings up `db` on host port **5434** and `redis`
on **6381** (`packages/dev-infra/docker-compose.yaml`). The Ápice containers
`apice-postgres` and `apice-redis` currently hold both. Starting the launcher
needs one of: stop those two containers, or move the dev-infra ports. The
launcher would then use the **September** persistent profile in
`.dev-env-data` (directory timestamps Sep 28 for pds, Sep 20 for plc), not the lost demo; whether
to start from that profile, or from the rescue snapshot, has not been decided.
Dedicated AppView authority credential provisioning is also still required.

All other open gates in the table above are unchanged.
