# TesterArmy UI tests

Run from the PARA directory with its pinned Node and pnpm versions:

```bash
nvm use
corepack pnpm test:e2e --headed
```

The `para-web` target in `e2e.config.ts` starts Expo Web on port 19006,
with Metro on port 8082, or reuses the existing web server there. The first
run downloads Chromium.
`tests/para.e2e.ts` clicks Sign in in the visitor welcome dialog and checks
the username form. It needs no model login or test account because it does
not submit credentials. Feed and other background API requests still use
the app's configured services. Results and browser traces go into `.e2e/`.

Run a single file:

```bash
corepack pnpm test:e2e tests/para.e2e.ts --headed
```

Add browser tests as `tests/*.e2e.ts` and declare `requires: ['browser']`.
Use the existing screen test IDs and assert the outcome of each action.
The configured model is used only when a test calls `agent.*`; authenticate
the selected provider before adding those steps.

The iOS target points at `com.para.app`. Its smoke test requires PARA to be
installed and runnable on a simulator; it is separate from the web command:

```bash
corepack pnpm test:e2e:ios
```

For Expo development builds, start Metro and configure the simulator's
launch arguments as described in `.agents/skills/e2e/references/setup.md`.

Jest (`pnpm test`) checks code and components in a test environment.
TesterArmy checks the running UI in a browser or device. Maestro remains
available through the existing `pnpm e2e:run` command.

Documentation: https://e2e.tester.army/docs/quickstart
