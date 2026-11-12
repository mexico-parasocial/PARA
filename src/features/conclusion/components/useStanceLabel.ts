import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

export function useStanceLabel() {
  const {_} = useLingui()
  return (stance: string) => {
    switch (stance) {
      case 'for':
        return _(msg`A favor`)
      case 'against':
        return _(msg`En contra`)
      case 'amendment':
        return _(msg`Enmienda`)
      case 'question':
        return _(msg`Pregunta`)
      default:
        return stance
    }
  }
}
