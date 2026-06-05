# Building a PARA APK

## Prerequisites

- Node.js 24.15+ and pnpm installed
- An [Expo account](https://expo.dev/signup) (free — 30 Android builds/month)
- EAS CLI: `pnpm add -g eas-cli` (or use `pnpm dlx eas-cli` without installing)

## One-time setup

```bash
# Log in to your Expo account
eas login

# Confirm the project is linked (should already be set in app.config.js)
eas project:info
```

## Build profiles

| Profile | Output | Points at | Use when |
|---|---|---|---|
| `preview` | APK (sideloadable) | production PDS | Quick test on a real device |
| `production-apk` | APK (sideloadable) | production PDS | Sharing a release candidate |
| `production` | AAB (Play Store) | production PDS | Publishing to Play Store |
| `development` | APK with dev client | production PDS | Debugging native modules |

All profiles use `EXPO_PUBLIC_ENV=production` (points at the live PARA backend).
See "Dev APK" below if you need to point at a local dev-env instead.

## Build commands

```bash
cd /Users/juandiaz/proyecto/PARA

# Sideloadable APK — fastest, good for device testing
pnpm dlx eas-cli build -p android --profile preview

# Sideloadable APK — production build, no version bump
pnpm dlx eas-cli build -p android --profile production-apk

# Play Store AAB — bumps version number automatically
pnpm dlx eas-cli build -p android --profile production
```

EAS will print a URL when the build is queued. Builds take ~10–15 minutes.
When done, scan the QR code or download the `.apk` directly and install it.

## Installing the APK on your phone

1. Download the `.apk` from the EAS build page
2. On Android: Settings → Security → **Install unknown apps** → allow your browser/Files app
3. Open the downloaded `.apk` and tap Install

## Dev APK (points at local dev-env)

If you want an APK that talks to your local WatZappa instance instead of production, add a profile to `eas.json`:

```json
"dev-device": {
  "extends": "base",
  "distribution": "internal",
  "channel": "development",
  "env": {
    "EXPO_PUBLIC_ENV": "development",
    "EXPO_PUBLIC_USE_LOCAL_DEV_SERVICE": "1",
    "EXPO_PUBLIC_LOCAL_DEV_IP": "192.168.100.122"
  }
}
```

Then build with:
```bash
pnpm dlx eas-cli build -p android --profile dev-device
```

The app will connect to `http://192.168.100.122:2583` (your Mac's local WatZappa PDS).
Your phone and Mac must be on the same WiFi network.

## Troubleshooting

**"unable to resolve module"** — a native dependency import is broken. Run `pnpm typecheck` or `pnpm lint` to find it before submitting the build.

**Build fails on EAS** — check the build logs on [expo.dev/accounts](https://expo.dev/accounts). The most common causes are: wrong Node version, missing env vars, or a bad native module.

**APK installs but crashes on launch** — enable **USB debugging** on your phone, connect via USB, and run:
```bash
adb logcat | grep -i "para\|react\|error"
```
