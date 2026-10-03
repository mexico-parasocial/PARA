import {useState} from 'react'
import {ScrollView, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {type CommunityBoardView} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {SearchInput} from '#/components/forms/SearchInput'
import {Text} from '#/components/Typography'
import {normalizeActivitySearch} from '#/features/communityActivities/explorer'

export function CommunityFilterDialog({
  control,
  boards,
  selectedUri,
  onSelect,
  hasMore,
  isLoadingMore,
  loadMoreError,
  onLoadMore,
}: {
  control: Dialog.DialogControlProps
  boards: CommunityBoardView[]
  selectedUri: string | null
  onSelect: (uri: string | null) => void
  hasMore: boolean
  isLoadingMore: boolean
  loadMoreError: boolean
  onLoadMore: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [search, setSearch] = useState('')
  const matches = boards.filter(board =>
    normalizeActivitySearch(board.name).includes(
      normalizeActivitySearch(search),
    ),
  )
  const select = (uri: string | null) => {
    onSelect(uri)
    setSearch('')
    control.close()
  }
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner label={l`Choose a community`}>
        <View style={[a.gap_lg]}>
          <Text style={[a.text_xl, a.font_bold]}>
            <Trans>Choose a community</Trans>
          </Text>
          <SearchInput
            label={l`Search communities`}
            placeholder={l`Search communities`}
            value={search}
            onChangeText={setSearch}
            onClearText={() => setSearch('')}
          />
          <ScrollView
            style={{maxHeight: 360}}
            contentContainerStyle={a.gap_xs}
            keyboardShouldPersistTaps="handled">
            <Button
              label={l`All communities`}
              variant="ghost"
              color="secondary"
              style={[
                a.justify_between,
                !selectedUri && t.atoms.bg_contrast_50,
              ]}
              accessibilityState={{selected: !selectedUri}}
              onPress={() => select(null)}>
              <ButtonText>
                <Trans>All communities</Trans>
              </ButtonText>
              {!selectedUri ? (
                <Text style={t.atoms.text_contrast_medium}>✓</Text>
              ) : null}
            </Button>
            {matches.map(board => (
              <Button
                key={board.uri}
                label={board.name}
                variant="ghost"
                color="secondary"
                style={[
                  a.justify_between,
                  selectedUri === board.uri && t.atoms.bg_contrast_50,
                ]}
                accessibilityState={{selected: selectedUri === board.uri}}
                onPress={() => select(board.uri)}>
                <View style={[a.flex_1, a.gap_xs]}>
                  <ButtonText numberOfLines={2}>{board.name}</ButtonText>
                  {board.creatorHandle ? (
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      @{board.creatorHandle}
                    </Text>
                  ) : null}
                </View>
                {selectedUri === board.uri ? (
                  <Text style={t.atoms.text_contrast_medium}>✓</Text>
                ) : null}
              </Button>
            ))}
            {matches.length === 0 ? (
              <Text style={[a.p_md, a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>
                  No matching communities. Explore more to expand the list.
                </Trans>
              </Text>
            ) : null}
          </ScrollView>
          {hasMore ? (
            <Button
              label={l`Explore more communities`}
              variant="outline"
              color="secondary"
              size="small"
              disabled={isLoadingMore}
              onPress={onLoadMore}>
              <ButtonText>
                {isLoadingMore ? (
                  <Trans>Loading…</Trans>
                ) : (
                  <Trans>Explore more communities</Trans>
                )}
              </ButtonText>
            </Button>
          ) : null}
          {loadMoreError ? (
            <Text
              accessibilityRole="alert"
              style={[a.text_sm, {color: t.palette.negative_500}]}>
              <Trans>More communities could not load. Try again.</Trans>
            </Text>
          ) : null}
        </View>
        <Dialog.Close />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}
