# Ozone Moderation Powers PARA's Civic Discourse

**April 2026**

We've integrated Bluesky's Ozone moderation toolkit into PARA's backend. Here's what that means for civic discourse in Mexico.

## What is Ozone?

Ozone is Bluesky's open-source moderation stack. It gives communities the infrastructure to moderate content at scale — without surrendering control to a single corporation. The key insight: moderation is not a product feature, it's a protocol layer.

For PARA, this means our moderation system speaks the same language as the AT Protocol ecosystem. Reports, actions, labels, and appeals all flow through standardized lexicons. That's interoperability by design.

## Two New Capabilities

### 1. Expiring Tags — Moderation With a Timer

Moderators can now attach temporary tags to content or accounts. A tag like `cooldown` or `pending-review` can auto-expire after N hours. When the timer hits zero, the tag removes itself and logs the reversal.

Use cases for Mexican civic discourse:

- **Election periods**: Cooldown tags on heated posts that auto-expire after 24h
- **Fact-checking queues**: `pending-verification` tags while third-party validators work
- **Escalation paths**: Temporary `under-review` tags that either convert to permanent actions or clear automatically

The expiring tag table lives in our PostgreSQL backend. A daemon checks every minute for expired tags and reverts them via the standard moderation event log. Full audit trail, zero manual cleanup.

### 2. Mod History V2 — Transparency for Users

Users can now query their own moderation history:

- **`getAccountActions`** — See all moderation actions taken on your account or content
- **`getReportedSubjects`** — See all subjects you've reported and their current status
- **`getSubjectHistory`** — See the full event trail for any specific post/account you own

This is a transparency layer that most platforms bury in support tickets. For PARA, it's a first-class API. If your post was labeled, taken down, or had a strike applied — you can see it, query it, and appeal it programmatically.

The history views filter raw moderation events into four public event types:

- `eventTakedown` — Content or account suspended (with optional duration)
- `eventReverseTakedown` — Suspension lifted
- `eventLabel` — Labels applied or removed
- `eventEmail` — Moderation communications sent

## Architecture

The integration lives in our fork of `@atproto/ozone` inside the WhatZatppa monorepo. Key files:

- `packages/ozone/src/mod-service/expiring-tags.ts` — Tag lifecycle management
- `packages/ozone/src/daemon/event-reverser.ts` — Automated reversal daemon
- `packages/ozone/src/history/views.ts` — Event-to-view transformation
- `packages/ozone/src/api/history/*.ts` — Three new XRPC query handlers
- `lexicons/tools/ozone/history/*.json` — Four new lexicon schemas

All types are code-generated from lexicons. If the protocol evolves, we regenerate.

## Why This Matters for Mexico

Mexican political discourse online faces specific challenges:

- **Coordinated manipulation** during election cycles
- **Doxxing and harassment** of journalists and activists
- **Platform opacity** — users rarely know why content was removed

Ozone gives us the toolkit to address all three:

1. **Detection**: Standardized reporting flows + automated labelers
2. **Response**: Escalation paths, expiring tags, strike systems
3. **Transparency**: Queryable history, auditable event logs, appeal workflows

And because it's AT Protocol-native, any other Mexican civic tech project using Bluesky's stack can interoperate with our moderation decisions. A label applied on PARA can be respected by another client. A report filed on one app can be actioned by another.

## What's Next

- Frontend integration: History views in the PARA mobile app
- Custom PARA-specific labels: `misleading-statistic`, `out-of-context-quote`, `verified-by-[partner]`
- Community moderator delegation: Let trusted community members action reports within their domains
- Public moderation dashboards: Aggregate transparency data for researchers and journalists

The infrastructure is ready. Now we ship the UX.

---

_PARA is a civic-tech social platform for Mexican politics. Built on AT Protocol. Moderated by the community._
