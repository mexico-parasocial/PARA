import {useCallback, useEffect, useState} from 'react'

import {getStoredAnonymousProfile, setStoredAnonymousProfile} from '../anonymous'
import {type AnonymousProfile} from '../types'

export function useAnonymousMode() {
  const [profile, setProfile] = useState<AnonymousProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const stored = await getStoredAnonymousProfile()
      setProfile(stored)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const clear = useCallback(async () => {
    await setStoredAnonymousProfile(null)
    setProfile(null)
  }, [])

  return {
    isEnabled: !!profile,
    profile,
    loading,
    refresh,
    clear,
  }
}
