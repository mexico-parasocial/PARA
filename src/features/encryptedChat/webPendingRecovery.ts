/** The pending recovery copy is encrypted with this account/device's store key. */
export async function createPendingRecoveryStore(
  prefix: string,
  storageKey: Uint8Array,
) {
  if (!/^para-chat-[a-f0-9]{64}$/.test(prefix) || storageKey.length !== 32)
    throw new Error('RECOVERY_STORAGE_FAILED')
  const material = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(storageKey),
    'HKDF',
    false,
    ['deriveKey'],
  )
  const key = await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(prefix),
      info: new TextEncoder().encode('para.pending-recovery.v1'),
    },
    material,
    {name: 'AES-GCM', length: 256},
    false,
    ['encrypt', 'decrypt'],
  )
  const name = `${prefix}.pending-recovery`
  return {
    async get(): Promise<string | undefined> {
      const raw = localStorage.getItem(name)
      if (!raw) return undefined
      if (raw.length > 8192) throw new Error('RECOVERY_STORAGE_FAILED')
      const value = JSON.parse(raw)
      if (
        !Array.isArray(value.iv) ||
        value.iv.length !== 12 ||
        !Array.isArray(value.ciphertext)
      )
        throw new Error('RECOVERY_STORAGE_FAILED')
      const clear = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: Uint8Array.from(value.iv)},
        key,
        Uint8Array.from(value.ciphertext),
      )
      return new TextDecoder().decode(clear)
    },
    async set(encodedKey: string): Promise<void> {
      if (!encodedKey || encodedKey.length > 512)
        throw new Error('INVALID_RECOVERY_KEY')
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const ciphertext = await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv},
        key,
        new TextEncoder().encode(encodedKey),
      )
      localStorage.setItem(
        name,
        JSON.stringify({
          iv: Array.from(iv),
          ciphertext: Array.from(new Uint8Array(ciphertext)),
        }),
      )
    },
    acknowledge(): void {
      localStorage.removeItem(name)
    },
  }
}
