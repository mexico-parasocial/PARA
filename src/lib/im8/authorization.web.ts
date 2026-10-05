export const M8_CALLBACK_PATH = '/m8-auth'
export function m8RedirectUri(): string {
  return `${window.location.origin}${M8_CALLBACK_PATH}`
}
/** Full-page web handoff avoids popup blockers and keeps tokens off URLs. */
export function authorizeM8InBrowser(
  url: string,
  _expiresAt: number,
): Promise<string | undefined> {
  window.location.assign(url)
  return Promise.resolve(undefined)
}
