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

# AGENTS.md – Bluesky App fork Development Guide

This document provides guidance for working effectively in the Bluesky Social app codebase.

## Project Overview

Bluesky Social is a cross-platform social media application built with React Native and Expo. It runs on iOS, Android, and Web, connecting to the AT Protocol (atproto) decentralized social network.

**Tech Stack:**

- React 19.2
- React Native 0.86 with Expo 57
- TypeScript 7
- React Navigation 7 for routing
- TanStack Query (React Query) for data fetching
- Lingui 5 for internationalization
- Custom design system called ALF (Application Layout Framework)

Prefer using the latest features available for each of these libraries (exact versions are found in `package.json`). For example, prefer `@lingui/react/macro` over `@lingui/react`. Suggest refactoring legacy or deprecated uses.

## Essential Commands

```bash
# Development
pnpm start              # Start Expo dev server
pnpm web                # Start web version
pnpm android            # Run on Android
pnpm ios                # Run on iOS

# Testing & Quality
# IMPORTANT: Always use these pnpm scripts, never call the underlying tools directly
pnpm test               # Run Jest tests
pnpm lint               # Run Oxlint
pnpm typecheck          # Run TypeScript type checking
pnpm prettier           # Run Prettier for code formatting

# Internationalization
# DO NOT run these commands - extraction and compilation are handled by CI
pnpm intl:extract       # Extract translation strings (nightly CI job)
pnpm intl:compile       # Compile translations for runtime (nightly CI job)

# Build
pnpm build-web          # Build web version
pnpm prebuild           # Generate native projects
```

## Project Structure

```
src/
├── alf/                    # Design system (ALF) - themes, atoms, tokens
├── components/             # Shared UI components (Button, Dialog, Menu, etc.)
├── screens/                # Full-page screen components (newer pattern)
├── features/               # Macro-features that bridge components/screens
├── view/
│   ├── screens/            # Full-page screens (legacy location)
│   ├── com/                # Reusable view components
│   └── shell/              # App shell (navigation bars, tabs)
├── state/
│   ├── queries/            # TanStack Query hooks
│   ├── preferences/        # User preferences (React Context)
│   ├── session/            # Authentication state
│   └── persisted/          # Persistent storage layer
├── lib/                    # Utilities, constants, helpers
├── locale/                 # i18n configuration and language files
└── Navigation.tsx          # Main navigation configuration
```

### Project Structure in Depth

When building new things, follow these guidelines for where to put code.

#### Components vs Screens vs Features

**Components** are reusable UI elements that are not full screens. Should be
platform-agnostic when possible. Examples: Button, Dialog, Menu, TextField. Put
these in `/components` if they are shared across screens.

**Screens** are full-page components that represent a route in the app. They
often contain multiple components and handle layout for a page. New screens
should go in `/screens` (not `/view/screens`) to encourage better organization
and separation from legacy code.

For complex screens that have specific components or data needs that _are not
shared by other screens_, we encourage subdirectories within `/screens/<name>`
e.g. `/screens/ProfileScreen/ProfileScreen.tsx` and
`/screens/ProfileScreen/components/`.

**Features** are higher-level modules that may include context, data fetching,
components, and utilities related to a specific feature e.g.
`/features/liveNow`. They don't neatly fit into components or screens and often
span multiple screens. This is an optional pattern for organizing complex
features.

#### Legacy Directories

For the most part, avoid writing new files into the `/view` directory and
subdirectories. This is the older pattern for organizing screens and components,
and it has become a bit disorganized over time. New development should go into
`/screens`, `/components`, and `/features`.

#### State

The `/state` directory is where we've historically put all our data fetching and
state management logic. This is perfectly fine, but for new features, consider
organizing state logic closer to the components that use it, either within a
feature directory or co-located with a screen. The key is to keep related code
together and avoid having "god files" with too much unrelated logic.

#### Lib

The `/lib` directory is for utilities and helpers that don't fit into other
categories. This can include things like API clients, formatting functions,
constants, and other shared logic.

#### Top Level Directories

Avoid writing new top-level subdirectories within `/src`. We've done this for a
few things in the past that, but we have stronger patterns now. Examples:
`/logger` should probably have been written into `/lib`. And `ageAssurance` is
better classified within `/features`. We will probably migrate these things
eventually.

### File and Directory Naming Conventions

Typically JS style for variables, functions, etc. We use ProudCamelCase for
components, and camelCase directories and files.

For "macro" cases in `/features`, `/screens`, or `/components`, co-locate related
code in a directory with an `index.tsx` main component plus sibling
components/hooks/utils (e.g. `screens/ProfileScreen/index.tsx` +
`screens/ProfileScreen/components/`). Keep related code together so it lives where
someone would look for it. Don't overdo it: a component that fits in one file
should just be `Component.tsx`, not `Component/index.tsx`.

Platform-specific files are covered under "Platform-Specific Code" below.

### Comments

Comment code when necessary to explain the “why” behind something; avoid
comments that simply describe the code. Avoid Unicode characters in comments,
e.g., use `-` not `—`.

Always use docblock (`/** */`) syntax for comments that document a type, type
member, method, function, or variable. These are the comments a reader expects
to find attached to a named declaration, and the docblock form makes that intent
clear and surfaces nicely in editor tooltips.

```tsx
type DateFieldProps = {
  /**
   * An empty string renders the placeholder and opens the picker at today (or
   * maximumDate, if earlier).
   */
  value: string | Date
}

/**
 * Date-only input. Accepts a string in the format YYYY-MM-DD, or a Date object.
 */
export function DateField() {}
```

