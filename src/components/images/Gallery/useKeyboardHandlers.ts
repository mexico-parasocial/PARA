export function useKeyboardHandlers(_args: {
  flatListRef: React.RefObject<FlatList<AppBskyEmbedImages.ViewImage> | null>
  itemWidthsRef: React.RefObject<Map<number, number>>
  currentIndexRef: React.RefObject<number>
  scrollTo: (offset: number) => void
  onSettle: (index: number) => void
  imageCount: number
}) {}
