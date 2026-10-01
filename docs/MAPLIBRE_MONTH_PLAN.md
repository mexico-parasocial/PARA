# MapLibre map: one-month plan (Oct 2026)

Scope: the web map (`src/screens/Map/MapLibreWeb.tsx`, `MapScreen.web.tsx`,
`MapScreen.shared.tsx`, `MapDesktopLayout.tsx`). Native keeps `react-native-maps`.
This is outside the Q4 pilot plan; treat it as a polish track, not a committed sprint item.

## Done (2026-09-30)

- **Clicks dead on MapLibre.** `queryRenderedFeatures` returns nothing if any
  requested layer is missing from the style, and the click handler always asked for
  all seven. Now it only queries layers that exist.
- **Stale handlers.** The map is created once, so `onPress`, `onCivicPointPress` and
  `onRegionChangeComplete` were frozen at first render. They now read from a ref.
- **Style swaps lost overlays.** Changing view mode or theme wiped polygons and
  markers (they waited on a one-time `load`). Overlays now re-sync on `style.load`.
- **Layer order.** Re-added polygons landed above markers and swallowed their
  clicks. Layers are now inserted in a fixed stacking order.
- **State sheet on web.** Selecting a state now opens the same floating summary sheet
  as mobile (it used to sit at the bottom of the sidebar, below the fold). The
  swipe-to-dismiss gesture lives in `sheetDragGesture.tsx` with a web no-op, because
  `react-native-gesture-handler` is disabled in the web build.
- **Sheets on the web map.** Cities and districts now open as map sheets too (same
  components as mobile), not only as sidebar panels. The sidebar keeps search,
  layers and filters. District boundaries are drawn on the MapLibre map and are
  clickable (they were silently dropped before), the selected city is emphasised,
  city markers show at any zoom, and the duplicate MapLibre zoom control is gone.
- **Civic heat is a toggle.** "Civic" is no longer one of the exclusive map views.
  It is an on/off switch (sidebar and floating panel) that shows the heatmap and the
  per-state civic tint, and stays on while switching between States, Districts and
  Cities. Old `layer=civic` links turn the heat on.
- **Narrow-width drawer.** The drawer and map are inset past the left nav rail
  instead of sliding under its icons.
- **No basemap tiles in the standard view.** CARTO's raster tiles now require a key
  ("API KEY REQUIRED" watermark). The standard view renders our own polygons,
  markers and heatmap on a plain background: no key, no third-party requests.
  Satellite (Esri) and terrain (OpenTopoMap) stay available as opt-in views.
- **Header.** The hamburger now sits in the top bar right after the back arrow, and
  both shifted left. Drawer state is owned by `MapScreen.web.tsx`.

## Week 1: interaction correctness

- Add a MapLibre test harness (jest with a mocked `maplibre-gl`) covering: click
  routing per layer, missing-layer clicks, style swap re-sync, layer order.
- Touch: verify tap targets and pinch/drag on a phone-width web viewport; enlarge
  circle hit areas via transparent wider hit layers rather than bigger dots.
- Keyboard: focusable map, arrow pan, `+`/`-` zoom, Escape clears selection.
- Hover and selected feature state (`setFeatureState`) instead of repainting the
  whole fill layer on hover.

## Week 2: rendering and data

- Optional: add a basemap back for street context, preferably only when zoomed in
  (self-hosted Protomaps or a keyed provider), so labels follow the theme and we
  control glyphs/fonts. Remove the `openmaptiles` font dependency either way.
- Single GeoJSON source for states/districts with stable `promoteId`, instead of
  rebuilding sources on every selection change.
- District and city layers: min/max zoom rules, label collision, cluster styling.
- Loading and error states: tile failure banner, offline fallback.

## Week 3: parity with the Google provider

- Selection/highlight parity (selected state, district, city) and camera behavior
  (`flyTo` padding so the drawer or sidebar does not cover the target).
- Locate-me marker, civic point popups, discourse lens overlay.
- Satellite/terrain/hybrid: hybrid currently equals satellite; add labels or drop the option.
- Provider switch: preserve camera and selection when toggling in Settings.

## Week 4: performance, a11y, release

- Profile with 300 districts plus civic clusters; target 60 fps pan on a mid-range laptop.
- Screen-reader path: list-based alternative to the canvas for selecting states and
  districts (the sidebar already has most of it).
- Lazy-load `maplibre-gl` so it is not in the main web bundle for Google-provider users.
- Privacy check: anonymous users only hit the tile host; document which hosts receive requests.
- Bug bash, then flip the default in `useMapProvider` if MapLibre reaches parity.

## Open decisions

- Tile provider and hosting cost (Carto/Esri/OpenTopoMap raster terms of use are
  a risk for production traffic).
- Whether MapLibre becomes the default for signed-in users (today: Google).
