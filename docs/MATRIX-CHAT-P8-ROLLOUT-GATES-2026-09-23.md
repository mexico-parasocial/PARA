# P8 - native engine default: gate and rollout plan

**State: blocked.** `CHAT_ENGINE` remains `webview`. No room encryption, default switch, bridge schema change, push or deployment was made in this package.

The user chose D2 on 2026-09-23: reports from encrypted rooms may include reporter-supplied plaintext with explicit consent. The decision and the required handling are recorded in `MATRIX-D2-ENCRYPTED-REPORTS-DECISION-2026-09-23.md`. The bridge and UI report flow still need implementation and end-to-end verification.

The default switch requires all of the following evidence:

1. P1 authenticated media shown in PARA on iOS and web after uploading from local Element; P2 header verified with VoiceOver/TalkBack; P5 before/after heights and screenshots on iPhone SE and iPhone 15. These device checks are still open.
2. P6 PARA ↔ Element exchange of reaction, reply, edit and image in both directions in an encrypted room, with receipts and typing checked. The adapter and UI compile and pure mapping tests pass; device interoperability is still open.
3. Week-2 acceptance from the separate chat plan: device verification, key recovery and encrypted files. These are outside this UI plan and remain open.
4. D2 report consent UI, bridge storage/deletion controls and moderator review verified in an encrypted room. No plaintext may be copied into a report silently.
5. A working path for web and older mobile clients after a room becomes encrypted. The current iframe has no crypto initialization. Either complete P7 for web or agree on an explicit upgrade/read-only policy before migrating a shared community room. Do not silently fall back to an unencrypted room after a native error.

Proposed room transition for review: create an encrypted successor room, invite members and moderators, make the old unencrypted room read-only, and keep its history labeled as unencrypted. Update PARA's room mapping only after all supported clients can enter the successor. Earlier plaintext cannot become encrypted retroactively. Test a small internal community first, then a staged TestFlight cohort, then production with a documented rollback path that never downgrades new encrypted content.

When every gate has evidence, make the default change as a separate behavior-change commit and verify it in a signed build before considering deployment. Until then, `EXPO_PUBLIC_CHAT_ENGINE=native` remains an explicit opt-in for testing.
