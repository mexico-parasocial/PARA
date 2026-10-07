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
