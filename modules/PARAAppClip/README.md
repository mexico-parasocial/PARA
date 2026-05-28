# PARAAppClip

An iOS App Clip implementation for PARA starter packs. The App Clip gives users
a lightweight preview flow for starter packs without requiring a full install.

## What It Does

PARAAppClip opens starter pack links in a minimal iOS experience and bridges the
selected starter pack into the main app through shared `UserDefaults`.

The App Clip:

1. Loads the starter pack web page in a `WKWebView`
2. Lets the user preview the starter pack content
3. Opens the App Store overlay when the user chooses to continue
4. Stores the starter pack URI for the full PARA app to read later

## Architecture

### Native iOS App Clip

The App Clip target is a small standalone Swift app:

- `AppDelegate.swift`: boots the clip and routes incoming URLs and universal links
- `ViewController.swift`: manages the web view, detects starter pack links, and handles bridge messages from the web content

### Communication Flow

1. A user taps a PARA starter pack link.
2. iOS launches the `PARAAppClip` App Clip.
3. The clip loads the starter pack web experience with clip-aware query params.
4. The web layer posts actions back to native code.
5. Native code either presents the App Store sheet or stores the starter pack URI in the shared app group.
6. The full PARA app can later read the stored URI and continue onboarding.

## Configuration

The App Clip is configured through the Expo config plugins in
`plugins/starterPackAppClipExtension/`.

Key plugin responsibilities:

- create the Xcode target
- wire the App Clip entitlements and app-group sharing
- generate the App Clip Info.plist
- copy the native App Clip files into the iOS build tree

The current target name is `PARAAppClip`, and it shares data with the main app
through the configured app group.
