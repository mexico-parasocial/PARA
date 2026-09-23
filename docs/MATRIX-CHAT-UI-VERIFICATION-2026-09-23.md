# Matrix chat UI verification

## P1 - authenticated media

- Local Synapse is running with `enable_authenticated_media: true`.
- Before the change, the WebView constructed `/_matrix/media/v3/download/...` URLs and assigned them directly to `<img>` or external links. A local request to that legacy endpoint returned HTTP 404. This probe used a synthetic media ID; it does not prove a particular uploaded image failed.
- After the change, the client constructs `/_matrix/client/v1/media/download/...` and `/_matrix/client/v1/media/thumbnail/...` URLs. A local request to the authenticated endpoint without a bearer token returned HTTP 401, as expected.
- `media.test.ts` verifies URL construction, authorization in a header, blob creation, and byte limits with and without `Content-Length`. The generated HTML script parses successfully. PARA typechecks on iOS, Android, and web.
- Simulator attempt: the installed iPhone 17 development build reached Metro, but the current working tree failed to bundle because an unrelated in-progress Agora edit imports the removed `cabildeo-party-alignment` module. A clean checkout at this commit started Metro, but the development client stayed on the previous bundle error. No signed-in PARA chat was reached.
- Pending device acceptance: upload an image in local Element, then open the same room in PARA on iOS and web and confirm the thumbnail renders. Also open video, audio, and a file; verify iOS offers the native share sheet and web downloads authenticated bytes. No before/after display claim is made.

## P2 - accessibility and language

- Header actions use ALF buttons with icons, spoken labels and hints. The risk count has a spoken number. VoiceOver and TalkBack navigation remain unverified because no signed-in chat screen was available in the simulator.
- Chat screen, native room, and HTML client strings use Lingui. The translated map is installed before the HTML client initializes; the client no longer hardcodes Spanish visible strings. `pnpm intl:extract` completed and found the new strings. The extraction was run with a temporary backup of the already-modified English catalog, then that catalog was restored to avoid overwriting unrelated user work.
- `pnpm typecheck` passed for iOS, Android, and web. Focused oxlint and six focused Jest tests passed.

## P3 - explicit iframe message origin

- The web iframe sends membership messages only to its configured app origin, and the receiver checks both the iframe window and origin. The native WebView continues to use its own `ReactNativeWebView.postMessage` bridge.

## P4 - moderator-only risk indicator

- The risk count is rendered only when the current member's participation says `isModerator` in both native and web chat headers. Badge calculation and the members list are unchanged, per D1.

## P5 - compact civic context and onboarding

- The default civic context is a 40-point row with identity, a permanent encryption state icon and label, and the badge count. Tapping it expands the existing identity pill, complete encryption notice, and up to four badges. The encryption notice text and dialog are unchanged.
- The welcome banner is marked seen in AsyncStorage per community when first shown. Returning to the same community does not show it again; another community has its own key.
- Device height and screenshot acceptance are still pending. The available installed app cannot reach a signed-in chat screen because Metro fails on the unrelated in-progress Agora import (`cabildeo-party-alignment`). iPhone SE and iPhone 15 simulator device types exist, but no authenticated app screen was reached for a valid before/after measurement. The row's declared `minHeight` is a code measurement, not a device measurement.

## P6 - native encrypted engine parity

- The native adapter maps the Rust SDK timeline into plain UI records: message kind, media metadata, aggregate reactions, reply preview, edit/redaction state, timestamp, and read receipt count. SDK media source objects remain inside the adapter. The UI can send and display reactions and replies, show edits/redactions and date separators, publish read and typing notices, send images/files, and open encrypted media through the SDK. Undecryptable messages show a clear state and a retry action.
- `mapTimeline.test.ts` covers mapping of replies, reactions, receipts, edited text, encrypted media metadata, redactions, and undecryptable events, including that SDK source objects are absent from the UI output. `pnpm typecheck` passed on iOS, Android, and web; focused oxlint and nine focused Jest tests passed.
- Device acceptance is still pending: PARA and Element must exchange a reaction, reply, edit, and image in both directions in a genuinely encrypted room. The installed app cannot reach a signed-in chat screen because of the unrelated Agora bundle error, so no interoperability claim is made. The separate week-2 key recovery and verification acceptance is also outstanding.
- The header now displays `Cifrado` for native chat only after the native room has opened successfully and passed its encrypted-room check. Before that confirmation it uses the fail-closed unencrypted disclosure. This was checked by typecheck and focused lint, not a device recording.
