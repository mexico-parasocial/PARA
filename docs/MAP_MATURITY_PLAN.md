# Map maturity and civic atlas plan

Updated: 2026-10-07. Status: M0.1 implemented locally with focused tests;
native device and configured-Google acceptance remain open. Working product direction: a civic atlas that also supports
local participation and, later, territorial analysis. Adjust the order of the
later features if a different product direction is chosen.

This is the current **map-specific planning entry point**. It supersedes the
remaining-work schedule in [MAPLIBRE_MONTH_PLAN.md](./MAPLIBRE_MONTH_PLAN.md)
and the implementation proposals in
[propuesta-refactor-mapa-ubicacion.md](./propuesta-refactor-mapa-ubicacion.md).
Their historical decisions and evidence remain useful.

Map work remains outside the committed
[Q4 pilot queue](../../WatZappa/docs/QUARTER_PLAN_2026Q4.md). One engineering
lane means map work consumes capacity otherwise available to that queue.
The phases below are ordered outcomes, not promised calendar deadlines.

## Product outcome

A person can select a place, understand the geography and available evidence,
discover its communities and civic discussions, and enter an existing
participation flow. The same task works through a searchable list when the
map canvas is inaccessible or unavailable.

The map grows in four dimensions:

| Dimension | What the user gains |
| --- | --- |
| Geographic depth | States, municipalities/localities and electoral districts with explicit identities and boundary editions |
| Civic depth | Place-linked communities, cabildeos, issues and organizer-published activities |
| Analytical depth | Explainable counts, time windows, comparisons and evidence sources |
| Reliability | Predictable selection, readable layers, accessible navigation and graceful recovery |

Example journey: search Guadalajara → select the intended municipality or
locality → inspect its available context → filter water-related discussions
and communities → open a cabildeo or organizer-published activity. A saved
view can reopen that context. Available coverage and missing data are visible.

## Evidence baseline

Scoped source inspection of PARA `d00c7e514` on 2026-10-07; the checkout was
clean before these documentation edits. No runtime, device, performance or
deployment checks were run for this planning task. Existing implementations
and test files below are source evidence, not acceptance results.

| Area | Present in source | Remaining maturity work |
| --- | --- | --- |
| Navigation | State/district/city selection, search history, route parameters, desktop sidebar and narrow drawer | Consistent state transitions; richer shareable filters; camera preservation across provider changes |
| Web rendering | Google and MapLibre adapters; style reload synchronization, layer order and existing civic clustering | Regression harness, error recovery, stable source updates, keyboard access and provider parity |
| Native rendering | `react-native-maps` adapter and shared screen behavior | Verify capabilities and clustering on actual supported iOS/Android builds; no native MapLibre migration assumed |
| Geography | State GeoJSON; 300 district entries; curated city coordinates | District shapes are generated hexagons; district statistics/deputies are seeded; city facts lack source dates |
| Civic content | `useCabildeosQuery`, topic/flair filtering, regional counts and geocoded civic points | Query fetches pages into one client list; demo fallback is possible; loading/error/partial coverage must be explicit |
| Location | Permission gate, coarse/accurate/watch utilities and scope-based coordinate policy already exist | Screen integration and lifecycle acceptance; state/district resolution currently relies on nearest district centroid; closest-city helper is unfinished |
| Coverage | Map overlay and provider preference tests exist | No dedicated `MapLibreWeb` or shared map-screen test file found in the scoped inspection; current results unverified |

Relevant files:

- `src/screens/Map/MapScreen.shared.tsx` (~1,858 lines): selection, route
  synchronization, geometry preparation, filters, civic counts and layouts.
- `src/screens/Map/MapLibreWeb.tsx` (~1,005 lines): provider lifecycle and layers.
- `src/screens/Map/MapComponents.tsx`, `MapSidebarContent.tsx` and
  `DistrictProfileScreen.tsx`: place details and controls, including static facts.
- `src/lib/constants/{electoralDistrictsData,mexicoCityData,mexicoCityCoordinates}.ts`.
- `src/geolocation/geoScope.ts`, `src/geolocation/hooks/` and
  `src/lib/api/para-lexicons.ts`.
- `src/state/queries/{cabildeo,community-activities,community-activity-explorer}.ts`.

## Decisions that guide implementation

