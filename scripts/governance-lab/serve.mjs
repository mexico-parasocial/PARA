import {execFileSync} from 'node:child_process'
import {createServer} from 'node:http'
import {readFileSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const backend = fileURLToPath(new URL('../../../WatZappa/packages/bsky/', import.meta.url))
const compiler = join(backend, '../../node_modules/@typescript/native/bin/tsc')
const output = mkdtempSync(join(tmpdir(), 'para-governance-lab-'))
const port = Number(process.env.GOVERNANCE_LAB_PORT ?? 8931)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  rmSync(output, {recursive: true, force: true})
  throw new Error('GOVERNANCE_LAB_PORT must be between 1024 and 65535')
}
try {
  execFileSync(process.execPath, [compiler, '-p', 'tsconfig.governance-lab.json', '--outDir', output], {cwd: backend, stdio: 'inherit'})
} catch (error) {
  rmSync(output, {recursive: true, force: true})
  throw error
}
const files = new Map([
  ['/', [fileURLToPath(new URL('./index.html', import.meta.url)), 'text/html; charset=utf-8']],
  ['/lab.css', [fileURLToPath(new URL('./lab.css', import.meta.url)), 'text/css; charset=utf-8']],
  ['/lab.js', [fileURLToPath(new URL('./lab.js', import.meta.url)), 'text/javascript; charset=utf-8']],
  ...['engine', 'fixtures', 'types'].map(name => [`/assets/${name}.js`, [join(output, `${name}.js`), 'text/javascript; charset=utf-8']]),
])
const server = createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method) || ![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host)) {
    res.writeHead(403).end()
    return
  }
  const file = files.get(req.url)
  if (!file) { res.writeHead(404).end(); return }
  res.writeHead(200, {
    'Content-Type': file[1], 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'none'; frame-ancestors 'none'; form-action 'none'; base-uri 'none'",
  })
  res.end(req.method === 'HEAD' ? undefined : readFileSync(file[0]))
})
server.on('error', error => { console.error(error.message); process.exitCode = 1; rmSync(output, {recursive: true, force: true}) })
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.close(() => rmSync(output, {recursive: true, force: true})))
}
server.listen(port, '127.0.0.1', () => console.log(`Synthetic governance lab: http://127.0.0.1:${port}`))