More generally, any multiline comment should use the `/* */` block syntax rather
than stacked `//` lines. Reserve `//` for short, single-line comments.

```tsx
/*
 * The picker requires a valid date, so when value is empty we fall back to
 * maximumDate (if set) or today.
 */
const fallbackDate = maximumDate ? toSimpleDateString(maximumDate) : today
```

### Documentation and Tests Within Features

For larger features or components, co-locate documentation and tests with the
code. A `README.md` in the directory (the `/Component/index.tsx` pattern lends
itself well to this) can document the whole feature, and feature-specific tests
belong alongside it as `Component.test.tsx` or in a `__tests__/` subdirectory.
Both are optional.

## Styling System (ALF)

ALF is the custom design system. Tailwind-inspired naming with underscores
instead of hyphens. Static atoms (`atoms as a`) are theme-independent; theme
atoms/palette come from `useTheme()` (`t.atoms.bg`, `t.palette.primary_500`).
Style props take an array of atoms + theme atoms + raw styles.

Order atoms by: flexbox (`a.flex_row`), spacing (`a.px_md`), text (`a.font_bold`),
themes (`t.atoms.text`), then raw styles (`{backgroundColor: t.palette.primary_500}`).

```tsx
import {atoms as a, useTheme} from '#/alf'

const t = useTheme()
<View style={[a.flex_row, a.gap_md, a.p_lg, t.atoms.bg]} />
```

### Key Concepts

Static atoms live in `a.*` (e.g. `a.flex_row`, `a.p_md`, `a.rounded_md`,
`a.text_lg`). Theme atoms/palette come from `useTheme()` (`t.atoms.bg`,
`t.atoms.text`, `t.atoms.border_contrast_low`, `t.palette.primary_500`).

**Platform utilities** (`import {web, native, ios, android, platform} from '#/alf'`)
return conditional styles inline in a style array: `web({cursor: 'pointer'})`,
`native({paddingBottom: 20})`, `platform({ios: {...}, android: {...}, web: {...}})`.

**Breakpoints:** `const {gtPhone, gtMobile, gtTablet} = useBreakpoints()` from `#/alf`.

### Naming Conventions

- Spacing: `2xs`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl` (t-shirt sizes)
- Text: `text_xs`, `text_sm`, `text_md`, `text_lg`, `text_xl`
- Gaps/Padding: `gap_sm`, `p_md`, `px_lg`, `py_xl`
- Flex: `flex_row`, `flex_1`, `align_center`, `justify_between`
- Borders: `border`, `border_t`, `rounded_md`, `rounded_full`

## Component Patterns

- Prefer fragment shorthand over `Fragment` unless a `key` is needed.
- Prefer functions over arrow functions for component declarations.
- Prefer prop destructuring via parameters over a const within the component.
- Prefer inline types over `Props` types or interfaces.
- Set reasonable defaults for optional props.
- Prefer the implicit global `React` for types over `type` imports.

```tsx
import {Fragment} from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {Text} from '#/components/Typography'

function MyComponent({
  items = [],
  children,
}: {
  items?: string[]
  children: React.ReactNode
}) {
  return (
    <>
      <View>
        <Text>
          <Trans>Example</Trans>
        </Text>
      </View>
      <View>
        {items.map((item, index) => (
          <Fragment key={item}>
            <Text>{index}</Text>
            <Text>{item}</Text>
          </Fragment>
        ))}
        {children}
      </View>
    </>
  )
}
```

### Dialog Component

Lives in `#/components/Dialog`. Bottom sheet on native, modal on web. Manage
state with `useDialogControl()`. `Dialog.Handle` renders native-only, `Dialog.Close`
web-only. CRITICAL: run any post-close action inside the `control.close(() => ...)`
callback (see Footguns). Compound-component usage; canonical example in any dialog
under `#/components`.

### Menu Component

Lives in `#/components/Menu`. Dropdown on web, bottom sheet dialog on native.
`Menu.Divider` is web-only, `Menu.ContainerItem` native-only. Compound API
(`Menu.Root` / `Menu.Trigger` / `Menu.Outer` / `Menu.Group` / `Menu.Item`); grep
existing usages across the app for a canonical example.

### Button Component

`import {Button, ButtonText, ButtonIcon} from '#/components/Button'`. Props:

- `color`: `'primary'` | `'secondary'` | `'negative'` | `'primary_subtle'` | `'negative_subtle'` | `'secondary_inverted'`
- `size`: `'tiny'` | `'small'` | `'large'`
- `shape`: `'default'` (pill) | `'round'` | `'square'` | `'rectangular'`
- `variant`: `'solid'` | `'outline'` | `'ghost'` (deprecated, prefer `color`)

### TextField

Compound component at `#/components/forms/TextField` (`TextField.LabelText`,
`TextField.Root`, `TextField.Icon`, `TextField.Input`). Prefer `defaultValue` over
`value` (see Footguns).

### Typography

`import {Text, H1, H2, P} from '#/components/Typography'`. The `Text` default style
is `[a.text_sm, a.leading_snug, t.atoms.text]`. Pass the `emoji` prop to any `Text`
that may contain emoji - user-generated text (display names etc.) almost always
does, so only omit it for static, emoji-free strings: `<Text emoji>Hello!</Text>`.

## Internationalization (i18n)

All user-facing strings must be wrapped for translation using Lingui. Include `comment` and/or `context` props when necessary to avoid ambiguity, e.g., “Post” as a noun vs a verb.

