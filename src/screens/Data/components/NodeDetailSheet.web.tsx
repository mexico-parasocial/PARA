import {useEffect, useMemo, useState} from 'react'
import {ScrollView, TextInput, useWindowDimensions, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES} from '#/state/queries/community-civic-tree'
import {useProfileQuery} from '#/state/queries/profile'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {TimesLarge_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {RedditVoteButton} from '#/components/PostControls/VoteButton'
import {Text} from '#/components/Typography'
import {VotingButtonHorizontal} from '#/components/VotingButtonHorizontal'
import {isPolicyCard} from '#/features/civicTree/cardVoting'
import {CARD_TYPE_COLORS} from '#/features/civicTree/colors'
import {type NodeDetailSheetProps} from './NodeDetailSheet.types'
import {computeSuggestedConnections} from './suggestion-engine'

/** Desktop dialog. Native keeps its platform-specific bottom sheet. */
export function NodeDetailSheet(props: NodeDetailSheetProps) {
  const control = Dialog.useDialogControl()
  const {t: l} = useLingui()
  const {width} = useWindowDimensions()
  useEffect(() => {
    if (props.visible) control.open()
    else control.close()
  }, [props.visible, control])
  return (
    <Dialog.Outer control={control} onClose={props.onClose}>
      {props.node ? (
        <Dialog.Inner
          label={l`Card details`}
          style={{width: Math.min(960, width - 32), maxWidth: 960}}
          contentContainerStyle={a.p_0}>
          <CardDetails
            key={props.node.id}
            {...props}
            onClose={() => control.close()}
          />
        </Dialog.Inner>
      ) : null}
    </Dialog.Outer>
  )
}

function CardDetails({
  node,
  availableNodes = [],
  availableEdges = [],
  onClose,
  onSelectNode,
  voterDid,
  userVote = 0,
  onVote,
  isVoting,
  voteError,
  onCreateRelationship,
  isCreatingRelationship,
  relationshipError,
}: NodeDetailSheetProps) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {width, height} = useWindowDimensions()
  const {data: author} = useProfileQuery({did: node?.author_did})
  const [showConnect, setShowConnect] = useState(false)
  const [query, setQuery] = useState('')
  const [targetId, setTargetId] = useState<string>()
  const [relation, setRelation] = useState('supports')
  const byId = useMemo(
    () => new Map(availableNodes.map(card => [card.id, card])),
    [availableNodes],
  )
  const connections = availableEdges.filter(
    edge =>
      (edge.source === node?.id || edge.target === node?.id) &&
      byId.has(edge.source) &&
      byId.has(edge.target),
  )
  const suggestions = useMemo(() => {
    if (!node) return []
    const source = {...node, ...byId.get(node.id)}
    return computeSuggestedConnections(
      source,
      availableNodes.map(card => ({
        ...card,
        content: card.content ?? null,
        source_url: card.source_url ?? null,
      })),
      availableEdges,
      3,
    )
  }, [node, byId, availableNodes, availableEdges])
  if (!node) return null
  const policy = isPolicyCard(node)
  const color = policy
    ? t.palette.primary_500
    : (CARD_TYPE_COLORS[node.card_type] ?? t.palette.contrast_500)
  const desktop = width >= 820
  const bodyHeight = Math.max(240, Math.min(640, height - 200))
  const canVote = !!voterDid && !!onVote
  const canConnect = !!voterDid && !!onCreateRelationship
  const candidates = query.trim()
    ? availableNodes
        .filter(
          card =>
            card.id !== node.id &&
            card.title
              .toLocaleLowerCase()
              .includes(query.trim().toLocaleLowerCase()),
        )
        .slice(0, 8)
    : suggestions.map(suggestion => suggestion.node)
  const alreadyLinked = availableEdges.some(
    edge =>
      edge.source === node.id &&
      edge.target === targetId &&
      edge.relationship_type === relation,
  )
  const fullType = policy ? l`Policy` : node.card_type
  let sourceUrl: URL | undefined
  try {
    const url = node.source_url ? new URL(node.source_url) : undefined
    if (url && ['https:', 'http:'].includes(url.protocol)) sourceUrl = url
  } catch {}

  const sidebar = (
    <View
      style={[
        a.p_xl,
        a.gap_xl,
        t.atoms.bg_contrast_25,
        desktop && {width: 280},
      ]}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
          {policy ? (
            <Trans>Policy position</Trans>
          ) : (
            <>
              <Trans>Community votes</Trans> · {node.influence ?? 0}
            </>
          )}
        </Text>
        {policy ? (
          <>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Community score</Trans> · {node.influence ?? 0}
            </Text>
            <VotingButtonHorizontal
              initialVote={userVote}
              disabled={!canVote || isVoting}
              saveFailed={!!voteError}
              onVoteChange={value => onVote?.(node.id, value)}
            />
          </>
        ) : (
          <RedditVoteButton
            score={node.influence ?? 0}
            currentVote={
              userVote > 0 ? 'upvote' : userVote < 0 ? 'downvote' : 'none'
            }
            hasBeenToggled={false}
            disabled={!canVote || isVoting}
            onUpvote={() => onVote?.(node.id, userVote > 0 ? 0 : 1)}
            onDownvote={() => onVote?.(node.id, userVote < 0 ? 0 : -1)}
            big
          />
        )}
        {!voterDid ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Sign in to vote.</Trans>
          </Text>
        ) : null}
        {isVoting ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>Saving vote…</Trans>
          </Text>
        ) : null}
        {voteError ? (
          <Text
            accessibilityRole="alert"
            style={[a.text_xs, {color: t.palette.negative_500}]}>
            <Trans>Your vote could not be saved. Please try again later.</Trans>
          </Text>
        ) : null}
      </View>
      <View
        style={[a.border_t, a.pt_lg, a.gap_sm, t.atoms.border_contrast_low]}>
        <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
          <Trans>Added by</Trans>
        </Text>
        <a
          href={`/profile/${node.author_did}`}
          title={node.author_did}
          style={{
            color: t.atoms.text.color,
            textDecoration: 'none',
            fontSize: 14,
            overflowWrap: 'anywhere',
          }}>
          <Text style={[a.text_sm, t.atoms.text]}>
            {author?.displayName || author?.handle || node.author_did}
          </Text>
        </a>
        {author?.handle ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            @{author.handle}
          </Text>
        ) : null}
      </View>
      {sourceUrl ? (
        <View
          style={[a.border_t, a.pt_lg, a.gap_sm, t.atoms.border_contrast_low]}>
          <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
            <Trans>Source</Trans>
          </Text>
          <a
            href={sourceUrl.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: t.palette.primary_500,
              fontSize: 14,
              overflowWrap: 'anywhere',
            }}>
            <Text style={[a.text_sm, {color: t.palette.primary_500}]}>
              {sourceUrl.hostname} ↗
            </Text>
          </a>
        </View>
      ) : null}
      {canConnect ? (
        <Button
          label={l`Add connection`}
          size="small"
          variant="outline"
          color="secondary"
          accessibilityState={{expanded: showConnect}}
          onPress={() => setShowConnect(value => !value)}>
          <ButtonText>
            {showConnect ? (
              <Trans>Cancel connection</Trans>
            ) : (
              <Trans>Add connection</Trans>
            )}
          </ButtonText>
        </Button>
      ) : null}
    </View>
  )

  return (
    <View style={[a.overflow_hidden, a.rounded_md]}>
      <View
        style={[
          a.p_xl,
          a.border_b,
          t.atoms.border_contrast_low,
          a.flex_row,
          a.align_start,
          a.gap_lg,
        ]}>
        <View style={[a.flex_1, a.gap_sm]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <View
              style={[
                a.rounded_full,
                {width: 7, height: 7, backgroundColor: color},
              ]}
            />
            <Text style={[a.text_xs, a.font_bold, {color}]}>
              {fullType.toLocaleUpperCase()}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>Community civic tree</Trans>
            </Text>
          </View>
          <Text style={[a.text_xl, a.font_bold, a.leading_snug, t.atoms.text]}>
            {node.title}
          </Text>
        </View>
        <Button
          label={l`Close card details`}
          size="small"
          variant="ghost"
          color="secondary"
          onPress={onClose}>
          <ButtonIcon icon={CloseIcon} />
        </Button>
      </View>
      <View
        style={[
          desktop && a.flex_row,
          {maxHeight: bodyHeight, minHeight: desktop ? 320 : undefined},
        ]}>
        <ScrollView
          style={[a.flex_1, {minHeight: 0}]}
          contentContainerStyle={[a.p_xl, a.gap_xl]}>
          {node.content ? (
            <Text
              selectable
              style={[a.text_md, a.leading_relaxed, t.atoms.text]}>
              {node.content}
            </Text>
          ) : (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>No description has been added.</Trans>
            </Text>
          )}
          {!desktop ? sidebar : null}
          {showConnect ? (
            <View
              style={[
                a.p_lg,
                a.rounded_sm,
                a.border,
                t.atoms.border_contrast_low,
                a.gap_md,
              ]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                <Trans>Add a connection</Trans>
              </Text>
              <TextInput
                accessibilityLabel={l`Find a card to connect`}
                accessibilityHint={l`Searches other cards by title`}
                value={query}
                onChangeText={setQuery}
                placeholder={l`Search cards…`}
                placeholderTextColor={t.palette.contrast_400}
                style={[
                  a.p_md,
                  a.border,
                  a.rounded_sm,
                  a.text_sm,
                  t.atoms.border_contrast_low,
                  t.atoms.text,
                ]}
              />
              <select
                aria-label={l`Relationship type`}
                value={relation}
                onChange={event => setRelation(event.currentTarget.value)}
                style={{
                  padding: 10,
                  borderRadius: 6,
                  backgroundColor: t.atoms.bg.backgroundColor,
                  color: t.atoms.text.color,
                  border: `1px solid ${t.palette.contrast_200}`,
                  fontSize: 14,
                }}>
                {COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {!query.trim() ? (
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>Suggested cards</Trans>
                </Text>
              ) : null}
              {candidates.map(candidate => (
                <Button
                  key={candidate.id}
                  label={candidate.title}
                  size="small"
                  variant={targetId === candidate.id ? 'outline' : 'ghost'}
                  color="secondary"
                  accessibilityState={{selected: targetId === candidate.id}}
                  onPress={() => setTargetId(candidate.id)}
                  style={a.justify_start}>
                  <ButtonText numberOfLines={2}>{candidate.title}</ButtonText>
                </Button>
              ))}
              {!candidates.length ? (
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>No cards found. Try another search.</Trans>
                </Text>
              ) : null}
              {alreadyLinked ? (
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>This connection already exists.</Trans>
                </Text>
              ) : null}
              {relationshipError ? (
                <Text
                  accessibilityRole="alert"
                  style={[a.text_xs, {color: t.palette.negative_500}]}>
                  <Trans>
                    The connection could not be saved. Please try again.
                  </Trans>
                </Text>
              ) : null}
              <Button
                label={l`Create connection`}
                size="small"
                variant="solid"
                color="primary"
                disabled={!targetId || alreadyLinked || isCreatingRelationship}
                onPress={() => {
                  if (targetId)
                    onCreateRelationship?.(node.id, targetId, relation)
                }}>
                <ButtonText>
                  {isCreatingRelationship ? (
                    <Trans>Saving…</Trans>
                  ) : (
                    <Trans>Create connection</Trans>
                  )}
                </ButtonText>
              </Button>
            </View>
          ) : null}
          <View style={[a.gap_md]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              <Trans>Connections</Trans> · {connections.length}
            </Text>
            {connections.length ? (
              connections.map(edge => {
                const outgoing = edge.source === node.id
                const other = byId.get(outgoing ? edge.target : edge.source)!
                const type = COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.find(
                  value => value.value === edge.relationship_type,
                )
                return (
                  <Button
                    key={edge.id}
                    label={`${type?.label ?? edge.relationship_type}: ${other.title}`}
                    size="small"
                    variant="ghost"
                    color="secondary"
                    disabled={!onSelectNode}
                    onPress={() => onSelectNode?.(other.id)}
                    style={[
                      a.p_md,
                      a.border,
                      a.rounded_sm,
                      t.atoms.border_contrast_low,
                      a.justify_start,
                    ]}>
                    <View style={[a.flex_1, a.gap_xs]}>
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        {outgoing ? '→' : '←'}{' '}
                        {type?.label ?? edge.relationship_type}
                      </Text>
                      <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                        {other.title}
                      </Text>
                    </View>
                  </Button>
                )
              })
            ) : (
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>This card has no connections yet.</Trans>
              </Text>
            )}
          </View>
        </ScrollView>
        {desktop ? (
          <ScrollView
            style={[
              {width: 280, flexGrow: 0, flexShrink: 0},
              a.border_l,
              t.atoms.border_contrast_low,
              t.atoms.bg_contrast_25,
            ]}>
            {sidebar}
          </ScrollView>
        ) : null}
      </View>
    </View>
  )
}
