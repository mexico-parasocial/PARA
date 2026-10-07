# Matrix community chat: consolidated implementation plan

**Status snapshot: 2026-09-29.** This document consolidates the Matrix chat
requirements and decisions formerly split across the P7 estimate, P8 rollout
gates, UI verification, D2 encrypted-report decision, and recovery
implementation note in this directory,
plus the client/bridge contracts and test checklist in
`WatZappa/services/matrix-bridge/docs/`. The device acceptance run and its
open blockers stay in `MATRIX-CHAT-DEVICE-ACCEPTANCE-2026-09-26.md`.

It covers PARA community chat and its Matrix bridge. Bluesky DMs, external
solidarity accounts, institutional chat/handover, and the broader Messages-tab
redesign are adjacent proposals, not prerequisites for this community-chat
rollout. They are listed as out of scope below so they do not become accidental
gates.

## Outcome

Members can open their community rooms in PARA and Element, exchange messages
and media, recover access across devices, and understand room encryption
state. Moderators can report and review messages without copying encrypted
content out of Matrix. Membership, room access, unread state, and moderation
remain governed by verified PARA identity and community roles. Web and older
mobile clients have a defined path through an encryption transition.

## Current implementation and status

| Area | Implemented groundwork | Still needed |
| --- | --- | --- |
| Community provisioning and access | Bridge projects community spaces/rooms and membership/roles; verified join, room entitlement, demotion/removal, and device revocation paths exist. | Exercise the full lifecycle against the supported deployed configuration and confirm all existing rooms/configurations. |
| Authentication and identity | Native client authorization uses the homeserver authorization-code flow; bridge identity/session endpoints require verified proofs. Device sessions are stored and can be listed/revoked. | User-facing device management, clear separation of PARA sign-out, Matrix device revocation, and leaving a community; acceptance on real devices. |
| Native E2EE client | Rust SDK adapter and native room UI exist behind `EXPO_PUBLIC_CHAT_ENGINE=native`; timeline maps text/media/replies/reactions/edits/redactions/receipts/typing and undecryptable state. Recovery/key-management UI supports secure pending-key storage, recovery, backup synchronization, and actual SDK verification-state display. | SAS/QR device-verification UX; live multi-device recovery and decryption acceptance; evidence of cross-client behavior. UI implementation and unit tests do not close device acceptance. |
| Web client | Existing web chat is a generated HTML/iframe client using `matrix-js-sdk`; origin-checked messaging and authenticated media URL handling exist. | No crypto initialization. Build a supported encrypted web client (P7) or document and implement a user-visible read-only/upgrade policy before shared rooms are encrypted. |
| Reports and moderator review | D2 is decided: reports carry room/event IDs and a fixed reason; bridge resolves sender, stores no message text, groups reports, and hides reporter identities. PARA opens the event with the moderator's Matrix session and models redacted/undecryptable/access/history/error states. Moderators/owners are entitled to community rooms. | End-to-end device verification with separate member/moderator devices; moderator-facing explanation of historical access and removed-moderator limits. |
| UI, media, accessibility | Authenticated media client code and URL tests; localized strings; accessible labeled header controls; moderator-only risk indicator; compact civic context and per-community onboarding persistence. | Signed-in device acceptance: Element-uploaded image in PARA iOS/web; video/audio/file open/share/download; VoiceOver/TalkBack; before/after layout on iPhone SE and iPhone 15. Existing verification notes report the simulator could not reach chat due to an unrelated Agora bundle failure. |
| Live updates and unread | Bridge SSE (`/api/events`) and durable event log support exist; chat unread events are room-authorized and payloads contain no message content. Mark-read routes emit cross-device clears. | Confirm app-level SSE reconnect/resync and badge behavior on devices, including total Messages/bottom-bar counts and push/background wake behavior. |
| Operations and reliability | Bridge health/metrics, retryable ingestion, event log, database-driver support, and security boundaries are implemented. | Run the bridge checklist against isolated local/staging services and record evidence for health, sync recovery, access control, rate/backpressure, and deploy/rollback. |

### Encryption configuration is a release blocker

The bridge reads `MATRIX_ENABLE_ENCRYPTION`, and its default is `false`;
`WatZappa/services/matrix-bridge/README.md` also says E2EE is disabled. The
native client is opt-in and the web iframe has no crypto. Therefore do not
enable encryption for newly provisioned rooms or flip the app default as an
implicit part of this documentation task. Before any shared community room is
encrypted, settle and implement supported-client behavior and the transition
plan below. Existing plaintext history cannot be made encrypted retroactively.

## Product and security requirements

### Client and room behavior

