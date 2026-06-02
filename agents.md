# PARA Project: Agent & Developer Knowledge Base

This file serves as a high-fidelity "Brain" for future AI agents and human developers working on the PARA project. It tracks the core architecture, fundamental design decisions, and local environment quirks that aren't captured in the code comments alone.

---

## 🏛️ Project Architecture & DNA

PARA is a React Native mobile application built on the **AT Protocol (atproto)** architecture. It uses a custom lexicon layer (`com.para`) to extend or specialize its functionality.

### Core Stack

- **Framework:** React Native (Native/Web parity via `.web.tsx` files).
- **Styling (`Alf`):** A custom, atomic-based design system (`src/alf`). Components should use `atoms` (aliased as `a`) for layout and `useTheme` for semantic coloring.
- **Data Layer:** Lexicon-driven APIs. Types and definitions are located in `src/lib/api/para-lexicons.ts`.
- **Localization:** Managed via `@lingui/js`. Message files are located in `src/locale/locales/`.

---

## 🛠️ Local Development & Environment Quirks

### React Query Notes

- **Persistence:** In Para, persisted React Query entries are still keyed off `PERSISTED_QUERY_ROOT` in [src/state/queries/index.ts](/Users/mlv/Desktop/MASTER/PARA/src/state/queries/index.ts). If a query should survive app restarts, its query key needs that root at index `0`, and it should usually pair with `PERSISTED_QUERY_GCTIME`.
- **Refresh behavior:** For paginated feeds and similar infinite queries, prefer `truncateAndInvalidate` from [src/state/queries/util.ts](/Users/mlv/Desktop/MASTER/PARA/src/state/queries/util.ts) over a bare `refetch()` when the goal is “reload from the top.” That trims cached pages back to the first page before invalidation so pull-to-refresh actually fetches fresh leading data.
- **Invalidation safety:** When a query key includes params, pass the full key shape during invalidation or truncation. Refresh bugs in feed surfaces often come from invalidating only the root feed descriptor while the live query also depends on `feedParams`.

### iOS Provisioning & App Clips

- **Issue:** The project includes an Apple App Clip target (`PARAAppClip`).
- **Personal Team Limitation:** Personal Apple Developer Teams (free accounts) do _not_ support the "App Clip" capability or the associated provisioning profiles.
- **Current Setup:** The `PARAAppClip` target has been manually removed from the Xcode project to allow local deployments to physical devices.
- **Future Reversion:** If building for production or a paid Enterprise/Organization team, restore the `PARAAppClip` target from `ios/PARA.xcodeproj/project.pbxproj` and ensure the `com.miguelabundis.para.AppClip` identifier is correctly provisioned.

### Local PDS Connection (Networking)

- **Issue:** The app needs to connect to a local Personal Data Server (PDS) running on the development machine.
- **Problem:** Hardcoded IP addresses in `src/lib/constants.ts` can drift if the host machine's local IP changes.
- **Technical Note:** `LOCAL_DEV_SERVICE` for iOS is configured to `http://192.168.100.31:2583`. This must match the host machine's local IP for physical device connectivity.

### Java & macOS Build Requirements

- **JDK Version:** You **must** use Zulu 17. Ensure your `JAVA_HOME` points to exactly this path in your `.zshrc` or `.bashrc`:
  `export JAVA_HOME=/Library/Java/JavaVirtualMachines/zulu-17.jdk/Contents/Home`
- **Apple Silicon (M1/M2/M3):** If building for RN 0.74+ for the first time on ARM, you may need to run:

  ```bash
  arch -arm64 brew install llvm
  sudo gem install ffi
  ```

---

### 2026-03-01: App Clip Target Removal

- **Decision:** Deleted `PARAAppClip` from Targets.
- **Reasoning:** Unblocks dev loop on physical hardware (see _iOS Provisioning_ section above).
- **Functionality Loss:** Temporary loss of native App Clip preview testing. Main app routing and business logic are unaffected.

---

## 📝 Future Agent Onboarding (Handover Notes)

