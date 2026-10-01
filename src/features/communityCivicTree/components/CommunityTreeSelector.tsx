import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  COMPASS_COLORS,
  COMPASS_POSITION_IDS,
  COMPASS_POSITION_NAMES,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ChevronBottom_Stroke2_Corner0_Rounded as ChevronIcon} from '#/components/icons/Chevron'
import * as Menu from '#/components/Menu'
import {Text} from '#/components/Typography'
import {
  type CommunityTreeCategory,
  getCommunityTreeCategory,
  getCommunityTreeNinth,
  getCommunityTreeTwins,
  groupCommunityTreeBoards,
} from '../communitySelection'

export function CommunityTreeSelector({
  boards,
  selectedCommunity,
  selectedUri,
  selectedName,
  onSelect,
  onSelectNinth,
  isLoading,
  isError,
  onRetry,
  hasNextPage,
  onLoadMore,
  onSelectAll,
  allLabel,
  collapseTwins,
  showTreeVersions = false,
  defaultCategory = 'unofficial',
}: {
  boards: CommunityBoardView[]
  selectedCommunity?: CommunityBoardView
  selectedUri?: string
  selectedName?: string
  onSelect: (uri: string) => void
  onSelectNinth: (ninth: CompassPositionId) => void
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  hasNextPage: boolean
  onLoadMore: () => void
  /** Adds an "all communities" entry that clears the selection. */
  onSelectAll?: () => void
  /** Shown on the trigger while nothing is selected. */
  allLabel?: string
  /** List a party or ninth once even if its board exists several times. */
  collapseTwins?: boolean
  /** Keep distinct records accessible while listing each community name once. */
  showTreeVersions?: boolean
  /** Category listed first when nothing is selected. */
  defaultCategory?: CommunityTreeCategory
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  const [filter, setFilter] = useState<{
    uri?: string
    category: CommunityTreeCategory
  }>()
  const category =
    filter?.uri === selectedUri && filter
      ? filter.category
      : selectedCommunity
        ? getCommunityTreeCategory(selectedCommunity)
        : defaultCategory
  const categories = [
    {id: 'official', label: l`Official`},
    {id: 'unofficial', label: l`Unofficial`},
    {id: 'ninth', label: l`By ninth`},
  ] as const
  const groups = groupCommunityTreeBoards(boards, category, {collapseTwins})
  const versions = selectedCommunity
    ? Array.from(
        new Map(
          getCommunityTreeTwins(selectedCommunity, boards).map(board => [
            board.uri,
            board,
          ]),
        ).values(),
      )
    : []
  const hasBoards = groups.some(group => group.boards.length > 0)
  const selectedNinth = selectedCommunity
    ? getCommunityTreeNinth(selectedCommunity)
    : COMPASS_POSITION_IDS.find(
        id => COMPASS_POSITION_NAMES[id] === selectedName,
      )
  const name =
    category === 'ninth'
      ? selectedNinth
        ? COMPASS_POSITION_NAMES[selectedNinth]
        : l`Select ninth`
      : selectedCommunity &&
          getCommunityTreeCategory(selectedCommunity) === category
        ? selectedCommunity.name
        : !selectedCommunity && !selectedNinth && selectedName
          ? selectedName
          : (allLabel ?? l`Select community`)

  return (
    <View style={[a.flex_row, a.flex_wrap, a.align_center, a.gap_sm]}>
      <Menu.Root>
        <Menu.Trigger label={l`Community category`}>
          {({props}) => (
            <Button
              {...props}
              label={props.accessibilityLabel}
              size="small"
              variant="ghost"
              color="secondary">
              <ButtonText>
                {categories.find(c => c.id === category)?.label}
              </ButtonText>
              <ButtonIcon icon={ChevronIcon} />
            </Button>
          )}
        </Menu.Trigger>
        <Menu.Outer>
          <Menu.LabelText>
            <Trans>Communities</Trans>
          </Menu.LabelText>
          {categories.map(item => (
            <Menu.Item
              key={item.id}
              label={item.label}
              onPress={() => setFilter({uri: selectedUri, category: item.id})}>
              <Menu.ItemText>{item.label}</Menu.ItemText>
              <Menu.ItemRadio selected={category === item.id} />
            </Menu.Item>
          ))}
        </Menu.Outer>
      </Menu.Root>
      <Menu.Root>
        <Menu.Trigger label={l`Select community (currently: ${name})`}>
          {({props}) => (
            <Button
              {...props}
              label={props.accessibilityLabel}
              size="small"
              variant="outline"
              color="secondary"
              style={{maxWidth: 320}}>
              <ButtonText numberOfLines={1} style={{flexShrink: 1}}>
                {name}
              </ButtonText>
              <ButtonIcon icon={ChevronIcon} />
            </Button>
          )}
        </Menu.Trigger>
        <Menu.Outer style={{width: 320, maxHeight: 420}}>
          <Menu.LabelText>
            <Trans>Select a community tree</Trans>
          </Menu.LabelText>
          {onSelectAll ? (
            <Menu.Group>
              <Menu.Item
                label={allLabel ?? l`All communities`}
                onPress={() => {
                  setFilter({uri: undefined, category})
                  onSelectAll()
                }}>
                <Menu.ItemText>{allLabel ?? l`All communities`}</Menu.ItemText>
                <Menu.ItemRadio
                  selected={!selectedUri && !selectedName && !selectedNinth}
                />
              </Menu.Item>
            </Menu.Group>
          ) : null}
          {category === 'ninth' ? (
            <Menu.Group>
              {COMPASS_POSITION_IDS.map(ninth => (
                <Menu.Item
                  key={ninth}
                  label={COMPASS_POSITION_NAMES[ninth]}
                  onPress={() => {
                    setFilter({uri: undefined, category: 'ninth'})
                    onSelectNinth(ninth)
                  }}>
                  <View
                    style={[
                      a.rounded_full,
                      {
                        width: 8,
                        height: 8,
                        backgroundColor: COMPASS_COLORS[ninth],
                      },
                    ]}
                  />
                  <Menu.ItemText>{COMPASS_POSITION_NAMES[ninth]}</Menu.ItemText>
                  <Menu.ItemRadio selected={selectedNinth === ninth} />
                </Menu.Item>
              ))}
            </Menu.Group>
          ) : (
            groups.map(group =>
              group.boards.length > 0 ? (
                <Menu.Group key={group.id}>
                  {group.boards.map(representative => {
                    const twins = getCommunityTreeTwins(representative, boards)
                    const board = collapseTwins
                      ? (twins.find(item => item.uri === selectedUri) ??
                        representative)
                      : representative
                    return (
                      <Menu.Item
                        key={board.uri}
                        label={board.name}
                        onPress={() => {
                          setFilter({uri: board.uri, category})
                          onSelect(board.uri)
                        }}>
                        <View style={[a.flex_1, a.gap_xs]}>
                          <Text
                            style={[a.text_sm, a.font_bold, t.atoms.text]}
                            numberOfLines={1}>
                            {board.name}
                          </Text>
                          <Text
                            style={[a.text_xs, t.atoms.text_contrast_medium]}
                            numberOfLines={1}>
                            {showTreeVersions && twins.length > 1
                              ? l`${twins.length} trees`
                              : board.creatorHandle
                                ? `@${board.creatorHandle} · `
                                : ''}
                            {showTreeVersions && twins.length > 1
                              ? ''
                              : board.uri.split('/').pop()}
                          </Text>
                        </View>
                        <Menu.ItemRadio selected={selectedUri === board.uri} />
                      </Menu.Item>
                    )
                  })}
                </Menu.Group>
              ) : null,
            )
          )}
          {category !== 'ninth' &&
            (isError ? (
              <Menu.Item label={l`Retry loading communities`} onPress={onRetry}>
                <Menu.ItemText>
                  <Trans>Couldn't load communities. Retry</Trans>
                </Menu.ItemText>
              </Menu.Item>
            ) : !hasBoards ? (
              <Text style={[a.p_md, a.text_sm, t.atoms.text_contrast_medium]}>
                {isLoading
                  ? l`Loading communities…`
                  : l`No communities in this category`}
              </Text>
            ) : null)}
          {category !== 'ninth' && hasNextPage ? (
            <Menu.Item
              label={l`Load more communities`}
              onPress={onLoadMore}
              disabled={isLoading}>
              <Menu.ItemText>
                {isLoading ? l`Loading communities…` : l`Load more communities`}
              </Menu.ItemText>
            </Menu.Item>
          ) : null}
        </Menu.Outer>
      </Menu.Root>
      {showTreeVersions && versions.length > 1 ? (
        <Menu.Root>
          <Menu.Trigger label={l`Choose tree version`}>
            {({props}) => (
              <Button
                {...props}
                label={props.accessibilityLabel}
                size="small"
                variant="ghost"
                color="secondary">
                <ButtonText>
                  <Trans>Tree version</Trans>
                </ButtonText>
                <ButtonIcon icon={ChevronIcon} />
              </Button>
            )}
          </Menu.Trigger>
          <Menu.Outer style={{width: 320, maxHeight: 420}}>
            <Menu.LabelText>
              <Trans>Separate trees with the same community name</Trans>
            </Menu.LabelText>
            {versions.map(board => (
              <Menu.Item
                key={board.uri}
                label={
                  board.creatorHandle
                    ? `@${board.creatorHandle} · ${board.uri.split('/').pop()}`
                    : `${board.creatorDid} · ${board.uri.split('/').pop()}`
                }
                onPress={() => onSelect(board.uri)}>
                <View style={[a.flex_1, a.gap_xs]}>
                  <Text numberOfLines={1} style={[a.text_sm, t.atoms.text]}>
                    {board.creatorHandle
                      ? `@${board.creatorHandle}`
                      : board.creatorDid}
                  </Text>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {board.uri.split('/').pop()}
                  </Text>
                </View>
                <Menu.ItemRadio selected={selectedUri === board.uri} />
              </Menu.Item>
            ))}
          </Menu.Outer>
        </Menu.Root>
      ) : null}
    </View>
  )
}
