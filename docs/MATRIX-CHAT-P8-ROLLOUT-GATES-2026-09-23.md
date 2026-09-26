# P8 - native engine default: gate and rollout plan

**State: blocked.** `CHAT_ENGINE` remains `webview`. No room encryption, default switch, bridge schema change, push or deployment was made in this package.

D2 was consolidated on 2026-09-25 under the user's request to reuse the moderator screens and resolve the conflicting proposals: moderators read reported events in their own client; reports carry IDs and a fixed reason, without copied text (F4 unchanged). The dialog, queue and review are integrated. Key recovery and end-to-end device acceptance remain open. See `MATRIX-D2-ENCRYPTED-REPORTS-DECISION-2026-09-23.md`.

The default switch requires all of the following evidence:

1. P1 authenticated media shown in PARA on iOS and web after uploading from local Element; P2 header verified with VoiceOver/TalkBack; P5 before/after heights and screenshots on iPhone SE and iPhone 15. These device checks are still open.
2. P6 PARA ↔ Element exchange of reaction, reply, edit and image in both directions in an encrypted room, with receipts and typing checked. The adapter and UI compile and pure mapping tests pass; device interoperability is still open.
3. Week-2 acceptance from the separate chat plan: device verification, key recovery and encrypted files. These are outstanding.
4. D2 moderator review verified in an encrypted room: moderators completing a verified join before test messages are sent, their keys backed up, reports carrying IDs only, and the review opening the event in the moderator's own client with explicit undecryptable and redacted states. No message text may be copied into a report.
5. A working path for web and older mobile clients after a room becomes encrypted. The current iframe has no crypto initialization. Either complete P7 for web or agree on an explicit upgrade/read-only policy before migrating a shared community room. Do not silently fall back to an unencrypted room after a native error.

Proposed room transition for review: create an encrypted successor room, have moderators complete a verified join and verify their key access before admitting members, make the old unencrypted room read-only, and keep its history labeled as unencrypted. Update PARA's room mapping only after all supported clients can enter the successor. Earlier plaintext cannot become encrypted retroactively. Test a small internal community first, then a staged TestFlight cohort, then production with a documented rollback path that never downgrades new encrypted content.

When every gate has evidence, make the default change as a separate behavior-change commit and verify it in a signed build before considering deployment. Until then, `EXPO_PUBLIC_CHAT_ENGINE=native` remains an explicit opt-in for testing.