If you are a new agent taking over this workspace:

1. **Check the Lexicons:** Before modifying API calls, inspect `src/lib/api/para-lexicons.ts` to understand the data schema.
2. **Respect the Atoms:** Always use the `alf` design system. Do not write ad-hoc CSS/Styles unless absolutely necessary for custom animations.
3. **Check target files:** This codebase supports both Native and Web. When modifying a screen, check if a `.web.tsx` counterpart exists to maintain parity.

---

## 🚀 PARA DEMO RUNBOOK (Local Environment)

### Goal

Raise the full local demo with the current workspace split:

- **website**: docs / marketing site (SvelteKit)
- **PARA**: app client (Expo Web)
- **PARA/bskyweb**: browser-facing web demo server (Go)
- **watx**: backend stack (PLC, PDS, AppView)

### Terminal 1: WEBSITE

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/website
  pnpm install
  pnpm dev
  ```
- **Note**: The path is `/Users/mlv/Desktop/website` (verified).

### Terminal 2: PARA EXPO WEB CLIENT

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/MASTER/PARA
  pnpm install
  pnpm web
  ```

### Terminal 3: NGROK PDS TUNNEL

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  ngrok http --url=https://pds.paramx.social.ngrok.pro 2583
  ```

### Terminal 4: NGROK APPVIEW TUNNEL

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  ngrok http --url=https://appview.paramx.social.ngrok.pro 2584
  ```

### Terminal 5: WATX BACKEND

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/MASTER/watx
  make nvm-setup
  make deps
  make build
  cp -n .env.shared-demo.example .env.shared-demo
  make run-dev-env-persistent
  ```
- **Important**:
  - This is the only backend launcher to use for the demo runbook.
  - Do not use `make run-dev-env` here.
  - This backend also exposes a local-only introspection server at `http://127.0.0.1:2581`.
  - If `.env.shared-demo` points to `pds.paramx.social.ngrok.pro` and `appview.paramx.social.ngrok.pro`, both ngrok terminals must already be running before `make run-dev-env-persistent`.
  - If the tunnels are not up first, dev-env bootstrap can fail with `XRPCError: fetch failed` and `UND_ERR_CONNECT_TIMEOUT` while creating the Ozone service profile.

### Seed Demo Data

- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/MASTER/PARA
  pnpm seed:civic:apply --introspect-url http://127.0.0.1:2581
  ```
- **Important**:
  - Use the introspection URL on `apply` so AppView catches up after the seed writes.
  - If this command fails, do not continue to the demo UI until AppView responds for `active-a.test`.

### Terminal 6: PARA BSKYWEB FRONTEND

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/MASTER/PARA/bskyweb
  go run ./cmd/bskyweb serve --appview-host https://appview.paramx.social.ngrok.pro --http-address :8100
  ```
- **Important**:
  - Do not send the AppView URL itself to demo users.
  - AppView is backend infrastructure, not the browser-facing client.
  - Use the `bskyweb` URL on port `8100` for browser demos.

### Startup Order

1. **Terminal 3** (ngrok PDS tunnel)
2. **Terminal 4** (ngrok AppView tunnel)
3. **Terminal 5** (watx backend, persistent)
4. **Terminal 6** (bskyweb frontend)
5. **Terminal 2** (Expo Web client)
6. **Terminal 1** (Website)

### Quick Smoke Check

1. Confirm both ngrok terminals are forwarding to `2583` and `2584`.
2. Confirm the backend prints:
   - `Main PDS https://pds.paramx.social.ngrok.pro`
   - `Bsky Appview https://appview.paramx.social.ngrok.pro`
   - `Dev-env introspection server http://127.0.0.1:2581`
3. Check health:
   ```bash
   curl http://localhost:2583/xrpc/_health
   curl http://localhost:2584/xrpc/_health
   curl https://pds.paramx.social.ngrok.pro/xrpc/_health
   curl https://appview.paramx.social.ngrok.pro/xrpc/_health
   ```
