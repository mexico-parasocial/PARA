import {useEffect, useState} from 'react'
import {AppState} from 'react-native'
import {WidgetInfo} from '@bsky.app/expo-bluesky-swiss-army'
import {useLingui} from '@lingui/react/macro'

import {logger} from '#/logger'
import {usePreferencesQuery} from '#/state/queries/preferences'
import {useGetTrendsQuery} from '#/state/queries/trending/useGetTrendsQuery'
import {useAnalytics} from '#/analytics'
import {updateTrendingWidgetSnapshot} from '#/features/trendingWidget/Snapshot'
import {device} from '#/storage'

export function TrendingTopicsWidgetSync() {
  const {t: l} = useLingui()
  const ax = useAnalytics()
  /**
   * `undefined` until the first check finishes.
   */
  const [isWidgetInstalled, setIsWidgetInstalled] = useState<boolean>()
  const {data} = useGetTrendsQuery({
    enabled: isWidgetInstalled === true,
    fetchLimit: 10,
    limit: 5,
    refetchOnWindowFocus: true,
  })
  const {data: preferences} = usePreferencesQuery()
  const copy = {
    emptyMessage: l`No trending topics are available right now.`,
    title: l`Trending on PARA`,
    shortTitle: l`Trending`,
  }

  useEffect(() => {
    let cancelled = false

    const updateInstalledState = async () => {
      try {
        const isInstalled = await WidgetInfo.isInstalled('TrendingTopicsWidget')
        if (!cancelled) {
          setIsWidgetInstalled(isInstalled)
          const previous = device.get(['trendingWidgetInstalled']) ?? false
          if (previous !== isInstalled) {
            device.set(['trendingWidgetInstalled'], isInstalled)
            ax.metric(
              isInstalled
                ? 'trendingWidget:installed'
                : 'trendingWidget:uninstalled',
              {},
            )
          }
        }
      } catch (error) {
        logger.error(
          'Failed to check whether the trending widget is installed',
          {
            safeMessage: error,
          },
        )
      }
    }

    void updateInstalledState()
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void updateInstalledState()
      }
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [ax])

  // The session AppView supplies foreground data. Do not send account interests
  // to a hard-coded public service from a background task.
  useEffect(() => {
    if (!preferences && isWidgetInstalled) {
      updateTrendingWidgetSnapshot([], copy)
    }
  }, [preferences, isWidgetInstalled, copy])

  useEffect(() => {
    if (!data || !preferences || !isWidgetInstalled) return

    const sync = () => {
      try {
        updateTrendingWidgetSnapshot(data.trends, copy)
      } catch (error) {
        logger.error('Failed to update the trending topics widget', {
          safeMessage: error,
        })
      }
    }
    sync()
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') sync()
    })
    return () => subscription.remove()
  }, [copy, data, preferences, isWidgetInstalled])

  return null
}
