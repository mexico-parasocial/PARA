import {useState} from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {COMPASS_POSITION_NAMES} from '#/lib/compass/compassColors'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {findCommunityTreeTwinGroup} from '../communitySelection'
import {CommunityTreeSelector} from './CommunityTreeSelector'

/*
 * Picks one of the boards it is given from the same Official / Unofficial /
 * By ninth dropdowns the civic tree uses, instead of a row per community.
 * Dialogs offer only communities the viewer can post to, so a ninth the viewer
 * has not joined is reported rather than silently ignored.
 */
export function CommunityPicker({
  boards,
  selectedUri,
  onSelect,
}: {
  boards: CommunityBoardView[]
  selectedUri?: string
  onSelect: (uri: string) => void
}) {
  const t = useTheme()
  const [missingNinth, setMissingNinth] = useState<string>()
  const selected = boards.find(board => board.uri === selectedUri)

  return (
    <View style={[a.gap_xs]}>
      <CommunityTreeSelector
        boards={boards}
        selectedCommunity={selected}
        selectedUri={selectedUri}
        selectedName={undefined}
        onSelect={uri => {
          setMissingNinth(undefined)
          onSelect(uri)
        }}
        onSelectNinth={ninth => {
          const name = COMPASS_POSITION_NAMES[ninth]
          const [board] = findCommunityTreeTwinGroup(boards, name)
          if (board) {
            setMissingNinth(undefined)
            onSelect(board.uri)
          } else {
            setMissingNinth(name)
          }
        }}
        defaultCategory="official"
        collapseTwins
        isLoading={false}
        isError={false}
        onRetry={() => {}}
        hasNextPage={false}
        onLoadMore={() => {}}
      />
      {missingNinth ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>You have not joined {missingNinth}.</Trans>
        </Text>
      ) : null}
    </View>
  )
}