1. **Trust precedes analytical depth.** Hide unsourced production facts or mark
   them unavailable. Demo data carries a visible demo label. Every factual
   indicator needs source, date, unit, coverage and territorial edition.
2. **Keep two geographic systems explicit.** State → municipality/alcaldía →
   locality is a navigation hierarchy. Electoral districts overlay that
   geography; districts and municipalities are not interchangeable. Curated
   city points do not become municipality boundaries automatically.
3. **Use stable territorial IDs.** Retain official codes as strings, including
   leading zeroes. Add boundary edition/effective dates. Map existing numeric
   district links and `districtKey` values through a documented crosswalk;
   keep old links working. Disclose ambiguous or unavailable mappings.
4. **Separate device location, content location and eligibility.** Centering a
   map uses transient location. Content uses its explicit publication scope.
   GPS, proximity, a map pin or identity verification alone grants no voting
   entitlement and proves no residence.
5. **Reuse the existing stack.** Alf atoms/theme, Lingui, React Query and
   AppView/lexicon contracts remain the foundation. Extract responsibilities
   incrementally; avoid a wholesale screen rewrite.
6. **Maintain supported-client behavior.** Start with the current web providers
   and native adapter. A provider/default change needs measured parity and a
   reversible rollout. MapLibre's standard view is tile-free but the style
   specifies an external glyph host; inventory font, tile, script and geocoder
   requests before making privacy claims.

## Ordered delivery phases

Effort ranges are rough solo engineering estimates in focused weeks, with
substantial uncertainty. Dataset acquisition, licensing/access, backend work
and device availability may extend them. Re-estimate after the first slice;
do not turn these ranges into release dates.

### M0 — honest and predictable map (1–2 focused weeks)

User outcome: existing exploration behaves consistently and clearly explains
what its data represents.

- Audit displayed map facts only. Label generated district geometry and demo
  facts; suppress unavailable facts in the selected real-data build. Static
  city officeholders and population values need provenance before release.
- Show loading, empty, error, stale and incomplete-coverage states for civic
  content. A backend failure must not look like zero civic activity.
- Regression coverage for missing-layer clicks, current callbacks, style
  changes, layer stacking and selection through routes/search/sheets.
- Preserve selection and camera across resize and provider changes; camera
  framing accounts for sidebar/drawer/sheet space. Add keyboard controls and
  Escape behavior, reduced-motion camera transitions and larger touch targets.
- Inventory outbound hosts and existing layer capabilities; record baseline
  timings on a named laptop and supported native devices.

Exit: a reproducible selection/style/provider journey passes; a forced data
failure has a retry state; generated/unsourced data cannot appear as verified
facts. Record supported-client checks and actual performance baseline.

### M1 — trustworthy territorial foundation (2–4 focused weeks)

User outcome: boundaries and place identities are usable for real exploration.

- Select and acquire an official district edition and municipal/locality
  datasets. Start with one pilot state for detailed coverage; retain existing
  national navigation with honest coverage labels.
- Build a reproducible import: original source URL, retrieval date, terms and
  attribution, checksum, original coordinate reference system, transform to
  WGS84, topology validation and versioned output manifest.
- Support MultiPolygon geometry and holes. Derive bounding boxes and interior
  label points; separate full-resolution containment geometry from simplified
  rendering geometry. A centroid must not determine jurisdiction.
- Add stable IDs, display names/aliases, relationships and edition crosswalks.
  District ↔ municipality relationships may be many-to-many. Unknown places
  remain unknown; points on a boundary or outside Mexico need defined behavior.
- Replace nearest-placeholder district/state resolution with containment in
  validated geography. Repair city lookup against canonical IDs/coordinates.
  Reuse existing location utilities; accept denial, timeout and stale fixes.
- Separate geographic facts from civic records and provider rendering. Extract
  selection/route logic and geography selectors with focused behavior checks.

Exit: the pilot state has sourced real district boundaries; fixtures cover
interiors, holes, boundary ambiguity and outside-country coordinates; legacy
links resolve predictably; data import can be reproduced from its manifest.

### M2 — place-centered civic discovery (2–3 focused weeks)

User outcome: a selected place answers “what is happening here, and where can
I participate?”

- A place sheet has Overview, Discussions, Communities and Activities, with
  progressive detail. Existing district profiles and community screens remain
  destinations; avoid parallel copies of their business logic.
