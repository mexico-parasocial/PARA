# P8 - native engine default: gate and rollout plan

**State: blocked.** `CHAT_ENGINE` remains `webview`. No room encryption, default switch, bridge schema change, push or deployment was made in this package.

The user confirmed D2 on 2026-09-24: moderators read reported messages in their own client, as room members, and reports store only event and room IDs (F4 unchanged). The decision and its requirements are recorded in `MATRIX-D2-ENCRYPTED-REPORTS-DECISION-2026-09-23.md`. The moderator review flow still needs implementation and end-to-end verification.

The default switch requires all of the following evidence:

1. P1 authenticated media shown in PARA on iOS and web after uploading from local Element; P2 header verified with VoiceOver/TalkBack; P5 before/after heights and screenshots on iPhone SE and iPhone 15. These device checks are still open.
2. P6 PARA ↔ Element exchange of reaction, reply, edit and image in both directions in an encrypted room, with receipts and typing checked. The adapter and UI compile and pure mapping tests pass; device interoperability is still open.
3. Week-2 acceptance from the separate chat plan: device verification, key recovery and encrypted files. These are outs4. D2 moderator review verified in an encrypted room: moderators present from room creation, their keys backed up, reports carrying IDs only, and the review opening the event in the moderator's own client with explicit undecryptable and redacted states. No message text may be copied into a report. be copied into a report silently.
5. A working path for web and older mobile clients after a room becomes encrypted. The current iframe has no crypto initialization. Either complete P7 for web or agree on an explicit upgrade/read-only policy before migrating a shared community room. Do not silently fall back to an unencrypted room after a native error.

Proposed room transition for review: create an encrypted successor room, invite moderators at creation (they cannot read messages sent before they join) and then members, make the old unencrypted room read-only, and keep its history labeled as unencrypted. Update PARA's room mapping only after all supported clients can enter the successor. Earlier plaintext cannot become encrypted retroactively. Test a small internal community first, then a staged TestFlight cohort, then production with a documented rollback path that never downgrades new encrypted content.

When every gate has evidence, make the default change as a separate behavior-change commit and verify it in a signed build before considering deployment. Until then, `EXPO_PUBLIC_CHAT_ENGINE=native` remains an explicit opt-in for testing.
