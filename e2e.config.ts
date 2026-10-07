import {mobile} from '@e2e-dev/mobile'
import {web} from '@e2e-dev/web'
import type {E2EConfig} from 'e2e'
import {chatgpt} from 'e2e/oauth/chatgpt'

export default {
  // Your ChatGPT subscription serves the model; sign in once with `e2e login openai`, `e2e models openai` lists the ids.
  agents: {
    default: {
      model: chatgpt('gpt-6-luna'),
      system: 'You are a thorough QA agent. Verify every outcome.',
    },
  },
  targets: [
    {
      name: 'para-web',
      engine: web({locale: 'en-US'}),
      app: {
        url: 'http://localhost:19006',
        command: {
          executable: 'corepack',
          args: ['pnpm', 'web', '--port', '8082'],
          reuseExisting: true,
          startupTimeout: 120_000,
          log: '.e2e/logs/app.log',
        },
      },
    },
    {
      name: 'ios',
      engine: mobile({platform: 'ios'}),
      app: {bundleId: 'com.para.app'},
    },
  ],
  assertionTimeout: 30_000,
  workers: 1,
} satisfies E2EConfig