Prefer using `t` via `import {useLingui} '@lingui/react/macro'` vs `_` via `import {useLingui} from '@lingui/react'`. Alias `t` to `l` to avoid collisions with `const t = useTheme()`. Refactor existing uses of ``_(msg`foo`)`` to use `` l`foo` ``.

Prefer Unicode punctuation over keyboard punctuation, e.g., `“quote”` over `"quote"`. Prefer en dashes preceded by a non-breaking space over em dashes, e.g., `one – two` over `one—two`.

```tsx
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

function MyComponent() {
  const {t: l} = useLingui()

  // Simple strings - use the l macro
  const title = l`Settings`
  const errorMessage = l({
    message: 'Something went wrong',
    comment: 'Generic error message for unknown/unhandled errors.',
    context: 'Toast',
  })

  // Strings with variables
  const greeting = l`Hello, ${name}!`

  // Pluralization
  const countLabel = plural(count, {
    one: '# item',
    other: '# items',
  })

  // JSX content - use Trans component
  return (
    <Text>
      <Trans>
        Welcome to <Text style={a.font_bold}>Bluesky</Text>, {name}!
      </Trans>
    </Text>
  )
}
```

Prefer `i18n.date` for date and time formatting. This ensures formatting is re-applied when the language changes at runtime. Refactor existing uses of `Intl.DateTimeFormat` to use `i18n.date`.

```tsx
import {useLingui} from '@lingui/react/macro'

function MyComponent() {
  const {i18n} = useLingui()

  const createdAt = new Date()

  return i18n.date(createdAt, {
    dateStyle: 'medium',
    timeStyle: 'medium',
  })
}
```

**Commands:**

```bash
# DO NOT run these commands - extraction and compilation are handled by a nightly CI job
pnpm intl:extract    # Extract new strings to locale files
pnpm intl:compile    # Compile translations for runtime
```

## State Management

### TanStack Query (Data Fetching)

Follow the established pattern in `src/state/queries/`; `src/state/queries/feed.ts`
is a good canonical reference (it uses `createQueryKey`, matching key roots,
`useInfiniteQuery`, and `persistedVersion`).

- Build query keys with `createQueryKey(root, args)` (from `#/state/queries/util`)
  using an object for `args`. The key root variable should match the hook name.
- Naming conventions: `use[Name]Query` for queries, `use[Name]Mutation` for
  mutations, `use[Name]CacheMutation` for helpers that mutate cached data directly.
- Stale times come from `STALE` in `src/state/queries/index.ts`: `STALE.SECONDS.FIFTEEN`,
  `STALE.MINUTES.ONE`, `STALE.MINUTES.FIVE`, `STALE.HOURS.ONE`, `STALE.INFINITY`.
- Paginated atproto APIs (those returning a `cursor`) use `useInfiniteQuery` with
  `getNextPageParam: page => page.cursor`; flatten results with
  `data?.pages.flatMap(page => page.items) ?? []`.
- Persist a query across restarts by passing options:
  `createQueryKey(root, args, {persistedVersion: n})`. Bumping `n` clears the old
  persisted data and refetches - do this whenever the data shape changes.
- Error handling in mutations: don't log network errors (just inform the user),
  handle typed XRPC errors specifically (e.g. `err instanceof SomeNsid.SomeError`),
  and send unexpected errors to `logger.error('...', {safeMessage: error})`.

### Preferences (React Context)

Boolean/simple UI preferences are exposed as paired hooks from `#/state/preferences`,
e.g. `useAutoplayDisabled()` / `useSetAutoplayDisabled()`.

### Session State

`import {useSession, useAgent} from '#/state/session'`. `useSession()` gives
`hasSession` and `currentAccount`; `useAgent()` gives the atproto agent for API calls.

## Navigation

React Navigation with type-safe route params. Type a screen with
`NativeStackScreenProps<CommonNavigatorParams, 'X'>` (`route`/`navigation` come
from props; params via `route.params`). Navigate programmatically with
`useNavigation()`, or the `navigate` helper from `#/Navigation`. Config lives in
`src/Navigation.tsx`, routes in `src/routes.ts`, types in `src/lib/routes/types.ts`.

## Platform-Specific Code

Use file extensions for platform-specific implementations. The bundler resolves
them automatically - just import the base path normally, never a conditional
`require()`.

```
Component.tsx          # Shared/default
Component.web.tsx      # Web-only
Component.native.tsx   # iOS + Android
Component.ios.tsx      # iOS-only
Component.android.tsx  # Android-only
```

Prefer grouping variants into a `Component/` directory (`index.tsx`,
`index.web.tsx`, `index.native.tsx`) rather than sibling `Component.web.tsx` files,
so the shared surface reads as one "macro" module (e.g. `src/components/Dialog/index.tsx`
native vs `index.web.tsx` web). The app has both patterns; the directory form is
preferred for new code.

```tsx
// CORRECT - bundler picks storage.ts or storage.web.ts automatically
import * as storage from '#/state/drafts/storage'

// WRONG - don't use require() or conditional imports for platform files
const storage = IS_NATIVE
  ? require('#/state/drafts/storage')
  : require('#/state/drafts/storage.web')
```

Runtime platform detection (not for imports): `import {IS_WEB, IS_NATIVE, IS_IOS, IS_ANDROID} from '#/env'`.

## Import Aliases

Always use the `#/` alias for absolute imports:

```tsx
// Good
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button} from '#/components/Button'

// Avoid
import {useSession} from '../../../state/session'
```

## Footguns

Common pitfalls to avoid in this codebase:

### Dialog Close Callback (Critical)

