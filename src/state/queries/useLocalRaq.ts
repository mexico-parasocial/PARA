import {useEffect, useState} from 'react'

import * as persisted from '#/state/persisted'

export function useLocalRaq() {
  const [answers, setAnswers] = useState(
    () => persisted.get('raqAnswers') ?? {},
  )
  const [results, setResults] = useState(() => persisted.get('raqResults'))
  useEffect(() => {
    const updateAnswers = () => setAnswers(persisted.get('raqAnswers') ?? {})
    const updateResults = () => setResults(persisted.get('raqResults'))
    const unsubscribeAnswers = persisted.onUpdate('raqAnswers', updateAnswers)
    const unsubscribeResults = persisted.onUpdate('raqResults', updateResults)
    updateAnswers()
    updateResults()
    return () => {
      unsubscribeAnswers()
      unsubscribeResults()
    }
  }, [])
  return {answers, results}
}
