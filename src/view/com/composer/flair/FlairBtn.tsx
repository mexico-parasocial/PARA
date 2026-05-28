import {Keyboard, Pressable, View, type ViewStyle} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type ComposerFlair, isPolicyFlair} from '#/lib/post-flairs'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {FlairSelectionList} from '#/components/FlairSelectionList'
import {Text} from '#/components/Typography'

export function FlairBtn({
  selectedFlairs,
  setSelectedFlairs,
  mode,
}: {
  selectedFlairs: ComposerFlair[]
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  mode: 'matter' | 'policy'
}) {
  const control = Dialog.useDialogControl()
  const {_} = useLingui()
  const t = useTheme()

  // Filter selected flairs based on mode
  const relevantFlairs = selectedFlairs.filter(f => {
    const isPolicy = isPolicyFlair(f)
    if (mode === 'matter') {
      return !isPolicy
    } else {
      return isPolicy
    }
  })

  const hasSelection = relevantFlairs.length > 0

  // Icon text
  const iconText = mode === 'policy' ? '||#' : '|#'

  const iconSize = 34
  const iconStyle: ViewStyle = {
    width: iconSize,
    height: iconSize,
    borderRadius: iconSize / 2,
    justifyContent: 'center',
    alignItems: 'center',
  }

  return (
    <>
      <Pressable
        onPress={() => {
          Keyboard.dismiss()
          control.open()
        }}
        style={[a.flex_row, a.align_center, a.gap_xs]}
        accessibilityRole="button"
        accessibilityLabel={iconText}
        accessibilityHint={
          mode === 'matter'
            ? _(msg`Opens dialog to select a matter`)
            : _(msg`Opens dialog to select a policy`)
        }>
        {({pressed}) => (
          <>
            {/* Circle Icon */}
            <View
              style={[
                iconStyle,
                {
                  backgroundColor: pressed
                    ? t.palette.primary_600
                    : hasSelection
                      ? t.palette.primary_500
                      : t.palette.contrast_300,
                },
              ]}>
              <Text style={[a.font_bold, {color: 'white', fontSize: 12}]}>
                {iconText}
              </Text>
            </View>

            {/* Selection Pill */}
            {hasSelection && (
              <View
                style={[
                  a.px_sm,
                  a.py_xs,
                  a.rounded_full,
                  {
                    backgroundColor: pressed
                      ? t.palette.primary_600
                      : t.palette.primary_500,
                    height: iconSize,
                    justifyContent: 'center',
                    minWidth: 50,
                  },
                ]}>
                <Text
                  style={[a.font_bold, {color: 'white', fontSize: 13}]}
                  numberOfLines={1}>
                  {relevantFlairs[0]?.label}
                </Text>
              </View>
            )}
          </>
        )}
      </Pressable>

      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <Dialog.ScrollableInner
          label={
            mode === 'matter' ? _(msg`Select Matter`) : _(msg`Select Policy`)
          }
          style={[{maxWidth: 500}, a.w_full]}>
          <FlairSelectionList
            selectedFlairs={selectedFlairs}
            setSelectedFlairs={setSelectedFlairs}
            mode={mode}
            allowCreation={true}
            onClose={() => control.close()}
          />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </>
  )
}