**Always use `control.close(() => ...)` when performing actions after closing a dialog.** The callback ensures the action runs after the dialog's close animation completes. Failing to do this causes race conditions with React state updates.

```tsx
// WRONG - causes bugs with state updates, navigation, opening other dialogs
const onConfirm = () => {
  control.close()
  navigation.navigate('Home') // May race with dialog animation
}

// WRONG - same problem
const onConfirm = () => {
  control.close()
  otherDialogControl.open() // Will likely fail or cause visual glitches
}

// CORRECT - action runs after dialog fully closes
const onConfirm = () => {
  control.close(() => {
    navigation.navigate('Home')
  })
}

// CORRECT - opening another dialog after close
const onConfirm = () => {
  control.close(() => {
    otherDialogControl.open()
  })
}

// CORRECT - state updates after close
const onConfirm = () => {
  control.close(() => {
    setSomeState(newValue)
    onCallback?.()
  })
}
```

This applies to:

- Navigation (`navigation.navigate()`, `navigation.push()`)
- Opening other dialogs or menus
- State updates that affect UI (`setState`, `queryClient.invalidateQueries`)
- Callbacks passed from parent components

The Menu component on iOS specifically uses this pattern – see `src/components/Menu/index.tsx:151`.

### Controlled vs Uncontrolled Inputs

Prefer `defaultValue` over `value` for TextInput on the old architecture:

```tsx
// Preferred - uncontrolled
<TextField.Input
  defaultValue={initialEmail}
  onChangeText={setEmail}
/>

// Avoid when possible - controlled (can cause performance issues)
<TextField.Input
  value={email}
  onChangeText={setEmail}
/>
```

### Platform-Specific Behavior

Some components behave differently across platforms:

- `Dialog.Handle` – Only renders on native (drag handle for bottom sheet)
- `Dialog.Close` – Only renders on web (X button)
- `Menu.Divider` – Only renders on web
- `Menu.ContainerItem` – Only works on native

Always test on multiple platforms when using these components.

### React Compiler is Enabled

This codebase uses React Compiler, so **don't proactively add `useMemo` or `useCallback`**. The compiler handles memoization automatically.

```tsx
// UNNECESSARY - React Compiler handles this
const handlePress = useCallback(() => {
  doSomething()
}, [doSomething])

// JUST WRITE THIS
const handlePress = () => {
  doSomething()
}
```

Only use `useMemo`/`useCallback` when you have a specific reason, such as:

- The value is immediately used in an effect's dependency array
- You're passing a callback to a non-React library that needs referential stability

## Best Practices

1. **Accessibility**: Always provide `label` prop for interactive elements, use `accessibilityHint` where helpful

2. **Translations**: Wrap ALL user-facing strings with the `` l`…` `` macro or the `<Trans>` component

3. **Styling**: Combine static atoms with theme atoms, use platform utilities for platform-specific styles

4. **State**: Use TanStack Query for server state, React Context for UI preferences

5. **Components**: Check if a component exists in `#/components/` before creating new ones

6. **Types**: Define explicit types for props, use `NativeStackScreenProps` for screens

7. **Testing**: Components should have `testID` props for E2E testing

## Key Files Reference

| Purpose           | Location                                     |
| ----------------- | -------------------------------------------- |
| Theme definitions | `src/alf/themes.ts`                          |
| Design tokens     | `src/alf/tokens.ts`                          |
| Static atoms      | `src/alf/atoms.ts` (extends `@bsky.app/alf`) |
| Navigation config | `src/Navigation.tsx`                         |
| Route definitions | `src/routes.ts`                              |
| Route types       | `src/lib/routes/types.ts`                    |
| Query hooks       | `src/state/queries/*.ts`                     |
| Session state     | `src/state/session/index.tsx`                |
| i18n setup        | `src/locale/i18n.ts`                         |
## 🛠️ Local Development & Environment Quirks

### React Query Notes

- QV statistics must distinguish `BallotPrivacyUnavailable` / `FeatureNotEnabled`
  from retryable network failures and partition viewer-dependent caches by DID.
  Public delegation registration is not proof of effective electoral weight;
  never infer voting power from candidate delegation counts in the UI.

- **Persistence:** In Para, persisted React Query entries are still keyed off `PERSISTED_QUERY_ROOT` in [src/state/queries/index.ts](/Users/mlv/Desktop/TH1/PARA/src/state/queries/index.ts). If a query should survive app restarts, its query key needs that root at index `0`, and it should usually pair with `PERSISTED_QUERY_GCTIME`.
- **Refresh behavior:** For paginated feeds and similar infinite queries, prefer `truncateAndInvalidate` from [src/state/queries/util.ts](/Users/mlv/Desktop/TH1/PARA/src/state/queries/util.ts) over a bare `refetch()` when the goal is “reload from the top.” That trims cached pages back to the first page before invalidation so pull-to-refresh actually fetches fresh leading data.
- **Invalidation safety:** When a query key includes params, pass the full key shape during invalidation or truncation. Refresh bugs in feed surfaces often come from invalidating only the root feed descriptor while the live query also depends on `feedParams`.

### iOS Provisioning & App Clips

- **Issue:** The project includes an Apple App Clip target (`PARAAppClip`).
- **Personal Team Limitation:** Personal Apple Developer Teams (free accounts) do _not_ support the "App Clip" capability or the associated provisioning profiles.
- **Current Setup:** The `PARAAppClip` target has been manually removed from the Xcode project to allow local deployments to physical devices.
- **Future Reversion:** If building for production or a paid Enterprise/Organization team, restore the `PARAAppClip` target from `ios/PARA.xcodeproj/project.pbxproj` and ensure the `com.miguelabundis.para.AppClip` identifier is correctly provisioned.

