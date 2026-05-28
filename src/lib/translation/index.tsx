import {type PropsWithChildren, useCallback, useEffect, useState} from 'react'
import {LayoutAnimation, Platform} from 'react-native'
import {getLocales} from 'expo-localization'
import {onTranslateTask} from '@bsky.app/expo-translate-text'
import {type TranslationTaskResult} from '@bsky.app/expo-translate-text/build/ExpoTranslateText.types'
import {useLingui} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'

import {useGoogleTranslate} from '#/lib/hooks/useGoogleTranslate'
import {codeToLanguageName} from '#/locale/helpers'
import {logger} from '#/logger'
import {useLanguagePrefs} from '#/state/preferences'
import {useAnalytics} from '#/analytics'
import {IS_ANDROID, IS_IOS, IS_TRANSLATION_SUPPORTED} from '#/env'
import {
  type TranslationFunctionParams,
  type TranslationOptions,
  type TranslationState,
} from './types'
import {guessLanguage} from './utils'

export * from './types'
export * from './utils'

const E_SAME_AS_SOURCE_LANGUAGE =
  'Translation result is the same as the source text.'
const E_EMPTY_RESULT = 'Translation result is empty.'
const E_INVALID_SOURCE_LANGUAGE = 'Invalid source language'

const translationStateStore: Record<string, TranslationState> = {}
const refCountsStore: Record<string, number> = {}
const subscribers = new Set<() => void>()

function emitStoreUpdate() {
  subscribers.forEach(subscriber => subscriber())
}

function setTranslationStateForKey(key: string, state?: TranslationState) {
  if (state) {
    translationStateStore[key] = state
  } else {
    delete translationStateStore[key]
  }
  emitStoreUpdate()
}

function acquireTranslation(key: string) {
  refCountsStore[key] = (refCountsStore[key] ?? 0) + 1

  return () => {
    const newCount = (refCountsStore[key] ?? 1) - 1
    if (newCount <= 0) {
      delete refCountsStore[key]
      if (translationStateStore[key]) {
        delete translationStateStore[key]
        emitStoreUpdate()
      }
      return
    }
    refCountsStore[key] = newCount
  }
}

/**
 * Attempts on-device translation via @bsky.app/expo-translate-text.
 */
async function attemptTranslation(
  input: string,
  targetLangCodeOriginal: string,
  sourceLangCodeOriginal?: string,
): Promise<{
  translatedText: string
  targetLanguage: TranslationTaskResult['targetLanguage']
  sourceLanguage: TranslationTaskResult['sourceLanguage']
}> {
  let targetLangCode = IS_ANDROID
    ? targetLangCodeOriginal.split('-')[0]
    : targetLangCodeOriginal
  const sourceLangCode = IS_ANDROID
    ? sourceLangCodeOriginal?.split('-')[0]
    : sourceLangCodeOriginal

  if (IS_IOS) {
    const deviceLocales = getLocales()
    const primaryLanguageTag = deviceLocales[0]?.languageTag
    switch (targetLangCodeOriginal) {
      case 'en':
      case 'es':
      case 'pt':
      case 'zh':
        if (
          primaryLanguageTag &&
          primaryLanguageTag.startsWith(targetLangCodeOriginal)
        ) {
          targetLangCode = primaryLanguageTag
        }
        break
    }
  }

  const result = await onTranslateTask({
    input,
    targetLangCode,
    sourceLangCode,
  })

  const translatedText =
    typeof result.translatedTexts === 'string' ? result.translatedTexts : ''

  if (translatedText === input) {
    throw new Error(E_SAME_AS_SOURCE_LANGUAGE)
  }

  if (translatedText === '') {
    throw new Error(E_EMPTY_RESULT)
  }

  return {
    translatedText,
    targetLanguage: result.targetLanguage,
    sourceLanguage:
      result.sourceLanguage ?? sourceLangCode ?? guessLanguage(input),
  }
}

export function useTranslate({
  key,
  forceGoogleTranslate = false,
}: TranslationOptions) {
  const [, setVersion] = useState(0)
  const ax = useAnalytics()
  const langPrefs = useLanguagePrefs()
  const {t: l} = useLingui()
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

  useFocusEffect(
    useCallback(() => {
      return acquireTranslation(key)
    }, [key]),
  )

  const translate = useCallback(
    async ({
      text,
      expectedTargetLanguage,
      expectedSourceLanguage,
      possibleSourceLanguages,
      forceGoogleTranslate: forceGoogleTranslateOverride,
    }: TranslationFunctionParams) => {
      const shouldForceGoogleTranslate = Boolean(
        forceGoogleTranslateOverride ?? forceGoogleTranslate,
      )

      ax.metric('translate', {
        os: Platform.OS,
        possibleSourceLanguages,
        expectedTargetLanguage,
        textLength: text.length,
        googleTranslate: shouldForceGoogleTranslate,
      })

      if (shouldForceGoogleTranslate || !IS_TRANSLATION_SUPPORTED) {
        await googleTranslate(
          text,
          expectedTargetLanguage,
          expectedSourceLanguage,
        )
        return
      }

      if (!IS_ANDROID) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      }
      setTranslationStateForKey(key, {status: 'loading'})

      try {
        const result = await attemptTranslation(
          text,
          expectedTargetLanguage,
          expectedSourceLanguage,
        )

        ax.metric('translate:result', {
          success: true,
          os: Platform.OS,
          possibleSourceLanguages,
          expectedSourceLanguage: expectedSourceLanguage ?? null,
          expectedTargetLanguage,
          resultSourceLanguage: result.sourceLanguage,
          resultTargetLanguage: result.targetLanguage,
          textLength: text.length,
        })

        if (!IS_ANDROID) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        }

        setTranslationStateForKey(key, {
          status: 'success',
          translatedText: result.translatedText,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: result.targetLanguage,
          postLanguages: possibleSourceLanguages,
        })
      } catch (err) {
        const e = err as Error
        logger.error('Failed to translate text on device', {safeMessage: e})

        ax.metric('translate:result', {
          success: false,
          os: Platform.OS,
          possibleSourceLanguages,
          expectedSourceLanguage: expectedSourceLanguage ?? null,
          expectedTargetLanguage,
          resultSourceLanguage: null,
          resultTargetLanguage: null,
          textLength: text.length,
        })

        let errorMessage = l`Device failed to translate :(`
        if (e.message === E_SAME_AS_SOURCE_LANGUAGE) {
          errorMessage = l`Translation to the same language is unavailable on your device.`
        }
        if (e.message === E_EMPTY_RESULT) {
          errorMessage = l`No translation received from your device.`
        }
        if (
          expectedSourceLanguage &&
          e.message.includes(E_INVALID_SOURCE_LANGUAGE)
        ) {
          errorMessage = l`${codeToLanguageName(
            expectedSourceLanguage,
            langPrefs.appLanguage,
          )} is not supported by your device.`
        }

        if (!IS_ANDROID) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
        }

        setTranslationStateForKey(key, {
          status: 'error',
          message: errorMessage,
        })
      }
    },
    [ax, forceGoogleTranslate, googleTranslate, key, l, langPrefs.appLanguage],
  )

  const clearTranslation = useCallback(() => {
    if (!IS_ANDROID) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    }
    setTranslationStateForKey(key)
  }, [key])

  return {
    translationState: translationStateStore[key] ?? {
      status: 'idle',
    },
    translate,
    clearTranslation,
  }
}

export function Provider({children}: PropsWithChildren<unknown>) {
  return children
}
