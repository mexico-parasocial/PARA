import * as Storage from '#/lib/storage'
import type {AnonymousProfile} from './types'

const ANON_PROFILE_KEY = 'para_anonymous_profile'
const ANON_ENABLED_KEY = 'para_anonymous_enabled'

export async function getStoredAnonymousProfile(): Promise<AnonymousProfile | null> {
  try {
    const raw = await Storage.getItemAsync(ANON_PROFILE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AnonymousProfile
  } catch {
    return null
  }
}

export async function setStoredAnonymousProfile(profile: AnonymousProfile | null) {
  if (profile) {
    await Storage.setItemAsync(ANON_PROFILE_KEY, JSON.stringify(profile))
    await Storage.setItemAsync(ANON_ENABLED_KEY, 'true')
  } else {
    await Storage.deleteItemAsync(ANON_PROFILE_KEY)
    await Storage.deleteItemAsync(ANON_ENABLED_KEY)
  }
}

export async function isAnonymousModeEnabled(): Promise<boolean> {
  try {
    const val = await Storage.getItemAsync(ANON_ENABLED_KEY)
    return val === 'true'
  } catch {
    return false
  }
}