- Preserve the `CommunityChat` route and its `communityUri`, `communityName`,
  `roomId`, and focused report event behavior so existing deep links and push
  taps continue to resolve.
- The native engine is the intended encrypted client. It must fail closed:
  show encryption as active only after opening the selected room and confirming
  its encryption state. Never silently downgrade to plaintext after a native
  engine or crypto error.
- Keep the WebView available only for rooms confirmed unencrypted while it is
  supported. Encrypted rooms need either a completed web crypto client or a
  clearly explained upgrade/read-only experience; do not strand web users in
  a blank/error state.
- Support timeline loading and pagination, send/receive text, image and file,
  reply, reaction, edit, redaction, read receipts, typing indicators, date
  separators, retrying decryption, and explicit pending/error states. Encrypted
  media is opened through the Matrix SDK. Bound attachment size and validate
  local file metadata.
- Authenticated media uses the authenticated Matrix client media endpoints and
  authorization headers, not bearer tokens in URLs. Preserve byte limits and
  native share-sheet/web-download behavior.
- Provide translated, accessible controls and status text. Verify screen-reader
  order, labels/hints, encryption disclosure, risk count, compact context, and
  layout at the agreed device sizes.

### Identity, sessions, keys, and privacy

- A Matrix device session is distinct from the PARA/M8 session and community
  membership. Use homeserver-native authorization-code login for new devices;
  never use an admin or appservice token as a user session.
- Keep access tokens, SDK objects, and crypto-store secrets out of UI props,
  generated HTML, logs, and bridge responses. Keep crypto stores scoped to the
  account/homeserver/device identity they belong to.
- Implement device verification (QR or emoji comparison, as supported by the
  SDK). Recovery setup, secure pending-key storage, acknowledgement, restore,
  wrong-key/error handling, and backup synchronization are implemented; verify
  the complete flow on devices. Explain what recovery protects and cannot
  restore. Ensure moderators can recover keys needed to read reports they were
  entitled to access.
- Provide device listing with friendly name/last seen and revocation. Revoking
  a device stops future access; it cannot erase plaintext or keys already
  copied to that device. Explain this distinction in moderator role guidance.
- Do not persist a DID↔MXID mapping or authorize from public `linkedChat`
  records. Keep identity derivation/proof-bearing endpoint rules in the bridge
  contract. Do not forward M8 tokens to external providers.

### Membership and governance

- Membership is pull-based and backed by a verified PARA membership/proof.
  Role projection determines room entitlement: moderators and owners need
  access to every community room for review; chamber and observer access follows
  the documented policy. Reconcile role changes and removals on verified
  interactions.
- Never trust client-supplied identity, `reportedDid`, public chat-link records,
  or a client-selected moderator DID without binding it to the authenticated
  caller and current authorization policy.
- Owner transfer remains unavailable until its dedicated acceptance/approval
  protocol and Matrix authority changes are implemented. Do not introduce
  ownerless-ID claiming.

### Unread, events, and notifications

- Use the bridge SSE contract for live event updates, with a persisted cursor,
  reconnect on token refresh/network loss, and `resync_required` recovery via
  unread and room-list refetch. The durable event log is the delivery source of
  truth.
- Compute total and per-community unread badges consistently across Messages,
  bottom bar, and room list; `mark-read` clears the current room and synchronizes
  the caller's other devices. The Matrix SDK remains authoritative for the
  decrypted timeline.
- Push payloads are metadata-only and contain no message preview or decrypted
  content. Push wakes/deep-links the app; the Matrix client loads the room.

### Moderation reports (D2 / F4)

- The reporter submits room ID, event ID, and an allowed reason. The bridge
  resolves the sender; clients do not submit report text or authoritative
  reported identity. Do not store excerpts or message text.
- The moderator queue groups reports by message and exposes aggregate counts
  and reasons, not reporter identities. Opening a report navigates to the event
  in the moderator's own room/client session.
- Show distinct states for loading, no access, event unavailable, redacted,
  undecryptable on this device, and readable. Never render an undecryptable
  event as an empty message.
- A moderator added after an encrypted message was sent cannot decrypt that
  earlier message merely by joining. Redaction may remove the evidence while
  report metadata remains. These limitations are accepted under D2 and must be
  stated in moderator guidance.
- Verify report → moderator opens/decrypts → message redacted → report shows
  redacted, across separate devices in a genuinely encrypted room.

## Room encryption migration

1. Prove native PARA ↔ Element behavior in a fresh encrypted internal test room.
2. Complete native device verification and recovery acceptance; verify media,
   replies, reactions, edits, receipts, typing, redactions, and report review.
