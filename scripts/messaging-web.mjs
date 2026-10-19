// Read current service DIDs without editing the running demo's environment.
import {spawn} from 'node:child_process'

const response = await fetch('http://127.0.0.1:3581/')
if (!response.ok) throw new Error('Start WatZappa make run-messaging-env first')
const services = await response.json()
for (const service of ['pds', 'bsky', 'chat', 'plc']) {
  if (!services[service]?.url) throw new Error(`Missing messaging ${service} service`)
}
for (const service of ['bsky', 'chat']) {
  const resolved = await fetch(`${services.plc.url}/${services[service].did}`)
  if (!resolved.ok) throw new Error(`Messaging ${service} DID is not registered`)
}
const health = await fetch('http://127.0.0.1:3001/healthz')
if (!health.ok) throw new Error('Messaging bridge is unavailable')
const brokerHealth = await fetch('http://127.0.0.1:8788/v1/health')
if (!brokerHealth.ok) throw new Error('Start the isolated messaging broker first')
const child = spawn('pnpm', ['--config.verify-deps-before-run=false', 'exec', 'expo', 'start', '--web', '--port', '8084'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_ENV: 'development',
    EXPO_PUBLIC_USE_LOCAL_DEV_SERVICE: '1',
    EXPO_PUBLIC_LOCAL_DEV_SERVICE: services.pds.url,
    EXPO_PUBLIC_DEFAULT_SERVICE: services.pds.url,
    EXPO_PUBLIC_LOCAL_APPVIEW_URL: services.bsky.url,
    EXPO_PUBLIC_LOCAL_BSKY_PROXY_DID: services.bsky.did,
    EXPO_PUBLIC_LOCAL_CHAT_PROXY_DID: services.chat.did,
    EXPO_PUBLIC_M8_BROKER_URL: 'http://localhost:8788',
    EXPO_PUBLIC_MATRIX_BRIDGE_URL: 'http://localhost:3001',
    EXPO_PUBLIC_MATRIX_IDP_URL: 'http://localhost:8090',
    EXPO_PUBLIC_MATRIX_PUSH_GATEWAY_URL: 'http://localhost:3001/_matrix/push/v1/notify',
  },
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code ?? 1 })
