import {useMemo, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  formatSignal,
  getSignalColor,
  getSignalCounts,
  getSignalLabel,
  parseSignalAverage,
} from '#/lib/policy-display'
import {
  type CommunityBoardView,
  useCommunityBoardQuery,
  useCommunityBoardsQuery,
} from '#/state/queries/community-boards'
import {usePolicyCommunityVotesQuery} from '#/state/queries/policy-community-votes'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {isPartyBoard} from '#/screens/Communities/communityGrouping'
import {atoms as a, useTheme} from '#/alf'
import {SignalHistogram} from '#/components/civic/PolicyConsensus'
import {Text} from '#/components/Typography'

const INITIAL_ROWS = 8

function normalize(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^p\//, '')
    .replace(/[^a-z0-9]+/g, '-')
}

function formatAverage(average: number) {
  const rounded = Math.round(average * 10) / 10
  return rounded > 0 ? `+${rounded.toFixed(1)}` : rounded.toFixed(1)
}

function initials(name: string) {
  const letters = name
    .replace(/^@/, '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
  return letters || '?'
}

function VoterRow({
  name,
  signal,
  isViewer,
}: {
  name: string
  signal: number
  isViewer: boolean
}) {
  const t = useTheme()
  const color = getSignalColor(signal)
  return (
    <View style={[a.flex_row, a.align_center, a.gap_md]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          {
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: color + '26',
          },
        ]}>
        <Text style={[a.text_sm, a.font_bold, {color}]}>{initials(name)}</Text>
      </View>
      <View style={[a.flex_1]}>
        <Text
          numberOfLines={1}
          style={[a.text_md, a.font_semi_bold, t.atoms.text]}>
          {name}
          {isViewer ? ' · Tú' : ''}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {getSignalLabel(signal)}
        </Text>
      </View>
      <View
        style={[
          a.rounded_full,
          {
            minWidth: 44,
            paddingHorizontal: 12,
            paddingVertical: 6,
            alignItems: 'center',
            backgroundColor: color + '22',
          },
        ]}>
        <Text style={[a.text_sm, a.font_bold, {color}]}>
          {formatSignal(signal)}
        </Text>
      </View>
    </View>
  )
}

/**
 * Who in the viewer's community voted on this policy, and how: how many took
 * part, where the community sits, and each member's own vote. The votes are
 * public ballots; the AppView only answers a member of the community.
 */
export function PolicyCommunityVotes({
  policyUri,
  policyCommunity,
}: {
  policyUri: string
  /** The community the policy was published in, as the tally names it. */
  policyCommunity?: string
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const {affiliations} = usePoliticalAffiliation()
  const [chosen, setChosen] = useState<string | undefined>()
  const [showAll, setShowAll] = useState(false)

  const {data: policyBoard} = useCommunityBoardQuery({
    communityId: policyCommunity || undefined,
  })
  const {data: boards} = useCommunityBoardsQuery({limit: 50})

  // The viewer's communities that matter here: the one the policy was
  // published in, and the parties they are affiliated with.
  const options = useMemo(() => {
    const parties = new Set(
      affiliations
        .filter(item => item.type === 'party')
        .map(item => normalize(item.name)),
    )
    const found = new Map<string, CommunityBoardView>()
    const add = (board: CommunityBoardView | undefined) => {
      if (board && board.viewerMembershipState === 'active') {
        found.set(board.uri, board)
      }
    }
    add(policyBoard?.board)
    for (const board of boards?.boards ?? []) {
      if (
        isPartyBoard(board) &&
        [board.name, board.slug, board.communityId].some(key =>
          parties.has(normalize(key)),
        )
      ) {
        add(board)
      }
    }
    return [...found.values()]
  }, [affiliations, boards, policyBoard])

  const selected = options.find(board => board.uri === chosen) ?? options[0]
  const {data, isLoading, isError} = usePolicyCommunityVotesQuery({
    post: policyUri,
    community: selected?.uri,
  })

  if (options.length === 0) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>
          Únete a una comunidad, o elige tu partido en tus afiliaciones, para
          ver cómo votan las personas que la integran.
        </Trans>
      </Text>
    )
  }

  const average = data ? parseSignalAverage(data.signalAverage) : 0
  const participation =
    data && data.memberCount > 0 ? data.voterCount / data.memberCount : 0
  const rows = data
    ? showAll
      ? data.votes
      : data.votes.slice(0, INITIAL_ROWS)
    : []

  return (
    <View style={[a.gap_lg]}>
      {options.length > 1 ? (
        <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
          {options.map(board => {
            const isSelected = board.uri === selected?.uri
            return (
              <Pressable
                key={board.uri}
                accessibilityRole="button"
                accessibilityLabel={board.name}
                accessibilityHint={_(msg`Muestra los votos de esta comunidad`)}
                accessibilityState={{selected: isSelected}}
                onPress={() => {
                  setChosen(board.uri)
                  setShowAll(false)
                }}
                style={[
                  a.rounded_full,
                  a.border,
                  {paddingHorizontal: 14, paddingVertical: 8},
                  isSelected
                    ? {
                        backgroundColor: t.palette.primary_500,
                        borderColor: t.palette.primary_500,
                      }
                    : [t.atoms.bg_contrast_25, t.atoms.border_contrast_low],
                ]}>
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    isSelected ? {color: '#FFFFFF'} : t.atoms.text,
                  ]}>
                  {board.name}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : (
        <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
          {selected?.name}
        </Text>
      )}

      {isLoading ? (
        <View
          style={[
            a.rounded_xs,
            t.atoms.bg_contrast_50,
            {height: 120, opacity: 0.6},
          ]}
        />
      ) : isError || !data ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>No se pudo cargar cómo votó esta comunidad.</Trans>
        </Text>
      ) : data.voterCount === 0 ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Nadie en {selected?.name} ha votado todavía.</Trans>
        </Text>
      ) : (
        <>
          <View style={[a.gap_xs]}>
            <View style={[a.flex_row, a.justify_between, a.align_end]}>
              <Text style={[a.text_sm, t.atoms.text]}>
                <Text style={[a.font_bold]}>{data.voterCount}</Text>
                <Trans> de {data.memberCount} miembros votaron</Trans>
              </Text>
              <Text
                style={[
                  a.text_sm,
                  a.font_bold,
                  {color: getSignalColor(average)},
                ]}>
                <Trans>Promedio {formatAverage(average)}</Trans>
              </Text>
            </View>
            <View
              style={[
                a.rounded_full,
                t.atoms.bg_contrast_50,
                {height: 8, overflow: 'hidden'},
              ]}>
              <View
                style={{
                  width: `${Math.round(participation * 100)}%`,
                  height: '100%',
                  backgroundColor: t.palette.primary_500,
                }}
              />
            </View>
          </View>

          <SignalHistogram
            counts={getSignalCounts({breakdown: data.breakdown})}
            height={56}
            showCounts
          />

          <View style={[a.gap_md]}>
            {rows.map(vote => (
              <VoterRow
                key={vote.did}
                name={
                  vote.displayName ||
                  (vote.handle ? `@${vote.handle}` : vote.did)
                }
                signal={vote.signal}
                isViewer={vote.did === currentAccount?.did}
              />
            ))}
            {!showAll && data.votes.length > INITIAL_ROWS ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={_(msg`Ver todos los votos`)}
                accessibilityHint={_(
                  msg`Muestra a todas las personas que votaron`,
                )}
                onPress={() => setShowAll(true)}>
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    {color: t.palette.primary_500},
                  ]}>
                  <Trans>Ver todos ({data.votes.length})</Trans>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
    </View>
  )
}
