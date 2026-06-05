import {useState} from 'react'
import {Pressable, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {SearchInput} from '#/components/forms/SearchInput'
import {Text} from '#/components/Typography'

export {useDialogControl} from '#/components/Dialog'

export function CommunityPickerDialog({
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
        label={_(msg`Filter by community`)}
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
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<string[]>(selected)

  const {data, isLoading} = useCommunityBoardsQuery({
    query: query || undefined,
    limit: 50,
  })

  const toggle = (uri: string) => {
    setDraft(prev =>
      prev.includes(uri) ? prev.filter(u => u !== uri) : [...prev, uri],
    )
  }

  const handleConfirm = () => {
    onConfirm(draft)
    control.close()
  }

  const boards = data?.boards ?? []

  return (
    <View style={[a.gap_md]}>
      <View>
        <Text style={[a.text_md, a.font_bold]}>
          <Trans>Filter by community</Trans>
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            Pick communities to include posts from. Active members appear first.
          </Trans>
        </Text>
      </View>
      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder={_(msg`Search communities...`)}
        autoFocus={false}
      />
      <ScrollView
        style={[{maxHeight: 380}]}
        contentContainerStyle={[a.gap_xs, a.py_xs]}>
        {isLoading ? (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
            <Trans>Loading communities...</Trans>
          </Text>
        ) : boards.length === 0 ? (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
            <Trans>No communities found.</Trans>
          </Text>
        ) : (
          boards.map(board => {
            const isSelected = draft.includes(board.uri)
            return (
              <Pressable
                key={board.uri}
                onPress={() => toggle(board.uri)}
                accessibilityRole="checkbox"
                accessibilityState={{checked: isSelected}}
                style={({pressed}) => [
                  a.flex_row,
                  a.align_center,
                  a.gap_sm,
                  a.p_sm,
                  a.rounded_md,
                  isSelected
                    ? {backgroundColor: t.palette.primary_50}
                    : {backgroundColor: 'transparent'},
                  pressed && {opacity: 0.7},
                ]}>
                <View
                  style={[
                    a.rounded_sm,
                    a.align_center,
                    a.justify_center,
                    {
                      width: 18,
                      height: 18,
                      borderWidth: 2,
                      borderColor: isSelected
                        ? t.palette.primary_500
                        : t.atoms.border_contrast_medium.borderColor,
                      backgroundColor: isSelected
                        ? t.palette.primary_500
                        : 'transparent',
                    },
                  ]}>
                  {isSelected ? (
                    <Text
                      style={[
                        a.text_xs,
                        a.font_bold,
                        {color: t.palette.white, lineHeight: 12},
                      ]}>
                      ✓
                    </Text>
                  ) : null}
                </View>
                <View style={[a.flex_1]}>
                  <Text style={[a.text_sm, a.font_medium]} numberOfLines={1}>
                    {board.name}
                  </Text>
                  {board.description ? (
                    <Text
                      style={[a.text_xs, t.atoms.text_contrast_medium]}
                      numberOfLines={1}>
                      {board.description}
                    </Text>
                  ) : null}
                </View>
                <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
                  {board.memberCount}
                </Text>
              </Pressable>
            )
          })
        )}
      </ScrollView>
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
