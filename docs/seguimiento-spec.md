# Seguimiento: what happened after a cabildeo resolved

> Status: **phase 1 (AppView) and the read-only client section (6.2) are built
> and tested locally.** The AppView work was parked in a WatZappa stash during
> an upstream merge, then re-applied; its routes now register the generated
> schemas with `server.add`, as WatZappa's AGENTS.md requires, instead of
> hand-written ones. The AppView is committed in WatZappa (`dceb675d1`); neither
> repository is pushed or deployed, the migration is not applied to any shared
> database, and the demo seed is not extended (section 7).
> Section 9 lists what is still open.
>
> Decided 2026-11-02: a cabildeo has a **kind** (section 3.1); quorum must be
> met before anything is followed, and a quorum hold is a later phase (R2,
> section 8); visibility follows the cabildeo's own permissioned space (5.4);
> verified officials may publish compromisos (R1b).
>
> Origin: Decidim's Accountability component, adapted to PARA's rules. A
> cabildeo ends at `phase: 'resolved'` with a winning option. Nothing records
> whether the winning option was then carried out.
>
> Code this builds on (verified when this was written):
> `lexicons/com/para/civic/cabildeo.json`,
> `lexicons/com/para/community/activityLedgerEntry.json`,
> `WatZappa/packages/bsky/src/data-plane/server/routes/community-activities.ts`
> (steward check), `.../routes/cabildeo.ts` (outcome view),
> `src/screens/Communities/CabildeoDetailScreen.tsx` (resolved branch).

## 1. Why

PARA can say who won a vote. It cannot say whether anything changed. For a
civic app in Mexico, "se cumplió?" is the question people actually ask, and
today the answer lives in chats and screenshots.

Decidim solves this with a tree of "results" under a space, each with a status,
a progress percentage and dates. We keep that shape but change who may write
it and how it can be edited, because PARA has no admins and its records live in
user repos.

> **Rule: Seguimiento may only report what a steward of the community wrote,
> and it never reports more than was written.**

## 2. Words

The UI uses these and no others.

| Word                       | Meaning                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| **seguimiento**            | The whole follow-through for one resolved cabildeo.               |
| **compromiso**             | One thing that must happen because the cabildeo resolved.         |
| **actualización**          | A dated note on a compromiso: status, progress, evidence.         |
| **en curso / cumplido**    | Status of a compromiso.                                           |
| **atrasado**               | Derived: its due date has passed and it is not cumplido.          |
| **sin seguimiento**        | A resolved cabildeo that has no compromiso. A fact, not a grade.  |

There is no "score", "rating" or "reliability". See R7.

## 3. Rules

| #  | Rule                                                                                                                                                                                                                                      |
| -- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1 | **Only stewards write.** A record counts only if its author is a current steward of the cabildeo's community: the board creator, or an owner or moderator by verified authority events. The cabildeo's own author is not enough. Same rule as community activities. |
| R1b | **Verified officials may write too (decided).** A verified official entity whose active controller holds the right scope, and whose jurisdiction covers the cabildeo's addressee, counts as a steward for Seguimiento. This needs the AppView to index `com.para.official.entity` and `controller`, which it does not do yet, so it is phase 3. Until then only stewards are served. |
| R2 | **Only a real winner is followed.** Seguimiento exists only when the cabildeo is `kind: activity` (3.1), `resolved`, `outcome.winningOption` is a number, `outcome.tie` is false, and quorum is met (`minQuorum` unset, or `voteCount >= minQuorum`). A compromiso names the option it follows; if that is not the winner, it is not served. The quorum check is made here as well as at resolution, because today nothing enforces `minQuorum` when a cabildeo resolves (section 8, phase 2). |
| R3 | **History is append-only.** A compromiso's title, responsible party and first due date are committed when first indexed; later edits to those fields are ignored. Everything that changes is an actualización. |
| R4 | **One level.** A compromiso may have sub-compromisos, and those may not have any. This mirrors the one-hop rule for mandates and keeps the rollup explainable. |
| R5 | **Derive, never invent.** Overdue comes from a declared due date. Progress shows only if declared. A parent's progress is computed from its children by the AppView, never typed in. |
| R6 | **Rescheduling is visible.** A new due date is an actualización with a note. The item shows how many times it moved. |
| R7 | **No scores.** Community pages show counts (resolved, cumplidas, atrasadas, sin seguimiento), never a percentage or rank, and say nothing below three resolved cabildeos. A score would be gamed and would read as a verdict the data cannot support. |
| R8 | **Reactions decide nothing.** The citizen "¿se cumplió?" signal (phase 4) is a public reaction like meme votes. It never changes a status and awards no influence. |