4. Confirm AppView sees seeded demo actors and posts:
   ```bash
   curl 'http://localhost:2584/xrpc/app.bsky.actor.getProfile?actor=active-a.test'
   curl 'http://localhost:2584/xrpc/app.bsky.feed.getAuthorFeed?actor=active-a.test&limit=3'
   ```
5. Open `http://localhost:8100` and verify Home/Base are not empty.
6. Only send the `bskyweb` URL to demo users, not the raw AppView URL.

---

# PARA — AI Agent Notes

This file captures decisions, conventions, and rules that AI agents must follow
when working in this codebase. Update it whenever a significant architectural
decision is made.

---

## 2026-06-01: pnpm 10 patch migration (mirror bsky upstream)

- **Decision:** Migrated from `patch-package` to pnpm-native `patchedDependencies`.
- **Reasoning:** Bsky upstream removed all `patchedDependencies` AND `patch-package`
  because pnpm 10 changed the patch filename convention (`package@version.patch`
  → `package+version.patch`) and enforces stricter version matching. Pnpm 10 also
  ignores `patchedDependencies` in `pnpm-workspace.yaml` — it must live in
  `package.json` under `pnpm.patchedDependencies`.
- **Changes made:**
  - All 18 patch files renamed from `@` to `+` filename convention
  - `pnpm.patchedDependencies` block moved from `pnpm-workspace.yaml` to
    `package.json`
  - Three packages with `^`/`~` ranges were unresolved to newer versions that
    no longer match the patches, so they are pinned via `overrides` in
    `pnpm-workspace.yaml`:
    - `expo-updates: 29.0.17` (was `~29.0.17`)
    - `react-native-drawer-layout: 4.2.3` (was `^4.2.3`)
    - `react-native-keyboard-controller: 1.21.8` (was `^1.21.8`)
  - `patch-package` removed from `postinstall` and `devDependencies`
    (pnpm-native patching replaces it; running both causes double-apply errors)
  - `scripts/apply-nested-patches.js` kept (handles nested deps like
    `dev-env/node_modules/@atproto/dev-env`)
- **Pre-existing issue (not caused by this migration):**
  `apply-nested-patches.js` warns about a missing `@atproto+dev-env+0.4.7.patch`
  — the user is now on dev-env `0.5.5` and the nested patch was never updated.
  This is a no-op (the script logs a warning and returns).
- **Backup:** `patches/` directory was backed up to
  `/tmp/para-patches-backup-20260601-190022/` before any rename.

## Political Compass Colors — CANONICAL SOURCE OF TRUTH

**File:** `src/lib/compass/compassColors.ts`

All political-compass position colors are defined **once** in this file.
No other file may hardcode compass colors. Every component, screen, and
feature must import from here.

### The 9 positions and their colors

These are the **classic pale palette** — the standard political compass colors.

| Position ID    | Camelcase key  | Hex       | Description        |
| -------------- | -------------- | --------- | ------------------ |
| `auth-left`    | `authLeft`     | `#efb9bb` | pale rose-red      |
| `auth-center`  | `authCenter`   | `#cda7d8` | pale purple        |
| `auth-right`   | `authRight`    | `#99d0ea` | pale blue          |
| `center-left`  | `centerLeft`   | `#d8d9be` | pale olive/tan     |
| `center`       | `centerCenter` | `#efe7d6` | pale cream/neutral |
| `center-right` | `centerRight`  | `#bfd7e8` | pale sky-blue      |
| `lib-left`     | `libLeft`      | `#c7e4c2` | pale green         |
| `lib-center`   | `libCenter`    | `#dfe498` | pale yellow-green  |
| `lib-right`    | `libRight`     | `#f6efb3` | pale yellow        |

### Grid layout (3 × 3)

```
          Left          Center        Right
Auth   auth-left    auth-center   auth-right
Ctr    center-left  center        center-right
Lib    lib-left     lib-center    lib-right
```

### Exports from `compassColors.ts`