- Link content through explicit territorial IDs/scope. Distinguish the place
  discussed from an event venue or author location. Region-only content stays
  in the place list/count and is never assigned an invented exact pin.
- First overlays: cabildeos and geographically declared communities. Add
  organizer-published activities only where a usable geographic association
  exists. New fields or endpoints require paired lexicon/AppView work.
- Keep geography layers, content overlays and thematic filters separate.
  Add legends, visible result counts, active-filter chips and clear-filter
  behavior. The list and map represent the same filters and coverage.
- Reuse AppView-authorized community activity reads and trusted organizers.
  Representatives need a sourced territorial mandate/current term; a community
  governance role is not proof that someone is a public elected officeholder.
- Primary actions open an existing discussion, community, activity or composer
  with geographic context. Existing authentication, permission and governance
  gates still decide what the person may do.

Exit: a real pilot fixture completes place → filtered content → existing civic
flow; unavailable categories explain their state; unauthorized/revoked content
does not leak through map pins or list results.

### M3 — scalable rendering and data (2–3 focused weeks)

User outcome: more places and content fit without sluggish or misleading maps.
Move bounded-query work earlier if M2 data volume already exceeds the baseline.

- Add a map read contract for bbox or territorial scope, zoom/aggregation level,
  content types, topic, time window, cursor and coverage/completeness metadata.
  Coordinate PARA and WatZappa changes; these endpoints are proposed, not
  existing API promises. Return authorized, bounded results and server totals.
- Cancel superseded requests and debounce camera-settled fetches; bound cache
  growth. A pagination cap must produce a partial-result label, not an exact
  territorial total. Viewer-dependent queries partition by DID.
- Keep static geometry sources stable; update selection through feature state
  where supported. Reuse existing civic clusters. Add zoom-dependent density,
  label collision rules and deterministic hit priority.
- Correct viewport culling so a polygon containing the viewport remains
  visible even when none of its vertices is on screen.
- Lazy-load provider assets after checking transitive static imports. Evaluate
  versioned vector tiles for detailed static boundaries if real-data profiling
  warrants them. Native rendering remains a separate capability decision;
  UTFGrid is not a mandatory architecture.
- Select street-context hosting only after attribution, permitted use, request
  footprint and cost are recorded. Resolve hybrid-label behavior explicitly.
- Recover from WebGL/context loss, style/tile/font failures and offline periods;
  keep a usable list and indicate which cached records are stale.

Exit: named-device load tests pass agreed budgets; panning does not fetch a
global civic list; rapid filters cannot display stale responses as current;
provider/font/tile failure preserves the list and a recovery path.

### M4 — explainable comparisons and continuity (2–4 focused weeks)

User outcome: users can follow local issues over time and compare places fairly.

- Saved places/views and share links preserve selected place, territorial
  edition, layers, filters and time window. Migrate the current route shape
  compatibly; precise device coordinates never enter a shared URL.
- Add 7/30/90-day activity windows and side-by-side place comparisons only for
  metrics with timestamps, source coverage and compatible geography editions.
- Distinguish counts, map density and normalized rates. Population-based rates
  need a sourced denominator of a compatible vintage. Display units, legend,
  missing values and freshness; keep scales fixed within comparisons.
- Explain that PARA activity measures observed platform content/participation,
  not public opinion. No unsupported “civic health” score or electoral-weight
  inference from delegation registrations. Private voting remains behind its
  separate governance and privacy gates.
- Export aggregate results with source/method notes and applicable access
  controls. Follow-place notifications are a later opt-in extension requiring
  notification semantics, delivery infrastructure and abuse controls.

Exit: shared views reconstruct their state; comparison fixtures reproduce
published counts; incompatible or missing data cannot produce a false ranking.

### M5 — operational maturity (1–2 focused weeks, then ongoing)

User outcome: the atlas remains reliable as datasets, providers and civic data change.

- Complete accessibility and device acceptance: keyboard-only/list navigation,
  screen readers, touch targets, contrast, dark/dim themes and reduced motion.
- Automate geographic dataset version checks and publish audited updates with
  retained previous editions. Officeholder data requires term and source refresh
  ownership; unsourced refreshes do not overwrite trusted facts.
- Add operational metrics for render/data failures, latency, query volume and
  dataset freshness without raw location, private-content or search-text logs.
- Roll out new layers/provider defaults behind reversible flags, record actual
  environment and revisions, and verify rollback/fallback with staged failures.