### 3.1 Cabildeo kinds (decided)

A cabildeo gets an optional `kind`. Records without one are `activity`, the
only behavior that existed before.

| Kind          | What it is                                                                 | Votes on        | Seguimiento |
| ------------- | -------------------------------------------------------------------------- | --------------- | ----------- |
| `activity`    | **Propuesta de actividad.** The community decides to do something.         | its options     | yes         |
| `persuasion`  | **Convencer.** Make the case to change people's position on a policy. Carries `subject`, the policy post. | the policy's -3 to +3 position, before and after | no: the result is how positions moved, not a task |
| `forum`       | **Foro.** A public conversation for a place: a state, city or neighborhood, using `region`, `geoScope` and `geo`. | nothing required | no: no decision to follow |

Only `activity` has options that bind anyone, so only it can be followed. A
forum may have zero options and a persuasion cabildeo's options are positions,
not actions. Creation flow and per-kind screens are phase 2 of the client work
and are not in this spec.

## 4. Data model

New lexicons under `lexicons/com/para/civic/`. They follow the activity and
ledger pattern: records live in the steward's repo, the indexer accepts them
from anyone, and authorization happens when they are read.

### 4.1 `com.para.civic.followThrough` (record, key `tid`)

| Field            | Type            | Notes                                                                 |
| ---------------- | --------------- | --------------------------------------------------------------------- |
| `cabildeo`       | at-uri, req.    | The resolved cabildeo.                                                |
| `communityUri`   | at-uri, req.    | Board URI. Must resolve to the cabildeo's community (see 5.2).        |
| `optionIndex`    | integer, req.   | The option this follows. Must equal `outcome.winningOption` (R2).     |
| `parent`         | at-uri          | Another followThrough on the same cabildeo, and itself a root (R4).   |
| `title`          | string, max 300 | Committed (R3).                                                       |
| `summary`        | string, max 2000|                                                                       |
| `responsibleDid` | did             | When the responsible party has an account. Committed.                 |
| `responsibleLabel` | string, max 200 | An office or body, for example an ayuntamiento. Committed.          |
| `dueAt`          | datetime        | First due date. Committed.                                            |
| `createdAt`      | datetime, req.  |                                                                       |

### 4.2 `com.para.civic.followThroughUpdate` (record, key `tid`)

| Field          | Type                | Notes                                                                    |
| -------------- | ------------------- | ------------------------------------------------------------------------ |
| `subject`      | at-uri, req.        | The followThrough this updates.                                          |
| `status`       | string, req.        | `planned`, `in_progress`, `completed`, `blocked`, `abandoned`.           |
| `progress`     | integer 0 to 100    | Leaf items only. Ignored on a parent (R5). `completed` displays as 100.  |
| `note`         | string, max 2000    | Required when `dueAt` changes or status is `blocked` or `abandoned`.     |
| `evidenceUris` | array of uri, max 5 | An oficio, an acta, a public portal link.                                |
| `dueAt`        | datetime            | A new due date (R6).                                                     |
| `occurredAt`   | datetime, req.      | When it happened, not when it was written.                               |
| `createdAt`    | datetime, req.      |                                                                          |

The current state of an item is its newest actualización by `occurredAt`, then
`createdAt`. An item with no actualización is `planned` with no progress.

### 4.3 Later: `com.para.civic.followThroughVerdict` (phase 4)

One record per voter per subject, value -1, 0 or +1, updated in place, as in
`src/state/queries/para-meme-reactions.ts`. See R8 and open question Q3.

## 5. AppView (WatZappa)

### 5.1 Indexing

- Tables `para_follow_through` and `para_follow_through_update`, with a
  migration modeled on `data-plane/server/db/tables/para-community-activity.ts`.
