# PARA typecheck debt — classification

Week 1 deliverable of `plans/chat-review-and-month-plan-2026-09-20.md`:
"clasificar los errores de PARA; resolver los que impidan construir el piloto y
registrar explícitamente el resto."

Measured 2026-09-20 on Node 24.18.0 (`.nvmrc`).

## Why this is not cosmetic

`pnpm typecheck` gates CI **and the OTA deploy**:

- `.github/workflows/lint.yml` runs `typecheck:ios`, `typecheck:android` and
  `typecheck:web` as matrix jobs.
- `.github/workflows/bundle-deploy-eas-update.yml` runs `pnpm typecheck` before
  the EAS setup and publish steps, with no `continue-on-error`.

So while these are type errors and not crashes, they keep CI red and block the
OTA channel — which is the pilot's delivery mechanism. "Type-only" below means
"no runtime effect", never "no consequence".

## Counts

| Target | Before | After | Removed |
| --- | --- | --- | --- |
| `typecheck:ios` | 265 | 155 | 110 |
| `typecheck:android` | 265 | 155 | 110 |
| `typecheck:web` | 132 | 113 | 19 |

Test suites are unchanged by this work: 977 passing / 6 failing before and
after, verified by running the suite against a stash of these changes. The six
failures are pre-existing environment issues (`Platform.Version` undefined in
the jest environment, and the `.env.local` leak in `bridge.test.ts`).

## Resolved

**Dead `@discord/bottom-sheet` path removed (93 errors).** The largest single
cluster, and not PARA code: a Bluesky fork imported as raw source
(`@discord/bottom-sheet/src`), so `skipLibCheck` never applied. It targets the
Reanimated 2/3 API against the installed 4.6.0 — `useWorkletCallback`,
`useAnimatedGestureHandler` and `SharedValue` are absent from 4.6.0 **at
runtime too**, not just from its types, so it would have thrown on import.

Upstream replaced it with an in-repo native Expo module at
`modules/bottom-sheet`, which is what PARA actually uses (`App.tsx`,
`state/dialogs`, `Prompt`, `Dialog`). The legacy path survived only because it
was unreachable: nothing imported `ModalsContainer`.

Deleted, after confirming zero references from anywhere outside the subtree
itself:

- `src/view/com/modals/` — `Modal.tsx`, `Modal.web.tsx`, `util.tsx`,
  `util.web.tsx`, `DeleteAccount.tsx` and the three `lang-settings/` components
- `src/view/com/util/BottomSheetCustomBackdrop.tsx`
- `src/state/modals/` — the store behind it, orphaned once the views went
- the `@discord/bottom-sheet` dependency, and its lockfile entries

**Restored a half-applied upstream feature (1 error, plus a real gap).**
`AlgoVisibilityOptOut.tsx` imported `#/state/queries/content-visibility`, which
did not exist. It was not aspirational code: the i18n catalogs still referenced
`content-visibility.ts:83`, so the file had existed and been lost.

It came from upstream commit `0ba971b1f` ("APP-2774: Add algorithmic visibility
setting"), which touched seven files. Only some of them survived into `HEAD` —
no commit deleted the others, which makes this a casualty of the auto-merge
recovery the quarter plan flags as a standing risk.

| File | State before |
| --- | --- |
| `lexicons/app/bsky/actor/contentVisibilityDeclaration.json` | lost |
| `src/state/queries/content-visibility.ts` | lost |
| `PrivacyAndSecuritySettings.tsx` wiring | lost |
| `AlgoVisibilityOptOut.tsx` | survived, orphaned |
| `Features.ContentVisibilitySettingsEnable` | survived |
| `contentVisibility:…:change` metric | survived |

Restored the lexicon and the query module from that commit, regenerated
`src/lexicons`, and re-wired the component into Privacy & Security behind the
feature flag that was already there. The query module needed one adjustment:
`repo` now takes a branded `AtIdentifierString`, so the DID is narrowed the way
the rest of the repo does it (`activity-subscriptions.ts`, `liveNow`). That
narrowing is not the kind of cast warned about below — it tightens a plain
string into its branded form, rather than forcing two different generators'
types together.

Worth checking whether that commit was the only casualty. Nothing here proves
it was.

**Undeclared analytics events (11).** `analytics.metric(...)` was called with
eleven event names absent from `Events` in `src/analytics/metrics/types.ts`:
the seven-step `community:create:*` funnel, `postSubscription:enable`/`disable`,
and three `search:paraFilter:*` events. Every call site failed to typecheck and
the funnels were untyped. Declared with the payloads their call sites pass.

This one is pilot-relevant beyond the error count: the community-creation
funnel is how a pilot community gets onboarded, and none of it was typed.

**PARA nav destinations missing from `nav:click` (5).** The `item` union came
from upstream and never grew to cover `data`, `communities`, `compass` or
`explore` — PARA's own destinations, including the communities entry the pilot
runs through. Added.

## Recorded, not resolved

### 1. Two `PostView` types — 28 errors

```
Type 'node_modules/@atproto/api/.../feed/defs".PostView'
  is not assignable to
Type 'src/lexicons/app/bsky/feed/defs.defs".PostView'
```

This is the in-flight SDK migration, not a bug: the legacy `@atproto/api`
client types and the generated `@atproto/lex` types describe the same wire
shape through two generators. Errors follow the seam between migrated and
unmigrated call sites and will disappear as the migration completes. Do not
paper over them with casts; a cast here hides a genuine mismatch later.

### 2. React Native strict-API churn — 24 errors

Recognisable by the enormous `Omit<Readonly<Omit<...>>>` expansions. Component
ref and prop types changed under `customConditions: ["react-native-strict-api"]`
— `PublicScrollViewInstance` vs the old component-instance ref, `TextInput`
props, `TextInputType` missing `focus`/`clear`. Type-only: the runtime objects
still carry the methods.

Affects `CommunitiesScreen`, `CabildeoDetailScreen`, `CreateCabildeoScreen`,
`CreatePositionScreen`, `DelegateVoteScreen`, `ViewSelector`,
`HighlightableRichText` and the Storybook forms. Mechanical but repetitive; fix
per-file when touching a file for other reasons.

### 3. Unregistered route params — ~8 errors

`route.params` resolves to `Readonly<unknown>` in `src/screens/CustomFeed/*`,
so `.rkey`, `.name` and `.feedCacheKey` are all "does not exist". The route is
missing from the navigator param list. Runtime works — the params are really
there — but the screen has no type safety at all. Cheap to fix by registering
the route; grouped here because it is a navigation-types change, not a
typecheck cleanup.

### 4. Long tail — ~90 errors

`useOTAUpdates.ts` (10, reading fields off a union that includes `Geolocation`),
and roughly eighty one- and two-error files. No shared cause. Type-only as far
as inspection goes; each needs its own look.

## Suggested order for what is left

1. Register the `CustomFeed` route params — ~8 errors, restores type safety on
   a screen that currently has none.
2. RN strict-API churn — 24, mechanical, parallelisable.
3. Let the `@atproto`/lex seam close with the migration; do not cast.
4. Long tail, opportunistically.

CI stays red until the whole set is clear, so if the OTA channel is needed
before then, that requires its own decision — not a silent
`continue-on-error`.