### iOS Personal-Team Capability Restrictions (2026-06-02)

- **Issue:** `ios/PARA/PARA.entitlements` declared capabilities that even a paid
  personal Apple Developer team cannot provision:
  `aps-environment` (Push Notifications),
  `com.apple.developer.associated-domains` (Universal Links / App Clips),
  `com.apple.developer.kernel.extended-virtual-addressing`,
  `com.apple.developer.kernel.increased-memory-limit`, and
  `com.apple.developer.usernotifications.communication`.
- **Symptom:** Xcode fails to create a development provisioning profile with
  `Personal development teams, including "<name>", do not support the
  Communication Notifications, Extended Virtual Addressing, Push
  Notifications, and Associated Domains capabilities.`
- **Decision:** Split into two entitlements files. Debug builds use a stripped
  entitlements file; Release builds keep the full one for production.
  - `ios/PARA/PARA.dev.entitlements` — Debug only. Contains only
    `com.apple.security.application-groups` (the one capability safe for
    personal teams).
  - `ios/PARA/PARA.entitlements` — Release (unchanged). Full capabilities.
- **Xcode wiring:** Debug config (`13B07F941A680F5B00A75B9A`) at
  `ios/PARA.xcodeproj/project.pbxproj:659` now points to
  `PARA/PARA.dev.entitlements`. Release config at line 698 still points to
  `PARA/PARA.entitlements`.
- **Implications:** Debug builds lose push notifications, universal links, and
  the kernel extended-VA / increased-memory entitlements. Acceptable for local
  dev — the user is running the app on their own device, not shipping.

### iOS Bundle ID Rename (2026-06-02): `com.parasocial.app` → `com.para.app`

- **Decision:** Consolidated all bundle IDs and app groups to a single
  identifier prefix `com.para.app` (single app group `group.com.para.app`).
- **Reasoning:** The user had duplicate/stale identifiers across the PARA
  main target, BlueskyNSE, Share-with-Bluesky, and the App Clip extension.
  One identifier everywhere simplifies signing and the Apple Developer
  portal config.
- **Files updated:**
  - `ios/PARA.xcodeproj/project.pbxproj` — 6 `PRODUCT_BUNDLE_IDENTIFIER` lines
    (PARA / PARA.BlueskyNSE / PARA.Share-with-Bluesky × Debug/Release)
  - `ios/PARA/Info.plist` — `CFBundleURLSchemes` entry
  - `ios/PARA/PARA.entitlements` + `PARA.dev.entitlements` — app group
  - `ios/BlueskyNSE/BlueskyNSE.entitlements` — app group
  - `ios/Share-with-Bluesky/Share-with-Bluesky.entitlements` — app group
  - `ios/Share-with-Bluesky/ShareViewController.swift` — `containerURL`
  - `ios/BlueskyNSE/NotificationService.swift` — `APP_GROUP` constant
  - `app.config.js` — 4 `bundleIdentifier` + 3 `application-groups` + Android
    `package`
  - `plugins/shareExtension/*`, `plugins/notificationsExtension/*`,
    `plugins/starterPackAppClipExtension/*` — Expo config plugins
  - `google-services.json` (root + `android/app/`) — Android `package_name`
- **Build flag:** `package.json` `ios` script now passes
  `--allowProvisioningUpdates` to `xcodebuild` so automatic signing can
  create the App ID + app group on first build (instead of failing with
  "No profiles for ... were found").
- **Apple Developer Portal setup required:** Before the first build, make
  sure the team allows automatic signing. Xcode with the
  `-allowProvisioningUpdates` flag will register `com.para.app` and
  `group.com.para.app` automatically when the user is signed in with their
  Apple ID.

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

0. **Read the quarter plan:** the current planning horizon lives in the backend repo at `../WatZappa/docs/QUARTER_PLAN_2026Q4.md` (pilot community launch, Sep–Nov 2026). PARA's committed items per sprint are listed there; anything not listed is explicitly deferred.
   - **Map feature roadmap:** the in-repo map plan doc (`docs/MAP_QUARTER_PLAN_2027Q1.md`) was removed on 2026-09-21; map work (Dec 2026 – Feb 2027) remains deliberately outside the Q4 pilot plan until a new planning doc lands.
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
  cd /Users/mlv/Desktop/TH1/PARA
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
  cd /Users/mlv/Desktop/TH1/WatZappa
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
  cd /Users/mlv/Desktop/TH1/PARA
  pnpm seed:civic:apply --introspect-url http://127.0.0.1:2581
  ```
- **Important**:
  - Use the introspection URL on `apply` so AppView catches up after the seed writes.
  - If this command fails, do not continue to the demo UI until AppView responds for `active-a.test`.

### Terminal 6: PARA BSKYWEB FRONTEND

- **Profile color**: Blue Ocean
- **Commands**:
  ```bash
  cd /Users/mlv/Desktop/TH1/PARA/bskyweb
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

## 🛠️ Node Version Management (WatZappa)

### The problem (2026-06-02)

`better-sqlite3` is a native module. It compiles a `.node` binary for the
exact Node version that was active at `pnpm install` time. If you run
`pnpm install` with Node 24, then run scripts with Node 22 (or vice
versa), the binary won't load and you get:

```
Error: The module '.../better_sqlite3.node' was compiled against a
different Node.js version using NODE_MODULE_VERSION 137. This version
of Node.js requires NODE_MODULE_VERSION 127.
```

### Current pinning