- Plugin `indexing/plugins/para-follow-through.ts`, modeled on
  `para-community-activity.ts`: validate shape, index whoever wrote it, decide
  authorization at read time. A role granted or revoked later then takes effect
  without re-indexing.
- R3 is enforced with a third table, `para_follow_through_commit`. The first
  version of every item and update is stored there. The processor handles an
  edit as delete-then-insert, so on re-insert the committed values are served
  and the row is flagged `edited` when the new record differs. Deleting an
  update leaves its commit row behind, which is how a withdrawn update is
  counted (`withdrawnUpdates`, Q4).
- `createdAt` is committed with the first version, and served no later than the
  time that version was first indexed. Without that an edit moves a cabildeo up
  the community list (the list orders by newest `createdAt`) and a record could
  claim a future date to sort first. The digest covers the claim as written, so
  re-indexing an unchanged record is not read as an edit.
- Rejected at index time: a missing `note` on an update that sets `dueAt` or
  has status `blocked` or `abandoned`, progress outside 0 to 100, more than five
  evidence links, a non-http(s) link. Not checked at index time, because order
  is not guaranteed: that a `parent` is a root of the same cabildeo, and that
  `optionIndex` is the winner. Both are checked when read.
- `cabildeo_cabildeo.kind` is a new nullable column; null means `activity`.
  The view tier is read from the cabildeo's stored record because the table has
  no column for it.

### 5.2 Reading

- Reuse `makeStewardCheck` from `routes/community-activities.ts`. Resolve the
  cabildeo's `community` to a board with the helper `routes/cabildeo.ts` already
  uses for slugs and `at://` ids. Do not trust `communityUri` from the record
  without checking it matches.
- Serve a record only when R1 and R2 hold at read time. A cabildeo that
  resolves later makes earlier records start appearing; one that is found tied
  makes them disappear.
- Updates are served if their author is a current steward, not only the item's
  author, so a change of organizers does not strand an item.
- Compute rollups in one function with tests: a parent's progress is the mean of
  its non-abandoned children; abandoned children are listed apart and never
  count as complete; a parent with no children uses its own update.

### 5.3 Endpoints

Register by hand, as `com.para.book.searchBooks` is
(`api/com/para/book/schemas.ts`), because the generated registry is frozen.

- `com.para.civic.listFollowThrough`: filters `cabildeo`, `community`,
  `status`, `overdue`, with cursor and limit. Paged **by cabildeo** (newest
  activity first), so `limit` counts cabildeos and one cabildeo's compromisos
  are never split. Returns `items` (roots with children, no timelines) and one
  `summaries` entry per cabildeo, computed from that cabildeo's whole served
  tree rather than the filtered page.
- `com.para.civic.getFollowThrough`: one item with children and its timeline;
  `NotFound` for anything not served.
- Built in phase 1: the list response's `summaries`. **Not built:** adding
  `followThroughSummary` to the cabildeo view (`getCabildeo`, `listCabildeos`).
  It touches an output lexicon every client reads, so it moves to phase 2 with
  the client chip that needs it.

### 5.4 Notifications

Notify on transitions only: first `completed`, first becoming overdue,
`abandoned`. Not on every progress edit.

**Who may see and be told (decided).** Seguimiento is visible to exactly the
people who can view the cabildeo: the `minimumViewTier` of the cabildeo is
applied to compromisos, actualizaciones and notifications alike. A cabildeo
limited to `community_member` has a seguimiento limited to members. Recipients
are people who voted or hold a delegation in it and still pass that tier,
resolved on the server and never returned to the client. A voter's identity is
never revealed to learn who to notify, whatever `voteVisibility` says.
Phase 1 serves only cabildeos whose `minimumViewTier` is `public` or absent;
tiered cabildeos return nothing until the tier check is built (phase 2).

## 6. Client (PARA)

Structure follows `agents.md`: a feature folder for UI, hooks and data, a
screen for the route.

- `src/features/followThrough/`: `FollowThroughSection`, `CompromisoRow`,
  `FollowThroughTimeline`, `StatusPill`, `SummaryChip`, `RegisterSheet`, plus
  the rollup display helpers.
