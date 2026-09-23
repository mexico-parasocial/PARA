# D2 - reports from encrypted community rooms

Decision by the user on 2026-09-23: a reporter may attach the decrypted text of a reported message to a moderation report with explicit consent in the UI.

This reopens the earlier F4 decision to store only the Matrix event ID. The bridge cannot fetch plaintext from an encrypted Matrix event, so a report with evidence needs a client-supplied copy. The reported member has not consented to this separate copy. The copy must therefore be narrow, visible to the reporter, and subject to deletion rules; the existing event-ID-only path should continue to work when the reporter declines to attach text.

Before this option can support a default switch to the native engine:

1. Show the exact plaintext that would be attached. Require an unchecked, explicit confirmation that the text will be sent to moderation and stored outside the encrypted room. Never attach it silently or copy surrounding messages. Bound text to the reported event; media needs a separate consent and evidence design.
2. Add an authenticated bridge field for the client-supplied excerpt, validate its size and event/room relationship, and make the reporter identity and consent version auditable. Treat the excerpt as untrusted client testimony, not as server-verified content.
3. Limit moderation access, encrypt the stored excerpt at rest, and purge it no later than the room's 90-day message retention. Purge it after a Matrix redaction within the redaction retention window and when a report is deleted. Test these deletion paths; F4's original retention bypass must not return.
4. Verify the full report flow from a native E2EE room with two devices and a moderator. Then decide how existing unencrypted rooms transition. Enabling encryption is one-way and does not encrypt earlier history or older WebView clients.

Until these controls and the P6/week-2 device acceptance are verified, `CHAT_ENGINE` remains `webview` by default. No bridge schema, Synapse configuration, deployment, or production behavior changed with this decision record.
