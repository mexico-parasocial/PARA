# Conclusión: where a conversation without a vote landed

> Status: **built and tested locally, uncommitted.** AppView in WatZappa branch
> `feat/conclusions` (stacked on the open Seguimiento PR), client in PARA branch
> `feat/conclusions`. Not deployed; the migration is not applied to any shared
> database; nothing has been seen rendered (the web dev server did not come up).

Decided 2026-11-03: stewards only; forum and persuasion cabildeos only (not open
questions, not activities); no minimum age; one conclusion shown per cabildeo.

## What it is

A **conclusión** is a short text a steward attaches to a deliberation that has
no vote to end it. It is the steward's reading, labeled as such, never the
community's verdict. It closes nothing: positions stay open under it.

Why only forum and persuasion (see `seguimiento-spec.md` 3.1): an `activity`
ends in a vote and an outcome, and PARA's open questions already have threaded
replies with votes. A forum or a persuasion cabildeo has no winning option, so
without a conclusion it just stops.

## Rules

| #  | Rule |
| -- | ---- |
| C1 | **Only stewards write.** Same check as Seguimiento and community activities: the board creator, or an owner or moderator by verified authority events, decided at read time. The cabildeo's author is not enough. |
| C2 | **Only forum and persuasion, and not drafts.** A missing kind is an activity. Public view tier only for now. |
| C3 | **The record names the board** the cabildeo resolves to. The AppView returns that URI (`communityUri`) from `getConclusion` even when there is no conclusion yet, so a client writes it verbatim. |
| C4 | **History is append-only.** The newest conclusion by a current steward is shown; the others come back as `earlier`, newest first. A correction is a new conclusion. The first version of each record is kept: an edit is served as first written and flagged `edited`. |
| C5 | **`createdAt` is committed** with the first version and served no later than its first-indexed time, so an edit or a future date cannot reorder anything. |
| C6 | **It must cite honestly.** `cited` lists positions of the same cabildeo (at most ten). A citation that is not a position is rejected at index time; one that belongs to another cabildeo is dropped at read time. Positions carry no vote score, so none is shown. |
| C7 | **Deleting is a retraction.** A deleted conclusion disappears; its commit row stays so a re-index cannot change what it said. |

## Data

`com.para.civic.conclusion` (record, key `tid`): `cabildeo`, `communityUri`,
`text` (1500 graphemes), `cited[]`, `followUp` (a cabildeo opened because of it,
never created automatically), `createdAt`.

`com.para.civic.getConclusion` (query, `cabildeo`): `{conclusion?, earlier[],
communityUri?}`. The cabildeo view (`getCabildeo`, `listCabildeos`) also gained
`kind`, so a client knows what it is looking at.

AppView: table `para_conclusion`, plugin `para-conclusion.ts` (reuses the commit
helper of Seguimiento), reader `routes/conclusion.ts`, pure rules in
`conclusion.ts`, data-plane RPC `GetParaConclusion`.

## Client

- `src/features/conclusion/`: `ConclusionSection` on `CabildeoDetailScreen`
  (after the result area, before Seguimiento), `ConclusionComposer` for
  stewards, rules in `conclusion.ts`.
- Readers see the text, who wrote it and when, the cited positions, an edited
  notice, and an "earlier conclusions" toggle. It says plainly that it is not a
  voted result. Nothing is drawn when there is no conclusion and the viewer
  cannot write one, and a failed read offers a retry.
- A steward (by `useCommunityOrganizers`, using the board URI the AppView
  returned) sees "Escribir una conclusión", or "Escribir una nueva" when one
  exists, never an edit. The composer can cite positions. After publishing it
  says the conclusion will appear once indexed and looks again after a few
  seconds; it is not shown as published before then.
- Creation: `CreateCabildeoScreen` has a kind selector with **Actividad** and
  **Foro**. A forum needs a place (the geographic scope) and has no options.
  **Convencer (persuasion) is not offered**: it needs a policy picker for
  `subject`. Until it exists, persuasion conclusions can only attach to
  cabildeos created elsewhere.

## Not done

- Persuasion creation flow (needs `subject` and a policy picker).
- Tier-aware visibility (public cabildeos only, as in Seguimiento phase 1).
- A kind label or chip on cabildeo cards; the card chip and filters.
- `followUp` is in the record but no screen sets or shows it.
- Everything is unverified visually. A forum with zero options on the detail
  screen has not been looked at; the options and voting areas may show empty.