3. Decide and deliver web/older-mobile behavior. Do not rely on an undocumented
   client upgrade assumption.
4. For a community transition, create an encrypted successor room; add
   moderators/owners before members and before any messages; then invite
   members. Make the former plaintext room read-only, label its history as
   unencrypted, and do not claim old content is encrypted.
5. Update PARA's room mapping only when supported clients can enter the
   successor. Test first with an internal community, then a staged cohort.
6. Document rollback that can restore routing/client behavior without
   downgrading or copying encrypted content into plaintext. Keep the old room
   available as read-only history according to retention policy.

## Completion gates

The native engine must remain opt-in and the bridge encryption default must
remain unchanged until each gate has recorded evidence:

1. **Session and device lifecycle:** new-device authorization, saved-session
   resume, device list/revoke, PARA sign-out vs Matrix revoke vs community leave.
2. **Crypto lifecycle:** implement SAS/QR device verification; verify
   key-backup/recovery on a new device, lost/wrong recovery-key handling, and
   confirmation that revoked devices receive no future room access. Recovery
   UI exists but has not passed live device acceptance.
3. **Interoperability:** PARA and Element exchange reaction, reply, edit, image,
   and file in both directions in an encrypted room; receipts and typing work.
4. **Moderation:** D2 report review and redaction flow on separate devices;
   verify ID-only report storage/response contract and explicit no-key states.
5. **Migration compatibility:** encrypted room works on every supported client
   or documented read-only/upgrade route is implemented; no silent downgrade.
6. **UI and accessibility:** signed-in iOS and web media checks, VoiceOver and
   TalkBack, and iPhone SE/iPhone 15 layout measurements/screenshots.
7. **Resilience/security:** SSE reconnect/resync and unread parity; bridge
   access, retry, health/metrics, privacy, and isolated deployment/rollback
   checks recorded.
8. **Rollout:** internal community, staged cohort, production plan, owner,
   monitoring, and rollback criteria documented. Change the engine default and
   encryption provisioning only in an explicit behavior-change release after
   all gates pass.

The P7 web-client effort was previously estimated at **15–25 engineering days
plus 3–5 days of device/browser QA**, with encrypted web interoperability called
out as the main uncertainty. Treat this as a planning estimate, not a committed
schedule; re-estimate after the interoperability spike.

## Immediate missing work, in order

1. Unblock signed-in device QA (the prior simulator attempt was blocked by an
   unrelated Agora import/bundle error), then capture the outstanding P1/P2/P5
   evidence.
2. Implement native SAS/QR verification and execute the recovery/backup drill
   on a second device; the recovery UI is already implemented.
3. Run the documented encrypted PARA ↔ Element feature matrix and the D2
   moderator flow against a live isolated homeserver; record results.
4. Decide P7: implement encrypted web support, or implement the explicit
   read-only/upgrade policy and older-client behavior.
5. Add moderator guidance covering late moderator access, recovery, redaction,
   and what device revocation cannot erase.
6. Verify SSE/unread behavior and run the bridge operational/security checklist
   in an isolated environment; retain evidence and rollback steps.
7. Only then approve a separate staged room-encryption and native-default
   rollout.

## Out of scope for this rollout

The broader Chats screen proposal includes Personal/solidarity DMs, external
Matrix account linking, institutional Work chat, ownership handover, and
Sortition/proposal surfaces. These are separate product tracks. In particular,
external identity linking remains blocked on proof of account ownership and
the external provider's client-login support; institutional handover needs its
own protocol. Neither should delay community-room E2EE acceptance unless the
product scope is deliberately expanded.

## Source documents consolidated

- `MATRIX-CHAT-P7-WEB-CLIENT-ESTIMATE-2026-09-23.md`
- `MATRIX-CHAT-P8-ROLLOUT-GATES-2026-09-23.md`
- `MATRIX-CHAT-UI-VERIFICATION-2026-09-23.md`
- `MATRIX-D2-ENCRYPTED-REPORTS-DECISION-2026-09-23.md`
- `MATRIX-CHAT-RECOVERY-2026-09-26.md`
- `WatZappa/services/matrix-bridge/docs/CLIENT_INTEGRATION.md`
- `WatZappa/services/matrix-bridge/docs/CHATS_SCREEN_REDESIGN.md`
- `WatZappa/services/matrix-bridge/TEST_CHECKLIST.md`
- `WatZappa/services/matrix-bridge/README.md` and `AGENTS.md`

The superseded dated planning and verification files have been removed from
the current docs directory; their contents remain recoverable from version
history. Update this document when implementation status changes. The dated
Matrix operations, security, backup, and local-acceptance runbooks in WatZappa
remain separate service-level references.
