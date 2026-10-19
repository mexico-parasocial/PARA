export interface WebCryptoStore {
  cryptoStorePrefix: string
  cryptoStorageKey: string
}

/** Keep the wrapping key non-extractable and scope the encrypted store to one device. */
export async function getWebCryptoStore(
  accountDid: string,
  homeServer: string,
  deviceId: string,
): Promise<WebCryptoStore> {
  if (!window.isSecureContext || !crypto.subtle || !indexedDB)
    throw new Error('CHAT_SECURE_BROWSER_REQUIRED')
  const scope = new TextEncoder().encode(
    JSON.stringify([accountDid, homeServer, deviceId]),
  )
  const digest = await crypto.subtle.digest('SHA-256', scope)
  const id = Array.from(new Uint8Array(digest), b =>
    b.toString(16).padStart(2, '0'),
  ).join('')
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('para-chat-device-keys', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('keys')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('CHAT_CRYPTO_STORE_UNAVAILABLE'))
  })
  try {
    const candidate = await crypto.subtle.generateKey(
      {name: 'HMAC', hash: 'SHA-256'},
      false,
      ['sign'],
    )
    const key = await new Promise<CryptoKey>((resolve, reject) => {
      const transaction = db.transaction('keys', 'readwrite')
      const store = transaction.objectStore('keys')
      const request = store.get(id)
      let selected: CryptoKey
      request.onsuccess = () => {
        selected = request.result ?? candidate
        if (!request.result) store.add(candidate, id)
      }
      transaction.oncomplete = () => resolve(selected)
      transaction.onerror = transaction.onabort = () =>
        reject(new Error('CHAT_CRYPTO_STORE_UNAVAILABLE'))
    })
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, scope))
    return {
      cryptoStorePrefix: `para-chat-${id}`,
      cryptoStorageKey: Array.from(bytes, b =>
        b.toString(16).padStart(2, '0'),
      ).join(''),
    }
  } finally {
    db.close()
  }
}
