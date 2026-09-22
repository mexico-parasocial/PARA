import {type FlatList} from 'react-native'

import {app} from '#/lexicons'

export function useKeyboardHandlers(_args: {
  flatListRef: React.RefObject<FlatList<app.bsky.embed.images.ViewImage> | null>
  itemWidthsRef: React.RefObject<Map<number, number>>
  currentIndexRef: React.RefObject<number>
  scrollTo: (offset: number) => void
  onSettle: (index: number) => void
  imageCount: number
}) {}