- `PARA/.nvmrc` → `24.18.0`
- `WatZappa/.nvmrc` → `24.18.0`
- Root `.nvmrc` → `24`
- `engines.node` → `>=22` (WatZappa) / `>=24.18.0` (PARA)
- All subprojects should be installed with Node 24.18.0 so native
  modules like `better-sqlite3` compile against the same ABI.

### Safeguards in place (WatZappa/package.json)

- **`preinstall`** — bails out with a clear error if `node --version`
  is below 22. Run `nvm use` and retry.
- **`postinstall`** — runs `pnpm rebuild better-sqlite3` so the binary
  always matches the Node version that just ran the install, no matter
  what state `node_modules` was in before.

### The rule going forward

- **Always `cd` into the subproject before `pnpm install`.**
  The `load-nvmrc` hook in `~/.zshrc` will auto-switch to the version
  declared in that directory's `.nvmrc` (24.18.0 for PARA and WatZappa).
  Don't run install from a parent directory — you'll build against the
  wrong Node.
- If you ever see the `NODE_MODULE_VERSION` mismatch again, the fix is:
  ```bash
  cd /Users/mlv/Desktop/TH1/WatZappa
  nvm use
  pnpm rebuild better-sqlite3
  ```
  Don't `pnpm install --force` unless the rebuild fails — it's slower
  and you risk re-introducing other inconsistencies.

### Why not just upgrade to Node 24

The user's default is Node 24, which would eliminate the auto-switch
friction. But WatZappa's `dev-infra/with-redis-and-db.sh` and several
Docker images assume Node 22, and bsky upstream's dev-env still pins 22.
Keeping the project on 22 matches upstream; switching the user's
default Node 24 → 22 via `nvm alias default 22` would be the cleanest
long-term move if WatZappa maintenance becomes frequent.

---

# PARA — AI Agent Notes

This file captures decisions, conventions, and rules that AI agents must follow
when working in this codebase. Update it whenever a significant architectural
decision is made.

---

## 2026-09-22: Cabildeo consolidation + de-mocking

Cabildeo UI was judged feature-complete (5 screens, full create→vote→delegate
loop). Follow-up work is quality, not new surfaces. Decisions made:

- **No silent mock fallback for cabildeo data.** `useCabildeosQuery`,
  `useCabildeoQuery` and `useCabildeoPositionsQuery` no longer serve
  `MOCK_CABILDEO_VIEWS` when the backend is empty/erroring in dev — empty
  states and errors surface for real. Seed the backend instead
  (`pnpm seed:civic:apply --introspect-url http://127.0.0.1:2581`).
  `src/lib/mock-data/cabildeos.ts` still exists for the legacy
  `src/lib/services/policies.ts` and `DiscourseAnalysis` mocks (separate,
  not-yet-de-mocked domains).
- **Party stats are real data only.** `src/lib/cabildeo-party-alignment.ts`
  (hash-of-URI party assignment) is deleted. Replacement:
  `src/lib/cabildeo-party-stats.ts`, built on the backend-hydrated
  `partyVoteSummary` (per-party vote breakdown from `para_status.party`,
  present only on `party_only`-visibility cabildeos). Agora's "party desk"
  and MyAffiliations' Vote Analysis consume it. Do not reintroduce
  inferred/ fabricated party alignment — same rule as delegation counts.
- **Official cabildeo signatures UI removed** ("Posturas oficiales" section in
  `CabildeoDetailScreen`, plus `useOfficialCabildeoSignaturesQuery` /
  `useSignOfficialCabildeoMutation`). It was backed by an in-memory array and
  a mock controller map, so no real user could ever sign. Reintroduce only
  with a real officials backend (AppView indexing for
  `com.para.official.action` — does not exist yet in WatZappa).
- **Two detail surfaces, split by policy/matter linkage.** Cabildeos created
  linked to a policy or matter (flairs with the `||policy` / `|matter` marker
  convention — see `getCabildeoLinkKind` in `src/lib/cabildeo-display.ts`)
  open in `PolicyDetails{cabildeoUri}` (policy chrome); standalone community
  cabildeos open in `CabildeoDetail` (full civic surface: quadratic voting,
  delegation, sortition). `SeeVotesScreen` and `MyAffiliationsScreen` route by
  this rule. `PolicyDetails` also links out to `CabildeoDetail` for related
  cabildeo models. Keep both surfaces; do not collapse them.
- **Grace period is server-authoritative.** `delegateVoteEvent.gracePeriodEndsAt`
  (from the AppView viewerContext) is now threaded through
  `mapCabildeoReadViewToView` and preferred by the detail screen's 24h
  confirm-banner; `votedAt + 24h` is only the fallback.
- **Create form exposes the full record:** `communities[]`, `flairs[]`,
  `minQuorum`, `phaseDeadline` (7/14/30-day presets) were added to
  `CreateCabildeoScreen`.

Known remaining mocks outside this pass: `DiscourseAnalysis` (fake discourse
snapshots), `official-civic-accounts` controllers/entities (still in-memory for
representative/pajareo surfaces), live presence (`putLivePresence` + liveSession
— deferred per QUARTER_PLAN_2026Q4).

---

## 2026-09-23: Cabildeo phase lifecycle + linkage picker

