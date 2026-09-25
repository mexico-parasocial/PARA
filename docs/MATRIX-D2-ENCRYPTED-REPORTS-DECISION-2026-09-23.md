# D2 - reports from encrypted community rooms

Decision by the user, confirmed on 2026-09-24: moderators read a reported
message in their own client, as members of the room. The bridge stores only the
Matrix event and room IDs. No copy of the message leaves the encrypted room.

This supersedes the 2026-09-23 version of this file, which recorded option 1
(the reporter attaching decrypted text with consent). That option is not taken.

## Why

It keeps F4 as it stands. A report stores `matrixEventId` and nothing else, so
the evidence inherits the room's retention and redaction rules instead of
outliving them. It is also how Matrix end-to-end encryption is meant to work:
only members with keys can read the room, and moderators read as members.

The bridge cannot fetch plaintext from an encrypted event, and under this
decision it never tries to.

## What it costs, and accepts

- **Evidence can disappear.** If the author redacts the message before a
  moderator opens the report, there is nothing left to read. This is F4's
  behaviour applied to encrypted rooms, and it is accepted. The report itself
  (reporter, reason, event ID, time) remains.
- **A moderator on a device without the keys cannot read the report.** The
  review screen must say so plainly ("no se puede descifrar en este
  dispositivo") rather than show an empty message.

## What this requires before the native engine can become the default

1. **Moderators are in every encrypted room from the start.** A member who joins
   an encrypted room cannot decrypt messages sent before they joined. The
   successor-room transition in `MATRIX-CHAT-P8-ROLLOUT-GATES-2026-09-23.md`
   must invite moderators when the room is created, and appointing a new
   moderator later only gives them what is sent after they join. State that in
   the moderator UI.
2. **Moderator devices keep their keys.** Moderators need key backup and
   recovery (week 2 of the separate chat plan) so that changing devices does not
   make earlier reports unreadable.
3. **The report flow sends IDs only.** The reporter's client sends room ID,
   event ID and reason. The client must not attach the message text, and the
   bridge must not accept a text field for encrypted rooms. Keep the existing
   `chat-moderation.ts` path; do not add an excerpt column.
4. **The review opens the event in the moderator's client.** The moderator
   dashboard links to the event in the native room view (or the room at that
   event), where the moderator's own session decrypts it. Show an explicit
   state when it cannot decrypt or when the event was redacted.
5. **Removing a moderator removes their future access.** Leaving or being
   removed from the room stops new keys from reaching them. Past messages they
   already decrypted stay on their device; say so in the moderator role
   documentation instead of implying otherwise.
6. **Verified end to end.** From a native E2EE room with two members and a
   moderator on a separate device: report a message, open the report as the
   moderator, read it, then redact it and confirm the report shows it as
   redacted.

Until these are in place and verified, `CHAT_ENGINE` remains `webview` by
default. No bridge schema, Synapse configuration, deployment or production
behaviour changed with this decision record.
