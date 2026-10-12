const http = require('node:http');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const esbuild = require('esbuild')
const puppeteer = require(require.resolve('puppeteer', {paths: [path.resolve(__dirname, '../../WatZappa/packages/pds')]}));
const root = path.resolve(__dirname, '../assets/chat');
const deviceStoreScript = esbuild.buildSync({
  entryPoints: [path.resolve(__dirname, '../src/features/encryptedChat/webCryptoStore.ts')],
  bundle: true, format: 'iife', globalName: 'paraDeviceStore', write: false,
}).outputFiles[0].text
const server = http.createServer((req, res) => {
  if (req.url === '/') {res.setHeader('Content-Type', 'text/html'); return res.end('<script src="/bundle.js"></script><script src="/device-store.js"></script>');}
  if (req.url === '/device-store.js') {
    res.setHeader('Content-Type', 'application/javascript'); return res.end(deviceStoreScript)
  }
  const wasm = req.url === '/assets/chat/matrix-sdk-crypto.wasm';
  res.setHeader('Content-Type', wasm ? 'application/wasm' : 'application/javascript');
  res.end(fs.readFileSync(path.join(root, wasm ? 'matrix-sdk-crypto.wasm' : 'matrix-js-sdk.bundle.txt')));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await puppeteer.launch({headless: true});
  try {
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const result = await page.evaluate(async () => {
      const h = window.paraMatrixCrypto;
      await h.initAsync();
      const store = await paraDeviceStore.getWebCryptoStore('did:plc:browser-fixture', 'https://matrix.example', 'BROWSERTEST')
      const sameStore = await paraDeviceStore.getWebCryptoStore('did:plc:browser-fixture', 'https://matrix.example', 'BROWSERTEST')
      const otherStore = await paraDeviceStore.getWebCryptoStore('did:plc:another-fixture', 'https://matrix.example', 'BROWSERTEST')
      const accountPartitioned = store.cryptoStorePrefix !== otherStore.cryptoStorePrefix && store.cryptoStorageKey !== otherStore.cryptoStorageKey
      const wrappingKeyStable = store.cryptoStorageKey === sameStore.cryptoStorageKey
      const storageKey = Uint8Array.from(store.cryptoStorageKey.match(/../g), byte => parseInt(byte, 16))
      const pending = await h.createPendingRecoveryStore(store.cryptoStorePrefix, storageKey)
      await pending.set('private-recovery-fixture')
      const pendingEncryptedAtRest = !localStorage.getItem(store.cryptoStorePrefix + '.pending-recovery').includes('private-recovery-fixture')
      const input = new TextEncoder().encode('encrypted media acceptance fixture');
      const encrypted = h.Attachment.encrypt(input);
      const encryptedData = encrypted.encryptedData;
      const info = encrypted.mediaEncryptionInfo;
      const plain = h.Attachment.decrypt(new h.EncryptedAttachment(encryptedData, info));
      const tampered = encryptedData.slice(); tampered[0] ^= 1;
      let rejected = false;
      try {h.Attachment.decrypt(new h.EncryptedAttachment(tampered, info));} catch {rejected = true;}
      encrypted.free();
      const client = matrixcs.createClient({baseUrl: 'https://matrix.example', userId: '@test:matrix.example', deviceId: 'BROWSERTEST'});
      await client.initRustCrypto({useIndexedDB: true, cryptoDatabasePrefix: store.cryptoStorePrefix, storageKey});
      const cryptoReady = !!client.getCrypto();
      client.getCrypto().stop();
      return {mediaMatches: new TextDecoder().decode(plain) === new TextDecoder().decode(input), tamperingRejected: rejected, cryptoReady, accountPartitioned, wrappingKeyStable, pendingEncryptedAtRest};
    });
    assert.deepEqual(result, {mediaMatches: true, tamperingRejected: true, cryptoReady: true, accountPartitioned: true, wrappingKeyStable: true, pendingEncryptedAtRest: true});
    await page.reload();
    const restored = await page.evaluate(async () => {
      const store = await paraDeviceStore.getWebCryptoStore('did:plc:browser-fixture', 'https://matrix.example', 'BROWSERTEST')
      const storageKey = Uint8Array.from(store.cryptoStorageKey.match(/../g), byte => parseInt(byte, 16))
      const client = matrixcs.createClient({baseUrl: 'https://matrix.example', userId: '@test:matrix.example', deviceId: 'BROWSERTEST'});
      await client.initRustCrypto({useIndexedDB: true, cryptoDatabasePrefix: store.cryptoStorePrefix, storageKey});
      const ready = !!client.getCrypto(); client.getCrypto().stop();
      const pending = await window.paraMatrixCrypto.createPendingRecoveryStore(store.cryptoStorePrefix, storageKey)
      const pendingKeyRestored = await pending.get() === 'private-recovery-fixture'
      const wrongStore = await window.paraMatrixCrypto.createPendingRecoveryStore(store.cryptoStorePrefix, new Uint8Array(32))
      let wrongKeyRejected = false
      try {await wrongStore.get()} catch {wrongKeyRejected = true}
      pending.acknowledge()
      const acknowledgedKeyRemoved = await pending.get() === undefined
      return {cryptoRestoredAfterReload: ready, pendingKeyRestored, wrongKeyRejected, acknowledgedKeyRemoved};
    });
    assert.deepEqual(restored, {cryptoRestoredAfterReload: true, pendingKeyRestored: true, wrongKeyRejected: true, acknowledgedKeyRemoved: true});
    console.log(JSON.stringify({...result, ...restored}));
  } finally {await browser.close(); server.close();}
})().catch(error => {console.error(error); server.close(); process.exitCode = 1;});
