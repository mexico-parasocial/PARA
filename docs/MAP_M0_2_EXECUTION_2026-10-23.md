# M0.2 — MapLibre regression harness and camera framing

Date: 2026-10-23 (local). Scope: PARA web map (MapLibre adapter) only; no backend,
lexicon, dataset or deployment changes. Follows
[M0.1](./MAP_M0_1_EXECUTION_2026-10-07.md).

| State | Evidence |
| --- | --- |
| Implemented | Local working-tree changes listed below |
| Tested | Focused iOS-preset Jest suites with a fake `maplibre-gl`; a MapLibre browser pass at 1440 px and 820 px (below) |
| Merged | No |
| Deployed | No |
| M0.2 acceptance closed | No; phone width, keyboard-only and provider-switch checks remain |

## Result

- **Regression harness.** `src/screens/Map/__tests__/MapLibreWeb.test.tsx` runs the
  adapter against a fake `maplibre-gl` that keeps the three library behaviours that
  caused earlier defects: `queryRenderedFeatures` returns nothing if any requested
  layer is missing; `setStyle` discards custom layers until `style.load`; and
  `addLayer(layer, beforeId)` inserts below `beforeId`. Covered: layer stacking at
  load and after polygons are replaced, clicks when optional layers do not exist,
  marker-over-polygon priority, district selection, handlers kept current across
  renders, overlay restore after a basemap change, no style reload on first render,
  and the click query box.
- **Camera framing.** Place camera moves (state, city, district) pass the area the
  overlay panel covers (`getPanelInsets`: 400 px on the left on wide layouts, 300 px
  at the bottom on narrow ones). The adapter frames the target in the remaining
  space; the fit margin is the larger of 48 px and the panel inset. Resetting to a
  region clears the padding. Native and Google callers pass no padding and are
  unchanged. The 300 px bottom value is an estimate of the narrow-layout card height.
- **Click tolerance.** A click queries a box around the pointer (6 px, 14 px on a
  coarse pointer) instead of a single pixel, so small city/district dots and thin
  outlines are easier to hit. Top-most layer still wins.
- **Camera memory.** The map remembers where it stopped; a new map instance (for
  example after switching provider in Settings) opens there instead of at the
  national overview. Route-driven selections still move the camera afterwards.
- **Browser pass fixes** (found by running the map signed out, which uses MapLibre):
  - State labels drew internal polygon keys ("Sinaloa-4-0"). Polygons now carry a
    display `label`; each name is drawn once, on its largest piece. The key stays
    the click lookup.
  - Deep links such as `/map?state=Sinaloa` selected the state but never framed it:
    web loads the state geometry after first render and the link was marked handled
    first. The route effect now waits for geometry.
  - For signed-out viewers the wide "Join the conversation" nav overlapped the map
    sidebar. The split layout and the narrow drawer now start to the right of the
    nav at its actual width (80 px minimal, 245 px wide).
- **Test repair.** Three `SelectedStateOverlay` tests failed on gesture-handler 3,
  which requires a `GestureHandlerRootView` above any detector; they now render
  inside one. This was a pre-existing failure, not caused by this slice.

## Checks run

```sh
NODE_ENV=test corepack pnpm exec jest --runInBand --forceExit src/screens/Map
```

**4 suites, 37 tests passed** (iOS preset). These are mocked component tests: the
fake map reproduces the library behaviours above but is not the real renderer, so it
proves the adapter's use of the API, not pixels or WebGL.

Scoped `tsc` showed no diagnostics in `src/screens/Map` after the final edit. Full
client typechecks were not made green by this slice.

## Browser results (MapLibre, signed out, `expo start --web`)

At 1440 x 900: a deep link frames the state in the area right of the panel; a real
click selects the state and moves the camera; the panel is docked top-left with no
grab handle; Escape closes it and clears the selection; the left nav no longer
overlaps the sidebar. At 820 x 900: the drawer and map start at x = 80, clear of the
nav. The map canvas is focusable (`tabindex=0`, `aria-label="Map"`).

## Not verified

- Phone width (390 px), touch tolerance on a real touch device, and the bottom inset
  estimate for narrow layouts.
- Arrow-key and +/- panning (MapLibre's built-in handler; not exercised), and
  reduced-motion behaviour.
- Camera memory across an actual provider switch (covered only by the unit test; the
  Google provider needs a configured key). Selection already survives a switch
  because the shared screen state is not remounted; the Google camera is not
  re-framed.
- Frame rate and request baselines (M0 exit criteria).

## Next

- Finish the browser pass: 390 px phone width, keyboard panning, and a Google-provider
  switch with a configured key (re-frame the camera for the selected place).
- Then M1.1 (official dataset manifest) per the maturity plan.

Rollback: revert `mapLibreCamera.ts`, the `MapLibreWeb.tsx` and `MapScreen.shared.tsx`
camera/padding edits, and the new test together. The shared-screen padding fields are
optional, so reverting only the adapter is safe.
