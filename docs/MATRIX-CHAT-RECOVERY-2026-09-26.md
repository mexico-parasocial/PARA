# Native chat recovery - 2026-09-26

## Implemented

The native room has a **Claves y dispositivo** screen, also linked from an
undecryptable reported message. It uses the current native Matrix client, not
a bridge credential or a second SDK connection.

- Queries the SDK's recovery and device verification states and checks whether
  a server backup already exists. An unknown state never enables key creation.
- Creates a recovery key only when recovery is disabled and no backup exists.
  Recovery, key creation, acknowledgement and backup synchronization are
  serialized. There is no identity reset or backup replacement action.
- Stores a generated key as pending in the OS secure store under the existing
  account/homeserver/MXID scope, with device-only keychain accessibility. It
  remains pending until the user explicitly confirms saving it elsewhere.
  It can be shown after reopening the room. If storage fails, the only returned
  key stays on screen for the user to save and the panel warns before leaving.
- Hides generated keys by default and hides them again when the app becomes
  inactive. Entered recovery keys use a masked field, with suggestions and
  autocorrection disabled; input is cleared on submission or backgrounding.
  Neither key type enters navigation, shared query caches, logs or reports.
- Accepts an existing key through SDK recovery, then retries room decryption.
  The UI displays **verified** only when the SDK reports `Verified`; successful
  recovery alone is not treated as verification evidence.
- Provides a separate backup synchronization action that waits for the SDK's
  upload steady state. Configuration does not imply every key is already
  uploaded. Backup cannot restore deleted messages or unavailable room keys.
- Waits for an in-flight recovery operation before disposing the SDK, so a
  generated key can reach secure storage when the screen closes. Late screen
  updates are discarded. Pending keys survive normal room closure and remain
  scoped to the same account until acknowledgement.

## Verification

- Focused automated tests cover refusing backup replacement, pending key
  resumption, storage failure, concurrent operations, disposal ordering,
  recovery error sanitization, backup synchronization, background hiding,
  input clearing and the SDK-reported verification state.
- Type checks pass on iOS, Android and web in an isolated checkout of the
  committed PARA baseline plus this change, using the installed dependencies
  and freshly generated local lexicons. The main working directory still has
  unrelated in-progress compile failures.
- At the initial implementation check, a live multi-device run was **not
  completed**. Neither of the two inspected
  iPhone 17 Pro simulators had PARA installed; the computer-use surface also
  could not open Simulator. Both test-started simulators were shut down again.
- SAS/QR verification UX is not implemented here. Recovering with a saved key
  and displaying actual verification state does not prove that separate flow.

## Device acceptance still required

The follow-up run built PARA and installed it on two isolated iOS simulators,
repaired local service blockers and reran focused checks. Live authorization
and recovery are still incomplete; see
`MATRIX-CHAT-DEVICE-ACCEPTANCE-2026-09-26.md` for evidence and the concrete
IdP-return/device-attestation gaps.

1. In a native E2EE test room, join with two members and a moderator before
   sending the report fixture. Verify all devices have real room access.
2. On the moderator's first device, create recovery, deliberately close and
   reopen the screen, confirm the pending key remains, save it privately and
   acknowledge. Synchronize the backup and verify completion.
3. Authorize another device for the same moderator account. Open a reported
   event before recovery and verify the explicit missing-key state. Recover
   with the saved key; confirm both decryption and the actual verification
   state against the homeserver. Confirm account switching shows no prior key.
4. Try a wrong key and a disconnected network; existing backups must survive
   and errors must not include the key. Exercise a failed storage write only
   in a test fixture, never by weakening a real device's secure store.
5. Read the report, redact the event, and verify the review changes. Remove
   the moderator and verify future access is revoked; previously read content
   cannot be erased from that moderator's knowledge or local backups.

`CHAT_ENGINE` stays `webview`; no shared room is migrated or deployed here.
