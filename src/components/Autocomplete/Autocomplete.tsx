import {useCallback} from 'react'
import {View} from 'react-native'
import {Sift, type UseSiftReturn} from '@bsky.app/sift'

import {atoms as a, useTheme} from '#/alf'
import {useOnKeyboard} from '#/components/hooks/useOnKeyboard'
import {Portal} from '#/components/Portal'
import {IS_WEB} from '#/env'
import {AutocompleteItemEmoji} from './AutocompleteItemEmoji'
import {AutocompleteItemProfile} from './AutocompleteItemProfile'
import {type AutocompleteItem} from './types'

function renderItem(
  item: Parameters<Parameters<typeof Sift<AutocompleteItem>>[0]['render']>[0],
) {
  switch (item.item.type) {
    case 'profile':
      return <AutocompleteItemProfile {...item} />
    case 'emoji':
      return <AutocompleteItemEmoji {...item} />
    default:
      return <View />
  }
}

export function Autocomplete({
  inverted,
  sift,
  data,
  render = renderItem,
  onSelect,
  onDismiss,
  fullWidth = false,
}: {
  inverted?: boolean
  sift: UseSiftReturn
  data: AutocompleteItem[]
  render?: Parameters<typeof Sift<AutocompleteItem>>[0]['render']
  onSelect: (item: AutocompleteItem) => void
  onDismiss: () => void
  /**
   * Match the anchor's width instead of the default capped width. Use for
   * full-width anchors like the search bar; leave off for inline mention
   * inputs.
   */
  fullWidth?: boolean
}) {
  const t = useTheme()

  const updatePosition = useCallback(() => {
    void sift.updatePosition()
  }, [sift])

  useOnKeyboard('keyboardDidShow', updatePosition)
  useOnKeyboard('keyboardDidHide', updatePosition)

  return (
    <Portal>
      <Sift
        inverted={inverted}
        sift={sift}
        data={data}
        onSelect={onSelect}
        onDismiss={onDismiss}
        {...({
          style: [
            a.overflow_hidden,
            a.rounded_md,
            a.border,
            t.atoms.border_contrast_low,
            t.atoms.bg,
            a.w_full,
            IS_WEB && !fullWidth
              ? {
                  maxWidth: 300,
                }
              : {},
          ],
        } as any)}
        render={render}
      />
    </Portal>
  )
}
