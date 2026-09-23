import {useCallback, useEffect, useState} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = 'para-chat-onboarding-seen:v1:'

export function useChatOnboarding(communityUri: string) {
  const [state, setState] = useState({communityUri, visible: false})
  const key = KEY_PREFIX + encodeURIComponent(communityUri)

  useEffect(() => {
    let cancelled = false
    setState({communityUri, visible: false})
    AsyncStorage.getItem(key)
      .then(seen => {
        if (cancelled || seen) return
        setState({communityUri, visible: true})
        return AsyncStorage.setItem(key, '1')
      })
      .catch(err => {
        console.warn('[CommunityChat] Could not persist onboarding state:', err)
        if (!cancelled) setState({communityUri, visible: true})
      })
    return () => {
      cancelled = true
    }
  }, [communityUri, key])

  const dismiss = useCallback(() => {
    setState({communityUri, visible: false})
    void AsyncStorage.setItem(key, '1').catch(err => {
      console.warn('[CommunityChat] Could not persist onboarding state:', err)
    })
  }, [communityUri, key])

  return {
    visible: state.communityUri === communityUri && state.visible,
    dismiss,
  }
}
