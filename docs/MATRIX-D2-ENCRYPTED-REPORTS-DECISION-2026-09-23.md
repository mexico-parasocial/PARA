# D2 - reviewing reports from encrypted community rooms

## Resolution, 2026-09-25

The user asked to reuse the new moderator screens and delegated resolving the
conflict between attaching decrypted text (September 23) and reading the
original event in the moderator's client (September 24).

The selected rule is **review in the moderator's own Matrix client**. A report
contains the community, room ID, event ID and a reason from a fixed list.
It does not contain an excerpt, plaintext attachment, screenshot or room keys.
The bridge validates membership and resolves the event's sender; it does not
decrypt the event. The moderator queue groups reports and shows counts and
reasons without identifying reporters.

This replaces the plaintext-attachment proposal. There is no silent fallback to
copying text when decryption fails. The purpose of the earlier proposal was to
make the reported message available for review; the new screens provide that
review through the moderator's existing room access.

## What the screens do

1. A member selects **Reportar** on a sent message and chooses a reason. The
   dialog explains that moderation reads the original in the room.
2. **Reportes recientes** in the community moderator dashboard shows grouped
   reports. **Ver mensaje** opens the specified room and event.
3. The native engine uses the moderator's device keys. The WebView can show an
   unencrypted event, but explicitly cannot decrypt an encrypted event.
4. The review distinguishes content, redaction, missing keys, lack of access,
   missing history and a retryable error. Inability to read is not proof that a
   message was harmless or that a report was false; it needs another capable
   device or key recovery before a content-based decision.
5. Review content is local screen state, never the shared query cache. Changing
   the reader, session or event hides old content and ignores late requests.
   Native timeline updates and a 15-second recheck update the displayed state;
   closing the card stops the recheck. This is not instantaneous revocation of
   information a moderator already read.

## Limits that remain visible

- Redaction or retention can make evidence unavailable. The report metadata
  remains, but it cannot reconstruct deleted text. Moderation must not present
  a missing message as reviewed. A durable evidence archive would be a separate
  product and retention decision, not part of D2.
- A moderator's role does not grant decryption keys automatically. In the
  bridge's pull membership model, moderators/owners enter their entitled rooms
  at a verified join or role projection. CD-M1 provides no DID-to-MXID lookup
  that could invite an unknown device in advance. Do not promise access to
  earlier messages; verify actual key availability on that device.
- Removing a moderator removes future room access through role projection.
  Previously decrypted messages and keys may remain on their device; removal
  cannot erase what they already learned.
- New moderator devices need key backup, recovery and verification. The native
  recovery UI and actual SDK verification status are implemented as of
  2026-09-26; real-device acceptance remains open. See
  `MATRIX-CHAT-RECOVERY-2026-09-26.md`.

## Implementation and rollout

The Matrix report dialog, queue and event review from `PARA-report` (commits
`34593be6d`, `738f7aba5`, `1fcaba1af`) are integrated into PARA. The existing
bridge already implements message resolution, grouped queues and moderator
room placement (`e26583dc6`, `222ec3d04`, `e0ba832a2`). No report schema change is
needed. The new general ModerationInbox screens concern account/post reports;
Matrix uses its community dashboard and room review.

`CHAT_ENGINE` stays `webview` until P8's device, key recovery and web migration
gates pass. Unit tests and type checks cannot replace an encrypted-room test
with two members and a moderator on a separate device: report, open, decrypt,
redact, verify the changed review state, then test a device without keys and a
removed moderator. See `MATRIX-CHAT-P8-ROLLOUT-GATES-2026-09-23.md`.

## Verification, 2026-09-25

- PARA: 21 focused Jest tests pass for report state classification, request
  authentication, report actions, timeline mapping, reader/session isolation,
  late-response rejection, account changes and redaction refresh.
- WatZappa: 30 focused tests pass for message report resolution, retention and
  moderator room projection.
- iOS, Android and web type checks currently fail on unrelated workspace
  changes (including the missing general ModerationInbox `SubjectPreview` and
  API/media signature changes); none of the reported diagnostics names the
  Matrix files changed here. No successful full-app build is claimed.
- Global lint also reports existing errors outside this change; it reports no
  diagnostics in the changed Matrix files.
- Live device decryption, key recovery and moderator removal remain unverified.
  The subsequent recovery implementation is tracked in
  `MATRIX-CHAT-RECOVERY-2026-09-26.md`.
