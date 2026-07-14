import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'

export type ValuePropositionPagerProps = {
  step: 0 | 1 | 2
  /**
   * Only the native pager changes pages itself (by swiping); the web pager
   * is driven entirely by the step prop.
   */
  setStep: (step: 0 | 1 | 2) => void
  avatarUri?: string
}

export function useValuePropText(step: 0 | 1 | 2) {
  const {_} = useLingui()

  return [
    {
      title: _(msg`Start from civic context`),
      description: _(
        msg`Base, communities, and issue spaces help you enter politics through place, identity, and shared concerns instead of a random feed.`,
      ),
      alt: _(
        msg`A collection of popular feeds you can find on PARA, including News, Booksky, Game Dev, Blacksky, and Fountain Pens`,
      ),
    },
    {
      title: _(msg`Find people who matter`),
      description: _(
        msg`Follow communities, representatives, organizers, and thoughtful people who help you understand what affects your life.`,
      ),
      alt: _(
        msg`Your profile picture surrounded by concentric circles of other users' profile pictures`,
      ),
    },
    {
      title: _(msg`Turn attention into action`),
      description: _(
        msg`Read highlights, track issues, join lobbying, and move from browsing to participation.`,
      ),
      alt: _(
        msg`An illustration of several PARA posts alongside repost, like, and comment icons`,
      ),
    },
  ][step]
}

export function Dot({active}: {active: boolean}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.rounded_full,
        {width: 8, height: 8},
        active
          ? {backgroundColor: t.palette.primary_500}
          : t.atoms.bg_contrast_50,
      ]}
    />
  )
}
