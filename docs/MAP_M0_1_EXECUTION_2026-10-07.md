# M0.1 — map data honesty and mobile/web foundations

Date: 2026-10-07 (local). Source baseline: PARA `d00c7e514`.
Scope: PARA only; no backend, lexicon, dataset or deployment changes.

| State | Evidence |
| --- | --- |
| Implemented | Local working-tree changes listed below |
| Tested | Focused iOS/Android Jest suites, MapLibre browser flows, scoped lint and catalog checks |
| Merged | No |
| Deployed | No; local development preview only |
| M0.1 acceptance closed | No; native runtime and configured-Google checks remain |

## Result

- Shared state, city and district sheets and district profiles disclose demo
  statistics/officeholders. Unsourced statistics, party indicators and
  officeholders are suppressed when preview data is disabled. Existing service
  configuration enables previews in development or through
  `EXPO_PUBLIC_USE_MOCK_DATA=true`; release builds should omit that override.
- Generated district shapes remain illustrative and carry a visible warning.
  No official electoral boundary edition has been imported. City facts remain
  undated preview data; no residence or voting eligibility is inferred.
- A map-specific query preserves source, demo fallback reason and pagination
  coverage. Loading, real empty, failure, stale data, demo and incomplete reads
  have distinct messages. Retry is available; a failed refresh retains already
  loaded real records. Counts are unknown before a successful read and partial
  positive counts use a lower-bound marker.
- Query caches partition by viewer DID and retain the existing civic-list
  invalidation prefix. The previous array API remains compatible for other
  consumers. The existing 20-page read cap is unchanged and now exposed.
- City activity requires an explicit city and matching state. District activity
  requires an explicit district key, including legacy plural keys. Statewide
  discussions no longer count as district activity. District profile previews
  open the real cabildeo URI through `CabildeoDetail`.
- Sheets scroll at phone sizes; controls use a measured stack, close controls
  have localized accessibility labels/hints, and primary small actions have
  44-point targets. District route selection now updates the active map layer;
  web layer tabs expose their selected state through ARIA.
- Google web preferences without a configured key render MapLibre. Configured
  builds pass `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` into the Google adapter;
  stored preferences and the native provider remain unchanged.
- Added 36 source messages to the 42 supported Lingui catalogs. Spanish messages
  are translated; other locales fall back to English for untranslated additions.
  Compiled catalogs preserve existing translations.

The development preview also required correcting stale Lightbox and Sentry
imports and transpiling two local React Native packages in webpack. These are
startup fixes, not a general upstream-sync cleanup.

## Checks run

Focused Jest command (substitute `ios` or `android` for the preset):

```sh
NODE_ENV=test corepack pnpm exec jest --preset jest-expo/ios --runInBand --forceExit \
  src/lib/api/__tests__/cabildeo-coverage.test.ts \
  src/state/queries/__tests__/cabildeo.test.ts \
  src/state/queries/__tests__/map-cabildeos.test.ts \
  src/screens/Map/__tests__/MapComponents.test.tsx \
  src/screens/Map/__tests__/mapData.test.ts \
  src/screens/Map/__tests__/webMapProvider.test.ts \
  src/lib/hooks/__tests__/useMapProvider.test.ts
```

Both presets: **7 suites, 44 tests passed each**. Tests cover release-mode data
behavior, demo labeling, retry/stale/partial notices, place scope, viewer cache
separation, real-data retention and missing-key fallback. Jest uses the
project's force-exit convention; these are mocked component/query checks.

Browser command:

```sh
corepack pnpm exec e2e run tests/map-maturity.e2e.ts --target para-web
```

MapLibre flows cover 1280×900 desktop and 390×844 phone-sized web layouts,
forced service failure, retry to a successful empty read, district selection
and visible provenance: **2 tests passed** in the final run. The desktop flow
also checks the route-selected tab.
Runtime screenshots and the latest report are generated under `.e2e/` and are
ignored by Git. Requests are intercepted; this is not real-backend acceptance.

Scoped oxlint: **no errors**, with warnings in existing map/provider code and
test mocks. Catalog compilation succeeded; all 36 additions exist in source
and compiled catalogs for every supported locale, with pre-existing compiled
translations preserved. `git diff --check` passed.

Full client typechecks were run for web, iOS and Android. They are **not green**:
22 web and 25 native diagnostics remain outside the changed map implementation
and its tests. Examples include missing feed/error exports, session/API argument
drift, Settings update methods, analytics naming and post/avatar props. None of
the final diagnostics points to the map implementation or added map tests.
The web development bundle compiles with four existing warnings, including
missing feed/error exports and the Google wrapper's deprecated location API.

Local command: `corepack pnpm web --port 8082`.
Preview: `http://localhost:19006/map?state=Sinaloa&layer=districts`.

## Remaining acceptance and next slice

- Run actual supported iOS/Android builds: state/city/district exploration,
  scroll reachability, touch targets, provider gestures, retry and profile links.
  No booted simulator or native runtime test was used in this record.
- Verify a valid-key Google web build. The fallback path is tested; configured
  Google rendering, camera and provider switching are not accepted yet.
- Verify a production build with preview data disabled and a real AppView.
  Query tests validate release decisions; browser tests use a development build.
- M0.2: camera framing/preservation, responsive transitions, provider lifecycle,
  layer-click callbacks, keyboard/Escape behavior and measured performance.
- M1.1: official dataset manifest and pilot-state boundary import. Current
  generated geometry and seeded facts remain unsuitable for jurisdiction claims.

Rollback: revert this slice's source and catalog edits together, preserving
unrelated checkout changes. The backend schema and existing array-query contract
are unchanged. Reverting only the map query without its consumers is unsafe.
