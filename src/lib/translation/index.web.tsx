import {type PropsWithChildren, useCallback, useEffect, useState} from 'react'

import {useGoogleTranslate} from '#/lib/hooks/useGoogleTranslate'
import {useAnalytics} from '#/analytics'
import {
  type TranslationFunctionParams,
  type TranslationOptions,
  type TranslationState,
} from './types'

export * from './types'
export * from './utils'

const translationStateStore: Record<string, TranslationState> = {}
const subscribers = new Set<() => void>()

function emitStoreUpdate() {
  subscribers.forEach(subscriber => subscriber())
}

function clearTranslationForKey(key: string) {
  delete translationStateStore[key]
  emitStoreUpdate()
}

export function useTranslate({key}: TranslationOptions) {
  const [, setVersion] = useState(0)
  const ax = useAnalytics()
  const googleTranslate = useGoogleTranslate()

  useEffect(() => {
    const onStoreUpdate = () => {
      setVersion(version => version + 1)
    }
    subscribers.add(onStoreUpdate)
    return () => {
      subscribers.delete(onStoreUpdate)
    }
  }, [])

  const translate = useCallback(
    async ({
      text,
      expectedTargetLanguage,
      expectedSourceLanguage,
      possibleSourceLanguages,
    }: TranslationFunctionParams) => {
      ax.metric('translate', {
        os: 'web',
        possibleSourceLanguages,
        expectedTargetLanguage,
        textLength: text.length,
        googleTranslate: true,
      })
      await googleTranslate(
        text,
        expectedTargetLanguage,
        expectedSourceLanguage,
      )
    },
    [ax, googleTranslate],
  )

  const clearTranslation = useCallback(() => {
    clearTranslationForKey(key)
  }, [key])

  return {
    translationState: translationStateStore[key] ?? {
      status: 'idle' as const,
    },
    translate,
    clearTranslation,
  }
}

export function Provider({children}: PropsWithChildren<unknown>) {
  return children
}