| Export                        | Type                                | Use for                                                                                     |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `COMPASS_COLORS`              | `Record<CompassPositionId, string>` | Background color of any UI element for a position                                           |
| `COMPASS_LABEL_COLORS`        | `Record<CompassPositionId, string>` | Readable text color on top of that background                                               |
| `COMPASS_GRID_ROWS`           | `CompassPositionId[][]`             | Rendering a 3×3 grid in the correct order                                                   |
| `COMPASS_CROSS_GRADIENTS`     | `Partial<Record<...>>`              | Display-only gradients for the 4 edge/transitional cells (CompassMini, CompassScreen board) |
| `NINTH_NAME_TO_COMPASS_COLOR` | `Record<string, string>`            | Maps RAQ "ninth name" strings (e.g. "Auth Econocenter") to the correct color                |
| `COMPASS_POSITION_IDS`        | `readonly string[]`                 | Ordered list of all 9 position IDs                                                          |

### Rules

1. **NEVER hardcode a compass color** (`#efb9bb`, etc.) anywhere except in
   `compassColors.ts` itself.
2. `HIGHLIGHT_COLORS` in `highlightTypes.ts` maps camelCase keys to
   `COMPASS_COLORS` values — always solid strings, never gradient arrays.
3. `NINTHS_COLORS` in `RAQ/logic/scoring.ts` is re-exported from
   `NINTH_NAME_TO_COMPASS_COLOR` — do not override it with local values.
4. `CompassMini` renders gradients for the 4 edge cells using
   `COMPASS_CROSS_GRADIENTS`. These gradients are **display-only** and are
   derived from adjacent corner colors. Never store gradient arrays in
   data/state.
5. `CompassScreen`'s "Classic" palette is wired directly to `COMPASS_COLORS` /
   `COMPASS_LABEL_COLORS`. The "Bold" palette may keep its own colors since
   it is a separate theme option.

### How the "Econocenter" naming maps to position IDs

The RAQ quiz uses "Econocenter" terminology (economic center axis):

| RAQ name           | Compass position ID |
| ------------------ | ------------------- |
| Auth Econocenter   | `auth-center`       |
| Center Econocenter | `center`            |
| Lib Econocenter    | `lib-center`        |

---

## Module Aliases

The codebase uses `#/` as an alias for `src/`:

```
#/lib/compass/compassColors  →  src/lib/compass/compassColors.ts
#/state/highlights/...       →  src/state/highlights/...
#/components/...             →  src/components/...
```

---

## Highlight Feature

- **Types & color definitions:** `src/state/highlights/highlightTypes.ts`
- **Color picker UI:** `src/components/HighlightOptionsModal.tsx`
  - Renders as a **3 × 3 grid of solid-color squares** matching the compass layout
  - Row labels: Auth / Ctr / Lib | Column labels: Left / Ctr / Right
- **Inline text rendering (native):** `src/components/HighlightableRichText.tsx`
- **Inline text rendering (web):** `src/components/HighlightableRichText.web.tsx`

---

## Web Layout Standardization

### Center-Column Screens (Web)

Screens that display a centered content column on web must follow this consistent layout pattern:

```tsx
<Layout.Screen>
  <Header>...</Header>
  <Layout.Center style={styles.center}>
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* content */}
    </ScrollView>
  </Layout.Center>
</Layout.Screen>

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
```

**Rules:**
1. **`Layout.Center`** wraps the `ScrollView` and receives `flex: 1`.
2. **`ScrollView`** itself receives `flex: 1`.
3. **`contentContainerStyle`** must use `padding: 16` (horizontal + top) and `paddingBottom: 100` (clearance for FAB / bottom bar).
4. **Reference implementation:** `RepresentativesScreen` is the canonical example.
5. **Screens already standardized:** `RepresentativesScreen`, `MyBaseDashboard`, `MyAffiliationsScreen`.
6. **Rationale:** `WebCenterBorders` renders vertical divider lines at `width: 602px` centered. `padding: 16` ensures content doesn't butt up against these borders and matches native card spacing.