Exit: release acceptance record, provider/data runbook, refresh ownership,
monitoring and rollback evidence. A merged feature alone does not close this phase.

## Current execution

**M0.1: visible data provenance and civic query states** is implemented in the
local PARA checkout. Read [the execution record](./MAP_M0_1_EXECUTION_2026-10-07.md)
for changes, actual checks and outstanding acceptance. It is not merged or deployed.

Remaining M0.1 acceptance: exercise the sheets, retry and district profile on
supported iOS/Android devices and a Google web build with a valid configured
key. Browser checks currently cover MapLibre at desktop and phone widths;
native checks are component/query tests, not device results.

Next implementation: M0.2 covers provider/selection regression checks and camera behavior.
M1.1 begins with the official dataset manifest and one-state boundary import.
Do not generate replacement demo polygons as an intermediate geography milestone.

## Acceptance budgets and privacy contract

Provisional performance targets, to confirm or revise after M0 measurements:
warm selection feedback p95 ≤150 ms; usable geography p95 ≤2 s under a named
device/network profile; sustained pan ≥50 fps on the reference laptop and
≥30 fps on the lowest supported native device. Test national overview, the
pilot state's full detail and a synthetic 10,000-public-point load. Prefer
aggregation and bounded requests over shipping all those points to every device.
Record bundle/memory/request baselines and set explicit limits before M3 closure.

Privacy rules apply from the first new overlay:

- Raw device fixes remain transient; permission denial leaves manual selection
  fully usable. Clear location state on logout/account switch and clean up watchers.
- Public pins use the record's permitted scope; rounding/grid snapping alone
  does not establish anonymity. The existing exact neighborhood path needs
  publication-consent and backend-policy acceptance before broader exposure.
- Aggregate access is authorized server-side. Small-count suppression and
  repeated-query protections need a documented threat model before releasing
  sensitive breakdowns; no arbitrary threshold is claimed safe in this plan.
- Never put private records or viewer credentials in public/cacheable tile
  archives. Keep dynamic private reads separate from public static geometry.
- Device fixes, private activity and map viewport are not voting authority.
  Never infer effective electoral power from candidate/delegation counts.

## Decisions and expansion backlog

Decide during the relevant phase, with a concrete candidate and evidence:

| Decision | Needed by | Default working assumption |
| --- | --- | --- |
| Primary product direction | Before M2 | Civic atlas; participation next, analysis after provenance |
| Pilot state and official dataset edition | M1 | One state in depth; national overview retains coverage labels |
| Published content-location semantics | M2 | Explicit geographic scope; no author-home inference |
| Map API and static asset hosting | M3 | AppView for authorized dynamic reads; versioned public geography |
| Street tiles and provider/default | M3 | Preserve current providers until parity/cost/privacy evidence |
| Analytics definitions and sensitive aggregates | M4 | Transparent counts first; sensitive metrics stay gated |

After M2, candidate extensions include municipality coverage across Mexico,
local issue collections, sourced officeholder mandates, public venues and
community-declared service areas. Choose one extension per delivery slice.
Neighborhood detail, infrastructure/environmental datasets, historical boundary
comparison and live events each need their own source, privacy and operational
acceptance. 3D, live people tracking and a universal heat/ideology score have
no committed scope here.

## Execution and closure

Deliver one reviewable slice at a time. Each execution record includes scope,
changed repositories, source revision, tests and client/device results,
dataset edition, deployment environment, known limits and rollback steps.
Track **implemented / tested / merged / deployed** separately. Remove completed
actions from the active queue only after their acceptance closes, retaining
their evidence in a linked record. Future agents should read this plan and the
next slice rather than repeating the whole map audit.

## Primary references checked for this plan

- [INE electoral geography](https://ine.mx/voto-y-elecciones/especializados/):
  starting point for acquiring official electoral products; exact edition,
  available format and redistribution terms still require verification.
- [INEGI Marco Geoestadístico](https://www.inegi.org.mx/programas/mg/default.html):
  vector products have edition-specific metadata and supporting documentation.
- [INEGI geographic code catalogue](https://www.inegi.org.mx/app/ageeml/default.html):
  canonical state, municipality and locality identifiers.
- [MapLibre large-data guidance](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/):
  simplification, clustering and vector tiles are options to evaluate against
  measured loads. They are not verified PARA performance results.
