import {useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  COMPASS_COLORS,
  COMPASS_GRID_ROWS,
  COMPASS_LABEL_COLORS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'

export {useDialogControl} from '#/components/Dialog'

export function CompassPickerDialog({
  control,
  selected,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  selected: string[]
  onConfirm: (next: string[]) => void
}) {
  const {_} = useLingui()
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Filter by political compass`)}
        style={[{maxWidth: 500, width: '100%'}]}>
        <Inner control={control} selected={selected} onConfirm={onConfirm} />
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function Inner({
  control,
  selected,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  selected: string[]
  onConfirm: (next: string[]) => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [draft, setDraft] = useState<string[]>(selected)

  const toggle = (id: CompassPositionId) => {
    setDraft(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id],
    )
  }

  const handleConfirm = () => {
    onConfirm(draft)
    control.close()
  }

  return (
    <View style={[a.gap_md]}>
      <View>
        <Text style={[a.text_md, a.font_bold]}>
          <Trans>Filter by political compass</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            Tap one or more positions to include posts from authors with those
            compass positions.
          </Trans>
        </Text>
      </View>

      <View
        style={[
          a.gap_xs,
          a.align_center,
          a.justify_center,
          a.px_lg,
        ]}>
        {COMPASS_GRID_ROWS.map((row, ri) => (
          <View
            key={ri}
            style={[a.flex_row, a.gap_xs, a.align_center, a.justify_center]}>
            {row.map(id => {
              const isSelected = draft.includes(id)
              const bg = COMPASS_COLORS[id]
              const labelColor = COMPASS_LABEL_COLORS[id]
              return (
                <Pressable
                  key={id}
                  onPress={() => toggle(id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: isSelected}}
                  hitSlop={4}
                  style={({pressed}) => [
                    a.align_center,
                    a.justify_center,
                    a.rounded_md,
                    {
                      width: 84,
                      height: 64,
                      backgroundColor: bg,
                      borderWidth: isSelected ? 3 : 1,
                      borderColor: isSelected
                        ? t.palette.primary_500
                        : t.atoms.border_contrast_low.borderColor,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <Text
                    style={[
                      a.text_xs,
                      a.font_medium,
                      {color: labelColor, textAlign: 'center'},
                    ]}>
                    {id.replace(/-/g, ' ')}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>

      <View
        style={[
          a.flex_row,
          a.gap_xs,
          a.flex_wrap,
          {minHeight: 24},
        ]}>
        {draft.length === 0 ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
            <Trans>No positions selected</Trans>
          </Text>
        ) : (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Selected:</Trans> {draft.join(', ')}
          </Text>
        )}
      </View>

      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          variant="solid"
          color="primary"
          onPress={handleConfirm}
          label={_(msg`Apply`)}>
          <ButtonText>
            <Trans>Apply</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
