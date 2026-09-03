# Quarter Plan — Map: Real Data on Real Geography (Dec 1, 2026 – Feb 27, 2027)

Feature-specific plan for the PARA map (states / districts / cities / civic
activity layers), covering the quarter after the pilot launch. It deliberately
starts after [QUARTER_PLAN_2026Q4.md](../../WatZappa/docs/QUARTER_PLAN_2026Q4.md)
(Sep 1 – Nov 27) ends: Q4 is committed to the pilot community and, by
convention, anything not listed there is explicitly deferred — including this
map work. The performance and location-strategy items build on
[propuesta-refactor-mapa-ubicacion.md](./propuesta-refactor-mapa-ubicacion.md)
(draft v2, unassigned until now). S1/S3 need new AppView aggregates in
WatZappa (`com.para.*` XRPC + `make codegen` on lexicon change). Capacity:
solo 1 FTE, serial critical path.

## North star

**The map shows real civic data on real geography**: state summaries computed
from actual platform activity (no `STATE_DEMOGRAPHICS.default`), federal
districts drawn with INE boundaries instead of placeholder hexagons, and
activity density aggregated server-side instead of a client-side color tint.
Explicitly *not* non-Mexico geography and *not* app-store polish.

## Sprints

### S0 (Sep 2, 2026, shipped early) — UX debt
Pulled forward from S1 because the screen was unusable in the field:
- State summary sheet: swipe-down-to-dismiss (pan gesture with offset +
  velocity thresholds, spring-back on interrupted drags, shared animated exit
  for the × button).
- Overlay alignment pass: zoom cluster no longer collides with the bottom
  overlays, cities/districts panel respects the bottom safe-area inset, VIEW
  panel yields to the expanded search results.
- Animation pass: the six `springify().damping(15–16)` entries replaced with
  gentle timed entries — overlays previously vanished with no exit animation.

### S1 (Dec 1–12) — Real state summaries
- WatZappa: AppView aggregate endpoint for per-state dominant party, leading
  community, approval, and active-member counts, computed from real records
  (posts, cabildeos, communities) rather than the 5-state mock + `default`
  fallback in `src/lib/constants/mockData.ts:676`.
- PARA: `useCabildeosQuery`-style hook on top of the new endpoint; mock stays
  only for `__DEV__` empty states.
- Define what "approval" means when it is computed from real data (source
  signals + recency window), since the mock number (42%) currently has no
  definition at all.

### S2 (Dec 15–24) — Real district geometry
- Replace the placeholder hexagon `boundary` in
  `src/lib/constants/electoralDistrictsData.ts` (TODO at line 38) with the INE
  300-district GeoJSON, simplified for render cost.
- Verify the existing native viewport culling against real polygons; keep the
  preview-mode disclosure in-app per the Q4 plan's INE deferred row
  (institutional approval remains an external dependency).

### S3 (Jan 5–16) — Civic activity density v2
- WatZappa: server-side per-state and per-district activity aggregation
  (cabildeos + posts), replacing the client-side count-and-tint choropleth
  flagged in the refactor draft ("the discourse heatmap layer is only a color
  tint").
- Wire the Civic layer and the heatmap filter to the new aggregate; the
  discourse lens content reads from the same source.

### S4 (Jan 19–30) — Location completeness
- Finish the `findClosestCity` stub (`src/geolocation/geoScope.ts:69`) and
  complete city-coordinate coverage (`mexicoCityCoordinates.ts` is a subset).
- Tiered location strategy + `LocationPermissionGate` per the refactor draft
  Fase B.
- Clamp the default viewport to Mexico so the first paint is the relevant
  geography instead of a continent view.

### S5 (Feb 2–13) — Performance refactor
- Polygon simplification / tiled interactivity per the refactor draft's
  4-phase plan (300+ polygons + markers jank on low-end hardware).
- Pin clustering for dense clusters (a state with many active cabildeos
  currently renders overlapping markers).

### S6 (Feb 16–27) — Polish + buffer
- Web parity sweep of the map overlays (shared files, no `.web.tsx` variants).
- Component test coverage beyond the S0 render tests.
- Buffer only — no new scope.

## Explicitly deferred (with reasons)

| Item | Reason |
| --- | --- |
| Official civic entities repo-backed (`com.para.official.*`) | Awaits the backend space/host decision; mock-backed today |
| Non-Mexico geography (US basemap tiles when zoomed out) | Out of product scope; S4 clamps the viewport instead |
| Offline map tiles | No pilot or Q1 use case |
| Discourse topology lens v2 | Depends on S3 aggregates landing first |
| INE institutional approval | External dependency (tracked in the Q4 plan); S2 ships public cartography with in-app disclosure |

## Standing risks

- **INE cartography availability/licensing** — if public GeoJSON stalls, S2
  degrades to better placeholder geometry and the sprint swaps with S4.
- **Solo-dev serial capacity** — December pilot follow-through from Q4 can
  eat S1; the quarter has one buffer sprint, not one per sprint.
- **Gesture regressions on Android** — the S0 pan gesture runs on
  reanimated + gesture-handler; verify against the OS back gesture and map
  panning before S1 builds on top of it.
- **Mock fallback masking prod gaps** — `STATE_DEMOGRAPHICS.default` and
  `USE_MOCK_DATA` can hide missing data in release builds; S1 must make the
  empty state explicit rather than silently defaulting.
