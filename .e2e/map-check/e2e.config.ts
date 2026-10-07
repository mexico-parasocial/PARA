import {mobile} from '@e2e-dev/mobile'
import type {E2EConfig} from 'e2e'
export default {
  targets: [
    {
      name: 'ios-map',
      engine: mobile({platform: 'ios', device: 'iPhone 17'}),
      app: {
        bundleId: 'com.para.app',
        launchArguments: [
          '--initialUrl',
          'http://localhost:8081',
          '-EXDevMenuShowsAtLaunch',
          'NO',
          '-EXDevMenuIsOnboardingFinished',
          'YES',
        ],
      },
    },
  ],
  tests: ['map.e2e.ts'],
  workers: 1,
  timeout: 180_000,
  assertionTimeout: 90_000,
} satisfies E2EConfig
