import {Linking, Platform} from 'react-native'

const M8_SCHEME = 'im8'
const M8_IOS_BUNDLE_URL = 'com.m8.im8://'

async function tryOpenURL(url: string): Promise<boolean> {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
      return true
    }
  } catch (err) {
    console.warn(`[m8] Failed to open ${url}:`, err)
  }
  return false
}

async function openM8(path: string) {
  const primary = `${M8_SCHEME}://${path}`
  if (await tryOpenURL(primary)) return

  if (Platform.OS === 'ios') {
    const fallback = `${M8_IOS_BUNDLE_URL}${path}`
    if (await tryOpenURL(fallback)) return
  }

  console.warn(
    `[m8] iM8 does not appear to be installed or does not expose a known URL scheme.`,
  )
}

export function openM8Wallet() {
  return openM8('wallet')
}

export function openM8Verification() {
  return openM8('verification')
}