- `src/state/queries/follow-through.ts`: `useFollowThroughQuery`,
  `useFollowThroughItemQuery`, and mutations that write through the PDS client.
  Keys use `createQueryKey('follow-through', {cabildeoUri})`.
- Route `FollowThrough` at `/communities/cabildeos/:cabildeoUri/seguimiento`.
  Update `src/routes.ts`, `Navigation.tsx` and `lib/routes/types.ts` together.
- Lexicons: add to `lexicons/com/para/civic/`, run `pnpm lexicons:generate`
  here and `make codegen` in WatZappa. The tracked server directories
  `bsky/src/lexicon` and `pds/src/lexicon` need them too.
- Copy new view fields by hand where the client normalizes them (as
  `normalizeBoard` does), or they are silently dropped.
- Writes show a pending row until the indexer catches up; do not present an
  unindexed write as persisted.

### 6.1 Where it appears

| Place | Change |
| ----- | ------ |
| **Cabildeo detail** (`CabildeoDetailScreen.tsx`) | A "Seguimiento" section below the options and result block, only when R2 holds. Shows the progress bar, `n de m cumplidos`, next due date, overdue count, the first three compromisos and "Ver seguimiento". Organizers also get "Registrar compromiso" here. The five-step phase timeline is unchanged, because `phase` is a lexicon enum. The screen is 2,569 lines: add one component import, no inline logic. |
| **Cabildeo cards** (`CabildeoListScreen`, `CabildeosScreen`) | On resolved cards, one chip: `Seguimiento 60%`, `Atrasado`, or `Sin seguimiento · hace 45 d`. New filters: "Con seguimiento", "Atrasados". |
| **Matter details** (`DetailsScreenBase`) | The same section component. A matter is opened by its cabildeo URI, so this comes for free. Place it above "Relacionados en árboles cívicos". |
| **Organizer work queue** (`ModeratorDashboardScreen`) | "Resoluciones sin seguimiento": resolved cabildeos of the community with no compromiso. Opens the register sheet. |
| **Community profile** (`CommunityProfileScreen`) | Phase 3. A counts-only tile (R7). |
| **Notifications** | Rows for the transitions in 5.4. |

### 6.2 Built: read-only section on the cabildeo detail screen

- `src/lib/api/follow-through.ts`: `fetchFollowThrough` (one cabildeo's items
  and its summary) and `fetchFollowThroughItem` (one compromiso with its
  timeline). A 501 from an AppView without the methods reads as empty; any
  other failure is thrown, so the section never turns a failed read into "no
  compromisos".
- `src/state/queries/follow-through.ts`: `useFollowThroughQuery` (enabled only
  for a resolved cabildeo) and `useFollowThroughItemQuery` (enabled when a row
  is opened). Keys use `createQueryKey('follow-through', ...)`.
- `src/features/followThrough/`: `FollowThroughSection`, `CompromisoRow`,
  `Timeline`, `StatusPill`, `ProgressBar`, and `display.ts` (pure helpers).
  `CabildeoDetailScreen.tsx` gained one import and one element, after the
  result block and before the nominations.
- The section shows counts from the summary (`Cumplidos: 1 de 4`,
  `Atrasados: n`, next due date), an overall bar only when the AppView derived
  a progress, the first three compromisos and "Ver los n compromisos". A row
  opens to its summary and timeline, newest first. An edited record is labeled
  as shown in its original form, and a deleted update leaves a count (R3).
  Overdue is the AppView's field, never computed from the clock here.
- `src/lib/mock-data/follow-through.ts` gives the demo cabildeo "Salario
  Mínimo Digno 2026" a seguimiento in development builds only (`USE_MOCK_DATA`),
  because the seed cannot produce a resolved cabildeo with a winner.

Not built, and why:

| Left out | Reason |
| -------- | ------ |
| "Ver seguimiento" route | Rows expand in place. A route is worth adding with the write flow. |
| Card chip and the "Con seguimiento" / "Atrasados" filters | Need `followThroughSummary` on the cabildeo list view, a server change (phase 2). |
| "Sin seguimiento" empty state | The client cannot tell a cabildeo with no compromisos from one the AppView refuses to follow (wrong kind, tie, quorum). It needs `kind` on the cabildeo view. Until then an empty answer draws nothing. |
| Matter details | Same component, not yet placed. |
| Visual check | Not done: the web dev server did not come up here (webpack never listened). Covered by 26 component and helper tests only. |

