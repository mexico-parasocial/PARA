import {useMemo} from 'react'

import {proposedAxes} from '#/screens/RAQ/raq-utils'
import {useProposedQuestions} from './useProposedQuestions'

// There is no axis catalog endpoint. Discover only targets of real proposals.
export function useCommunityAxes() {
  const query = useProposedQuestions()
  const data = useMemo(() => proposedAxes(query.data ?? []), [query.data])
  return {...query, data}
}
