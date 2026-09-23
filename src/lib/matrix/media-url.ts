/** Authenticated Matrix media endpoints. Never put an access token in a URL. */
export function matrixMediaUrl(
  homeServer: string,
  mxcUrl: string,
  kind: 'download' | 'thumbnail' = 'download',
): string {
  const match = /^mxc:\/\/([^/?#]+)\/([^/?#]+)$/.exec(mxcUrl)
  if (!match) throw new Error('Invalid Matrix media URI')
  const base = new URL(homeServer)
  if (base.protocol !== 'https:' && base.protocol !== 'http:') {
    throw new Error('Invalid Matrix homeserver URL')
  }
  const path = `/_matrix/client/v1/media/${kind}/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`
  const query = kind === 'thumbnail' ? '?width=800&height=600&method=scale' : ''
  return `${base.origin}${path}${query}`
}

export function safeMatrixFilename(name: string): string {
  const basename = name.split(/[\\/]/).pop() ?? ''
  return basename.replace(/[^\w. -]/g, '_').slice(0, 100) || 'archivo'
}
