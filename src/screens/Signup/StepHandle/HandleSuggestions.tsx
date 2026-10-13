import {useMemo} from 'react'
import {Sift, SiftItem, type UseSiftReturn} from '@bsky.app/sift'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Portal} from '#/components/Portal'
import {Text} from '#/components/Typography'
import {type com} from '#/lexicons'

type Suggestion = com.atproto.temp.checkHandleAvailability.Suggestion

export function HandleSuggestions({
  sift,
  suggestions,
  onSelect,
}: {
  /** Positions the list against the handle input it was created for. */
  sift: UseSiftReturn
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
}) {
  const t = useTheme()
  const {_} = useLingui()

  // Sift identifies its items by `key`; a handle is unique within a list.
  const data = useMemo(
    () =>
      suggestions.map(suggestion => ({...suggestion, key: suggestion.handle})),
    [suggestions],
  )

  return (
    <Portal>
      <Sift
        sift={sift}
        data={data}
        onSelect={onSelect}
        outerStyle={[
          a.overflow_hidden,
          a.rounded_sm,
          a.border,
          t.atoms.shadow_sm,
          t.atoms.bg,
          t.atoms.border_contrast_low,
          a.w_full,
          a.z_50,
        ]}
        render={({active, props, item, isLast}) => (
          <SiftItem
            {...props}
            aria-label={_(
              msg({
                message: `Select ${item.handle}`,
                comment: `Accessibility label for a username suggestion in the account creation flow`,
              }),
            )}
            style={state => [
              a.w_full,
              a.flex_row,
              a.align_center,
              a.justify_between,
              a.p_md,
              a.border_b,
              t.atoms.border_contrast_low,
              isLast && a.border_b_0,
              (active || state.hovered) && t.atoms.bg_contrast_25,
            ]}>
            <Text style={[a.text_md]}>{item.handle}</Text>
            <Text style={[a.text_sm, {color: t.palette.positive_700}]}>
              <Trans comment="Shown next to an available username suggestion in the account creation flow">
                Available
              </Trans>
            </Text>
          </SiftItem>
        )}
      />
    </Portal>
  )
}