## 7. Tests

- Rollup: mean, abandoned excluded, empty parent, completed forced to 100.
- Overdue with an injected clock; rescheduling count.
- Authorization: a non-steward record is not served; a revoked steward's record
  stops being served; a cabildeo author who is not a steward is not enough.
- R2: tie, no winner, option mismatch, and a cabildeo that is not resolved.
- Indexer: depth over one, cross-cabildeo parent, edits to committed fields.
- Client: the normalizer keeps `followThroughSummary`; `routes.test.ts` covers
  the new route; a section renders nothing when R2 fails.
- Seed: **not done.** The demo's resolved cabildeos have no winning option,
  because the seed's ballots are refused without a cabildeo vote proof (see
  `agents.md`, Seed Demo Data). A seed could only fake one by writing database
  columns, which a seed cannot do through the API. It needs the dev verifier to
  mint cabildeo proofs, as it does for policy ballots, or a cabildeo whose votes
  go through `castVote`. Until then phase 2 review needs the integration test's
  fixture approach.

Phase 1 is covered by `follow-through.test.ts` (24 rules tests, no database)
and `tests/para-follow-through.test.ts` (9 tests against a real PDS and
AppView: steward and outsider, wrong option, updates by outsiders, rollup,
overdue, edits (including that `createdAt` does not move), withdrawn updates,
kind and quorum, paging, and a future `createdAt`). The routes use the generated
schemas, so there is no schema drift test any more.

## 8. Phases

| Phase | Scope |
| ----- | ----- |
| 1 | **Built and tested locally, uncommitted.** AppView: lexicons (incl. cabildeo `kind`), tables, indexer, steward-gated read endpoints, tests. Seed not done (section 7). |
| 2 | Quorum hold: a cabildeo that reaches its deadline below `minQuorum` does not resolve; it stays in `voting`, marked as waiting for quorum, until enough people vote (rules for the deadline are open, Q7). Tier-aware visibility. Read-only client: detail section, card chip, matter details. |
| 3 | Organizer write flow, work queue, community counts tile. Official authors (R1b): index `com.para.official.*`. |
| 4 | Notifications. |
| 5 | Citizen verdict (R8), only after Q3 is answered. Per-kind creation flow (3.1). |

## 9. Open questions

- **Q1. Officials: decided yes (R1b).** Still open: which scope authorizes it
  (`official.cabildeo.sign` exists; a new `official.seguimiento.write` is
  cleaner), and what "jurisdiction covers the addressee" means for an entity
  whose `jurisdiction` is free text.
- **Q2. Visibility: decided.** It follows the cabildeo's `minimumViewTier`
  (5.4). Still open: whether the server holds voter identities for
  `anonymous` cabildeos at all, which decides who can be notified.
- **Q3. Who may give a verdict.** Everyone, community members, or only people
  who voted? The first is cheap to game and the last excludes people affected
  who did not vote.
- **Q4. Deleted records.** Deleting an actualización from a repo removes it
  from view. Recommendation: the indexer keeps a tombstone and the timeline
  shows "N actualizaciones retiradas".
- **Q5. Several communities.** A cabildeo has `communities` as well as
  `community`. v1 checks stewards of the primary one only.
- **Q6. Evidence for `completed`.** Recommendation: the UI requires a note or an
  evidence link to mark cumplido; the lexicon does not.
- **Q7. Quorum: decided direction.** Checked in code: `minQuorum` is stored by
  the indexer and read for display, but `recompute-cabildeo-aggregates.ts` never
  compares it with `voteCount`, so a cabildeo below quorum resolves with a
  winner today. The decision is to hold it until quorum is reached (phase 2).
  Still open: does the deadline move, is there a maximum wait, and what do
  people who already voted see meanwhile.

## 10. After building

Add a dated entry to `agents.md` recording the steward rule, R2, and the
by-hand endpoint registration, as other features do.