- **Phases are author-advanced via `putRecord`, no backend endpoint.** The
  PDS vote gate (`castVote`) rejects votes unless phase is `voting` and the
  deadline hasn't passed; it reads phase from the AppView row. The bsky
  indexer's `RecordProcessor.updateRecord` handles record updates generically
  (delete + re-insert + `recomputeCabildeoAggregates`), so an author
  rewriting `com.para.civic.cabildeo` propagates through the firehose with
  zero WatZappa changes. Client: `advanceCabildeoPhase` in
  `src/lib/api/cabildeo.ts` (getRecord → forward-only phase step → putRecord),
  `useAdvanceCabildeoPhaseMutation`, and the author-only panel under the
  phase timeline in `CabildeoDetailScreen`. Transitioning into `voting` with
  a missing/stale `phaseDeadline` opens a fresh 7-day window (otherwise the
  ballot would be permanently unvotable). Resolving is terminal and needs a
  second confirming tap.
- **Create-form linkage uses the shared CivicNodeResults picker**, not free
  text: `CreateCabildeoScreen` opens a dialog with
  `CivicNodeResults kind="topic"`
  (`src/features/personalCivicTree/components/CivicNodePicker.tsx`). Curated
  picks map `flairId` → `POST_FLAIRS[].tag` (canonical `||#Policy` /
  `|#Matter` strings); an invented topic becomes a `|#` matter tag (official
  `||#` policy tags are curated-only). Selected tags land in `flairs[]` and
  drive `getCabildeoLinkKind` detail routing. Don't go back to asking users
  to type prefix markers by hand.

---

## 2026-09-24: Auto-managed local-dev env (Bonjour host + live DIDs)

The manual env-chore ("update your IP when you move between networks") and the
recurring `could not resolve proxy did` sign-in failure are both fixed by one
mechanism:

- **`pnpm start` / `pnpm ios` / `pnpm android` / `pnpm web` now run
  `scripts/sync-local-dev-env.js` first**, which delegates to
  `../WatZappa/scripts/sync-local-dev-service.sh` (skips gracefully if the
  sibling checkout is missing, e.g. worktrees).
- **Host over IP:** the script writes the Mac's Bonjour name
  (`scutil --get LocalHostName` + `.local`, e.g. `Mikes-Mac-mini.local`) to
  `EXPO_PUBLIC_LOCAL_DEV_HOST` and the LAN IP to `EXPO_PUBLIC_LOCAL_DEV_IP`
  (fallback for mDNS-blocking networks). `constants.ts` composes device URLs
  as host → IP → localhost; iOS resolves `.local` via mDNS on any network, so
  DHCP changes no longer matter. ATS already allows this via
  `NSAllowsLocalNetworking`. Escape hatch for hostile networks: pin IP URLs in
  `PARA/.env.local` (they win until removed); overrides:
  `EXPO_PUBLIC_LOCAL_DEV_SERVICE` / new `EXPO_PUBLIC_LOCAL_DEV_APPVIEW_SERVICE`.
- **AppView proxy DID is derived live, never hard-coded:** the script curls the
  dev-env introspection server (`http://127.0.0.1:2581/`, field `bsky.did`) and
  writes `EXPO_PUBLIC_LOCAL_BSKY_PROXY_DID` to `PARA/.env`; if the backend is
  down it keeps the previous value. The DID re-mints when the dev-env data
  directory is recreated — stale hard-coded DIDs (sbj4…, dw4k…, and the
  constants fallback 6gcj…) were the root cause of the recurring
  "could not resolve proxy did" (the PLC 404s an unregistered proxy DID).
  Physical devices resolve PLC/service DIDs fine; only the *host* URLs need
  the Bonjour name.
- **`PARA/.env.local` must stay small** (currently just
  `EXPO_PUBLIC_USE_LOCAL_DEV_SERVICE=1`). It overrides `.env`, so pinning the
  managed keys there reintroduces silent drift. The managed keys are listed in
  that file's header comment.
- **Backend side:** the script also points `DEV_ENV_PDS_HOSTNAME` /
  `DEV_ENV_BSKY_PUBLIC_URL` (WatZappa `.env.local`) at the Bonjour name, so
  newly minted DID documents carry network-independent endpoints. Existing
  accounts keep the endpoint their DID document was created with.
- Android emulator is unaffected (`10.0.2.2`); physical Android still prefers
  the IP fallback (Android mDNS resolution for plain hostnames is unreliable).

---

## 2026-08-29: Local dev networking + error-surface fixes

- **`EXPO_PUBLIC_LOCAL_DEV_IP` drift:** superseded by the 2026-09-24
  auto-managed env above — the IP is no longer pinned in `.env.local`; the
  sync script writes host + IP to `PARA/.env` before every dev-server start.
- **Metro caches env vars at transform time.** Editing `.env.local` does
  nothing until Metro is restarted with a cleared cache
  (`npx expo start --clear`). Verified by grepping the served bundle
  (`curl localhost:8081/index.bundle?platform=ios... | grep LOCAL_DEV_IP`).
  On the iOS simulator the PDS URL is `localhost:2583` (IP-independent), but
  `DEV_ENV_APPVIEW` in `src/lib/constants.ts` always uses
  `http://${LOCAL_DEV_IP}:2584`, so a stale IP breaks AppView calls even on
  the simulator.
- **Background/backgrounded-service queries must degrade gracefully.** Two
  known local-dev error sources were converted from red LogBox screens to
  `logger.warn`:
  - `useUnreadCountQuery` (matrix bridge on `:3001`) now returns
    `{unread: 0, communities: []}` when the bridge is unreachable. The bridge
    container (`para-matrix-bridge`) does not build currently — its Dockerfile
    fails compiling `@atproto/lex-data`; the rest of the matrix compose stack
    runs.
  - Global `QueryCache.onError` in `src/lib/react-query.tsx` now logs
    `MethodNotImplemented` (501) responses at warn level. The local watx
    AppView intentionally throws "Suggestions/Topics agent not available"
    because IRIS is not part of the dev stack.
