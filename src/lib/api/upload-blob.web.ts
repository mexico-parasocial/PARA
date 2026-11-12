import {type BlobRef, type Client, type EncodingString} from '@atproto/lex'

/**
 * The blob-upload response body: `{blob}`. lex `Client.uploadBlob` returns the
 * full XRPC response, so this helper unwraps `res.body` for callers.
 */
type UploadBlobResult = {blob: BlobRef}

/**
 * @note It is recommended, on web, to use the `file` instance of the file
 * selector input element, rather than a `data:` URL, to avoid
 * loading the file into memory. `File` extends `Blob` "file" instances can
 * be passed directly to this function.
 *
 * @param encoding Passed as the lex upload option (NEVER a content-type header
 * - lex-client throws if the encoding is set via headers).
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
  if (
    typeof input === 'string' &&
    (input.startsWith('data:') || input.startsWith('blob:'))
  ) {
    return fetch(input).then(r => r.blob())
  }

  if (input instanceof Blob) {
    return input
  }

  throw new TypeError(`Invalid uploadBlob input: ${typeof input}`)
}
