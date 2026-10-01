import {useQuery} from '@tanstack/react-query'

import {useAgent} from '#/state/session'
import {useDebouncedValue} from '#/components/live/utils'
import {com} from '#/lexicons'

export type BookSuggestion = {
  key: string
  title: string
  authors: string[]
  firstPublishYear?: number
}

/** Below this the AppView would match nearly everything. */
const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 300

/**
 * Book autocomplete. Goes through the AppView (never straight to the book
 * database) so what someone searches for is not shared with a third party.
 * It is only a convenience: a failure returns no suggestions rather than an
 * error, and the user can always type the book by hand.
 */
export function useBookSearchQuery(text: string) {
  const agent = useAgent()
  const debounced = useDebouncedValue(text.trim(), DEBOUNCE_MS)
  const enabled = debounced.length >= MIN_QUERY_LENGTH

  const query = useQuery<BookSuggestion[]>({
    queryKey: ['book-search', debounced],
    enabled,
    staleTime: 1000 * 60 * 10,
    retry: false,
    queryFn: async () => {
      const res = await agent.appviewClient.call(com.para.book.searchBooks, {
        q: debounced,
        limit: 8,
      })
      return (res as {books?: BookSuggestion[]}).books ?? []
    },
  })

  return {
    suggestions: enabled && !query.isError ? (query.data ?? []) : [],
    // True while the typed text is ahead of the results on screen.
    isSearching: enabled && (text.trim() !== debounced || query.isFetching),
  }
}
