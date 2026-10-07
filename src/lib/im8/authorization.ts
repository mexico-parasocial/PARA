import * as WebBrowser from 'expo-web-browser'

export const M8_CALLBACK_PATH = '/m8-auth'
export function m8RedirectUri(): string {
  return 'para://m8-auth'
}
export async function authorizeM8InBrowser(
  url: string,
  expiresAt: number,
): Promise<string | undefined> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      WebBrowser.openAuthSessionAsync(url, m8RedirectUri(), {
        preferEphemeralSession: true,
      }).then(result => {
        if (result.type !== 'success') throw new Error('M8_LOGIN_CANCELLED')
        return result.url
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => {
            try {
              WebBrowser.dismissAuthSession()
            } catch {
            } finally {
              reject(new Error('M8_LOGIN_EXPIRED'))
            }
          },
          Math.max(0, expiresAt - Date.now()),
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
