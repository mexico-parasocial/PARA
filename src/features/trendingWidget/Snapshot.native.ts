import TrendingTopicsWidget from '#/features/trendingWidget/TrendingTopicsWidget'
import {type app} from '#/lexicons'

export type TrendingWidgetCopy = {
  emptyMessage: string
  title: string
  shortTitle: string
}

type Trend = app.bsky.unspecced.getTrends.$OutputBody['trends'][number]

export function updateTrendingWidgetSnapshot(
  trends: Trend[],
  copy: TrendingWidgetCopy,
) {
  TrendingTopicsWidget.updateSnapshot({
    emptyMessage: copy.emptyMessage,
    title: copy.title,
    shortTitle: copy.shortTitle,
    topics: trends.map(trend => ({
      displayName: trend.displayName,
      description: trend.description,
      destination: trend.link.startsWith('http')
        ? trend.link
        : `para://${trend.link.replace(/^\/+/, '')}`,
    })),
  })
}