- **Remaining local-dev red-screen sources (not yet handled):** "Search v2 is
  not enabled" (Open Questions screen calls search v2 while the
  `SearchV2Enable` flag is off — GrowthBook 404s locally) and chat
  "Poll latest failed" 500s from the local AppView chat routes.

---

## 2026-07-13: pnpm 11.11.0 alignment and web dev build fix

- **pnpm version:** Both `WatZappa/` and `PARA/` now declare
  `packageManager: "pnpm@11.11.0"`, matching the upstream atproto workspace.
  Run `corepack enable pnpm` so the corepack shim is used instead of any
  Homebrew/global pnpm binary.
- **PARA web dev build (`pnpm web`):** Webpack now stubs out
  `react-native/Libraries/Core/setUpReactDevTools.js` via a
  `NormalModuleReplacementPlugin`, because the real module imports a private
  `ReactDevToolsSettingsManager` path that does not exist in the installed
  `react-devtools-core` version. The dev server and `expo export:web --dev`
  compile successfully (with pre-existing non-fatal warnings).
- **PARA patch config:** Removed a stray duplicate `react-native` patch entry
  from `pnpm-workspace.yaml` so the workspace `patchedDependencies` matches
  `pnpm-lock.yaml` under pnpm 11.

---


## 2026-06-02: Restored missing `src/components/Pills.tsx` (fixes QuoteEmbed crash)

- **Symptom:** React Native red box on iOS: "Element type is invalid:
  expected a string ... but got: undefined. Check the render method of
  `QuoteEmbed`." Component stack: `Embed` → `RecordEmbed` →
  `QuoteEmbed` → renders `PostAlerts` (when post has moderation alerts)
  → throws.
- **Root cause:** `src/components/moderation/PostAlerts.tsx:5` does
  `import * as Pills from '#/components/Pills'` and uses `<Pills.Row>`
  and `<Pills.Label>`. The `Pills` module did not exist in the PARA
  fork (it was dropped during a bsky-upstream sync). 11+ files import
  from `'#/components/Pills'`, all broken: `PostAlerts`, `ProfileCard`,
  `ProfileHoverCard`, `ProfileHeaderAlerts`,
  `ModerationDetailsDialog`, `ThreadItemPost`, `ThreadItemAnchor`,
  `ThreadItemTreePost`, `maybeApplyGalleryOffsetStyles`, `PostFeedItem`.
- **Fix:** Added `src/components/Pills.tsx` from bsky upstream
  `1.122.0`. Exports `Row`, `Label`, `FollowsYou`, `CommonProps`,
  `AppModerationCause`, `LabelProps`.
- **Lesson learned:** When the PARA fork diverges from bsky upstream, a
  missing file at a popular import path silently makes every consumer
  render `undefined`. The "Element type is invalid" error from React
  then points to whichever component happened to mount the broken
  child — not to the missing module. When debugging this class of
  error, always check that *every* import in the failing subtree
  resolves to a real file, not just the import at the top of the
  reported component.

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


---

## Search Filters

The search screen supports two layers of filters:

1. **Upstream/advanced filters** (`author`, `mentions`, `domain`, `tag`, `since`, `until`, etc.) modeled in `src/screens/Search/searchParams.ts` and sent to `app.bsky.feed.searchPosts` (v1) or `app.bsky.feed.searchPostsV2` (v2) when `SearchV2Enable` is on.
2. **PARA-specific filters** (`postType`, `flairs`, `party`, `verifiedPublicFigure`, `state`, `districtKey`, `cabildeoPhase`, plus the array-based `tag`, `communityUris`, `cabildeoUris`, `politicalCompassPositions`) that route the query to `com.para.feed.searchPosts` as soon as any of them is active.

### Where to edit

- `src/screens/Search/searchParams.ts` — source of truth for route-param serialization. Use `searchFiltersToParaFilters()` and `paraFiltersToSearchFilters()` to convert between the string-based route representation and the structured `ParaSearchPostsFilters` type.
- `src/screens/Search/ParaSearchFiltersBar.tsx` — horizontal chip bar. It is controlled by `SearchFilters` and reports changes back through `onChange(filters: SearchFilters)`.
- `src/screens/Search/SearchResults.tsx` — derives `ParaSearchPostsFilters` from route `SearchFilters` and forwards them to `useParaSearchPostsQuery`.
- `src/view/shell/desktop/Search.tsx` — desktop header entry point for the advanced filter dialog.

### Routing / share links

All PARA filters are now encoded as route params so they survive URL/share links and search history:

- `tag` stays space-separated (upstream convention).
- All other list filters (`flairs`, `communityUris`, `cabildeoUris`, `politicalCompassPositions`) are comma-separated.
- `verifiedPublicFigure` is stored as the string `'true'`.

### Feature flags

- `SearchV2Enable` — toggles between Bluesky search v1 and structured v2 when no PARA filters are active.
- `AdvancedSearchV2Enable` — gates the advanced search dialog UI (currently wired alongside the PARA chip bar).

### After changing filters or strings

```bash
cd PARA
pnpm intl:extract
pnpm intl:compile
pnpm test src/screens/Search/__tests__/searchParams.test.ts
```

### Backend counterpart

`com.para.feed.searchPosts` lives in `WatZappa/packages/bsky/src/api/com/para/feed/searchPosts.ts` and the data-plane SQL in `WatZappa/packages/bsky/src/data-plane/server/routes/search.ts`. After any lexicon change, run `cd WatZappa && make codegen`.
