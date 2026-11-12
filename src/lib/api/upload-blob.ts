import {copyAsync} from 'expo-file-system/legacy'
import {type BlobRef, type Client, type EncodingString} from '@atproto/lex'

import {safeDeleteAsync} from '#/lib/media/manip'

/**
 * The blob-upload response body: `{blob}`. lex `Client.uploadBlob` returns the
 * full XRPC response, so this helper unwraps `res.body` for callers.
 */
type UploadBlobResult = {blob: BlobRef}

/**
 * @param encoding Allows overriding the blob's type. Passed as the lex upload
 * option (NEVER a content-type header - lex-client throws if the encoding is
 * set via headers).
 */
export async function uploadBlob(
  client: Client,
  input: string | Blob,
  encoding?: string,
): Promise<UploadBlobResult> {
  const blob = await readUploadBlob(input)
  const res = await client.uploadBlob(blob, {
    encoding: encoding as EncodingString | undefined,
  })
  return {blob: res.body.blob}
}

export async function readUploadBlob(input: string | Blob): Promise<Blob> {
  if (typeof input === 'string' && input.startsWith('file:')) {
    return asBlob(input)
  }

  if (typeof input === 'string' && input.startsWith('/')) {
    return asBlob(`file://${input}`)
  }

  if (typeof input === 'string' && input.startsWith('data:')) {
    return fetch(input).then(r => r.blob())
  }

  if (input instanceof Blob) {
    return input
  }

  throw new TypeError(`Invalid uploadBlob input: ${typeof input}`)
}

async function asBlob(uri: string): Promise<Blob> {
  return withSafeFile(uri, async safeUri => {
    // Note
    // Android does not support `fetch()` on `file://` URIs. for this reason, we
    // use XMLHttpRequest instead of simply calling:

    // return fetch(safeUri.replace('file:///', 'file:/')).then(r => r.blob())

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.onload = () => resolve(xhr.response)
      xhr.onerror = () => reject(new Error('Failed to load blob'))
      xhr.responseType = 'blob'
      xhr.open('GET', safeUri, true)
      xhr.send(null)
    })
  })
}

// HACK
// React native has a bug that inflates the size of jpegs on upload
// we get around that by renaming the file ext to .bin
// see https://github.com/facebook/react-native/issues/27099
// -prf
async function withSafeFile<T>(
  uri: string,
  fn: (path: string) => Promise<T>,
): Promise<T> {
  if (uri.endsWith('.jpeg') || uri.endsWith('.jpg')) {
    // Since we don't "own" the file, we should avoid renaming or modifying it.
    // Instead, let's copy it to a temporary file and use that (then remove the
    // temporary file).
    const newPath = uri.replace(/\.jpe?g$/, '.bin')
    try {
      await copyAsync({from: uri, to: newPath})
    } catch {
      // Failed to copy the file, just use the original
      return await fn(uri)
    }
    try {
      return await fn(newPath)
    } finally {
      // Remove the temporary file
      await safeDeleteAsync(newPath)
    }
  } else {
    return fn(uri)
  }
}
