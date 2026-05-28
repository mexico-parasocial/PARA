import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {AtUri} from '@atproto/api'
// @ts-ignore - lingui macro types not available
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {getCommunityInsignia} from '#/lib/civic-insignias'
import {CIVIC_TREE_COPY,CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {type CommunityGovernanceView} from '#/lib/community-governance'
import {type UsePaletteValue} from '#/lib/hooks/usePalette'
import {type NavigationProp} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {useCommunityRelationsQuery} from '#/state/queries/community-shared-content'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {CivicInsignia} from '#/components/CivicInsignia'
import {PageText_Stroke2_Corner0_Rounded as PageTextIcon} from '#/components/icons/PageText'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {CommunityUriChip} from './CommunityUriChip'
import {styles} from './styles'
import {TableContent} from './TableContent'

type BoardView = {
  uri?: string
  name?: string
  description?: string
  quadrant?: string
  memberCount?: number
  founderStarterPackUri?: string
  creatorHandle?: string
  creatorDid?: string
  delegatesChatId?: string
  subdelegatesChatId?: string
  status?: string
  parentCommunityUris?: string[]
  childCommunityCount?: number
}

export function CommunityAbout({
  board,
  governance,
  fetchedGovernance,
  isGovernanceLoading,
  isGovernanceError,
  refetchGovernance,
  isDraft,
  isJoined,
  quorumCount,
  plainCommunityName,
  resolvedCommunityName,
  createdAt,
  acceptInviteMutation,
  onPressAcceptFounderInvite,
  onPressPolicies,
  onPressMatters,
  onPressRAQ,
  onPressCabildeo,
  onPressVoters,
  onPressRoles,
  onPressDocuments,
  pal,
}: {
  board: BoardView | undefined
  governance: CommunityGovernanceView
  fetchedGovernance: CommunityGovernanceView | undefined
  isGovernanceLoading: boolean
  isGovernanceError: boolean
  refetchGovernance: () => Promise<unknown>
  isDraft: boolean
  isJoined: boolean
  quorumCount: number
  plainCommunityName: string
  resolvedCommunityName: string
  createdAt: string | undefined
  acceptInviteMutation: {
    error: Error | null
    isSuccess: boolean
    isPending: boolean
  }
  onPressAcceptFounderInvite: () => void
  onPressPolicies: () => void
  onPressMatters: () => void
  onPressRAQ: () => void
  onPressCabildeo: () => void
  onPressVoters: () => void
  onPressRoles: () => void
  onPressDocuments: () => void
  pal: UsePaletteValue
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const { _} = useLingui()
  const [showEstandarte, setShowEstandarte] = useState(true)
  const [showChildren, setShowChildren] = useState(false)

  const {
    data: relationsData,
    isLoading: relationsLoading,
  } = useCommunityRelationsQuery({
    communityUri: board?.uri,
    relation: 'parentChild',
    limit: 50,
  })

  const rules = [
    'Be respectful and civil',
    'No spam or self-promotion',
    'Stay on topic',
    'No harassment or hate speech',
    'Follow community guidelines',
  ]

  const onPressFoundingStarterPack = () => {
    if (!board?.founderStarterPackUri) return
    const starterPackUri = new AtUri(board.founderStarterPackUri)
    navigation.navigate('StarterPack', {
      name: board.creatorHandle || board.creatorDid || '',
      rkey: starterPackUri.rkey,
    })
  }

  return (
    <View style={styles.aboutContainer}>
      {/* Accept Founder Invite Card (Draft only, non-members) */}
      {isDraft && !isJoined ? (
        <View
          style={[
            styles.sectionCard,
            pal.border,
            {backgroundColor: t.palette.primary_50},
          ]}>
          <Text
            style={[styles.sectionCardTitle, {color: t.palette.primary_700}]}>
            🤝 Join as a Founding Member
          </Text>
          <Text
            style={[
              styles.civicActionsSubtitle,
              {color: t.palette.primary_600},
            ]}>
            This community is gathering its founding members. Accept the invite
            to become one of the first 9 and help bring this community to life.
          </Text>
          <View style={{gap: 8, marginTop: 4}}>
            <Text
              style={[styles.aboutHelperText, {color: t.palette.primary_600}]}>
              Current founding members: {quorumCount} / 9
            </Text>
            <View
              style={[
                styles.quorumBar,
                {backgroundColor: t.palette.contrast_100},
              ]}>
              <View
                style={[
                  styles.quorumBarFill,
                  {
                    backgroundColor: t.palette.primary_500,
                    width: `${Math.min(100, (quorumCount / 9) * 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
          {acceptInviteMutation.error ? (
            <Text
              style={{
                color: t.palette.negative_500,
                fontSize: 13,
                marginTop: 4,
              }}>
              {cleanError(acceptInviteMutation.error)}
            </Text>
          ) : null}
          {acceptInviteMutation.isSuccess ? (
            <Text
              style={{
                color: t.palette.positive_500,
                fontSize: 14,
                fontWeight: '700',
                marginTop: 4,
              }}>
              ✅ You've joined as a founding member!
            </Text>
          ) : (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={acceptInviteMutation.isPending}
              onPress={() => void onPressAcceptFounderInvite()}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: acceptInviteMutation.isPending
                    ? t.palette.contrast_200
                    : t.palette.primary_500,
                  marginTop: 8,
                },
              ]}>
              <Text style={styles.primaryButtonText}>
                {acceptInviteMutation.isPending
                  ? 'Joining...'
                  : 'Accept Founder Invite'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {board?.founderStarterPackUri ? (
        <View
          style={[
            styles.sectionCard,
            pal.border,
            {
              backgroundColor: isDraft
                ? t.palette.primary_25
                : t.atoms.bg.backgroundColor,
            },
          ]}>
          <Text
            style={[
              styles.sectionCardTitle,
              isDraft ? {color: t.palette.primary_700} : pal.text,
            ]}>
            Founding Starter Pack
          </Text>
          <Text
            style={[
              styles.aboutHelperText,
              isDraft ? {color: t.palette.primary_600} : pal.textLight,
            ]}>
            This internal starter pack tracks the founding quorum for the
            community and unlocks the full community experience at 9 members.
          </Text>
          <View style={styles.aboutInfo}>
            <Text
              style={[
                styles.aboutLabel,
                isDraft ? {color: t.palette.primary_600} : pal.textLight,
              ]}>
              Progress:
            </Text>
            <Text style={[styles.aboutValue, pal.text]}>
              {quorumCount} / 9 founding members
            </Text>
          </View>
          <View style={styles.aboutInfo}>
            <Text
              style={[
                styles.aboutLabel,
                isDraft ? {color: t.palette.primary_600} : pal.textLight,
              ]}>
              Status:
            </Text>
            <Text style={[styles.aboutValue, pal.text]}>
              {isDraft ? 'Draft quorum in progress' : 'Community unlocked'}
            </Text>
          </View>
          <View
            style={[
              styles.quorumBar,
              {
                backgroundColor: isDraft
                  ? t.palette.contrast_100
                  : t.palette.primary_100,
              },
            ]}>
            <View
              style={[
                styles.quorumBarFill,
                {
                  backgroundColor: t.palette.primary_500,
                  width: `${Math.min(100, (quorumCount / 9) * 100)}%`,
                },
              ]}
            />
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onPressFoundingStarterPack}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: isDraft
                  ? t.palette.primary_50
                  : t.palette.contrast_25,
                borderColor: t.palette.primary_200,
              },
            ]}>
            <Text
              style={[
                styles.secondaryButtonText,
                {color: t.palette.primary_700},
              ]}>
              Open founding starter pack
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Civic Actions */}
      <View style={[styles.sectionCard, pal.border, t.atoms.bg]}>
        <View style={styles.civicActionsHeader}>
          <Text style={[styles.sectionCardTitle, pal.text]}>Civic Actions</Text>
          <Text style={[styles.civicActionsSubtitle, pal.textLight]}>
            Jump straight into structured participation for this community.
          </Text>
        </View>
        <View style={styles.civicActionsGrid}>
          {[
            {
              key: 'policies',
              title: 'Policies',
              subtitle: 'Governance and community rules',
              icon: '||#',
              onPress: onPressPolicies,
              bg: t.palette.primary_100,
            },
            {
              key: 'matters',
              title: 'Matters',
              subtitle: 'Core community priorities',
              icon: '|#',
              onPress: onPressMatters,
              bg: t.palette.contrast_100,
            },
            {
              key: 'raq',
              title: 'RAQ',
              subtitle: 'Append and frame open questions',
              icon: '?!',
              onPress: onPressRAQ,
              bg: t.palette.primary_25,
            },
            {
              key: 'cabildeo',
              title: 'Cabildeo',
              subtitle: 'Open scoped deliberations for this community',
              icon: '|#|',
              onPress: onPressCabildeo,
              bg: t.palette.primary_100,
            },
            {
              key: 'voters',
              title: 'Voters',
              subtitle: 'See the active voter landscape',
              icon: '|',
              onPress: onPressVoters,
              bg: t.palette.contrast_25,
            },
            {
              key: 'roles',
              title: 'Roles',
              subtitle: 'Community executives & experts',
              icon: '***',
              onPress: onPressRoles,
              bg: t.palette.primary_50,
            },
            {
              key: 'docs',
              title: 'Docs',
              subtitle: 'Browse source documents and references',
              icon: '[]',
              onPress: onPressDocuments,
              bg: t.palette.primary_100,
            },
          ].map(action => (
            <TouchableOpacity
              accessibilityRole="button"
              key={action.key}
              onPress={action.onPress}
              style={[styles.civicActionCard, {backgroundColor: action.bg}]}>
              <View style={styles.civicActionTopRow}>
                <Text
                  style={[
                    styles.civicActionSigil,
                    {color: t.palette.primary_600},
                  ]}>
                  {action.icon}
                </Text>
                {action.key === 'docs' ? (
                  <PageTextIcon
                    style={{color: t.palette.primary_600}}
                    size="sm"
                  />
                ) : null}
              </View>
              <Text style={[styles.civicActionTitle, pal.text]}>
                {action.title}
              </Text>
              <Text style={[styles.civicActionSubtitle, pal.textLight]}>
                {action.subtitle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Community Info */}
      <View style={[styles.sectionCard, pal.border, t.atoms.bg]}>
        <Text style={[styles.aboutTitle, pal.text]}>
          <Trans>About this Community</Trans>
        </Text>

        {/* Estandarte toggle */}
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setShowEstandarte(v => !v)}
          style={[
            styles.estandarteToggle,
            {borderColor: t.palette.contrast_100},
          ]}>
          <Text style={[styles.estandarteToggleText, pal.text]}>
            {showEstandarte ? 'Hide estandarte' : 'Show estandarte'}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: t.palette.primary_500,
            }}>
            {showEstandarte ? '▲' : '▼'}
          </Text>
        </TouchableOpacity>
        {showEstandarte && (
          <CivicInsignia
            variant="banner"
            colors={getCommunityInsignia(resolvedCommunityName)}
            height={8}
            style={{marginBottom: 12}}
          />
        )}

        <View style={styles.badgesSection}>
          <View style={styles.badgesSectionHeader}>
            <Text style={[styles.badgesSectionTitle, pal.text]}>
              <Trans>Community Directory</Trans>
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressRoles}
              style={[
                styles.badgesSectionButton,
                {borderColor: t.palette.contrast_100},
              ]}>
              <Text
                style={[
                  styles.badgesSectionButtonText,
                  {color: t.palette.primary_500},
                ]}>
                Open directory
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.aboutHelperText, pal.textLight]}>
            {isGovernanceLoading
              ? 'Loading published governance record...'
              : isGovernanceError
                ? 'Could not load governance right now. You can retry and continue browsing other sections.'
                : fetchedGovernance
                  ? `Published governance currently lists ${governance.moderators.length} moderators, ${governance.officials.length} official representatives, and ${governance.deputies.length} deputy roles.`
                  : 'This community has not published a governance record yet.'}
          </Text>
          {isGovernanceError ? (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void refetchGovernance()}
              style={[
                styles.badgesSectionButton,
                {borderColor: t.palette.contrast_100},
              ]}>
              <Text
                style={[
                  styles.badgesSectionButtonText,
                  {color: t.palette.primary_500},
                ]}>
                Retry governance
              </Text>
            </TouchableOpacity>
          ) : null}
          <View style={styles.badgesCardsRow}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressRoles}
              style={[
                styles.badgesStatCard,
                {backgroundColor: t.palette.primary_100},
              ]}>
              <Text style={[styles.badgesStatCount, pal.text]}>
                {governance.moderators.length}
              </Text>
              <Text style={[styles.badgesStatLabel, pal.textLight]}>
                moderators
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressRoles}
              style={[
                styles.badgesStatCard,
                {backgroundColor: t.palette.primary_50},
              ]}>
              <Text style={[styles.badgesStatCount, pal.text]}>
                {governance.officials.length}
              </Text>
              <Text style={[styles.badgesStatLabel, pal.textLight]}>
                official reps
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onPressRoles}
              style={[
                styles.badgesStatCard,
                {backgroundColor: t.palette.contrast_25},
              ]}>
              <Text style={[styles.badgesStatCount, pal.text]}>
                {governance.deputies.length}
              </Text>
              <Text style={[styles.badgesStatLabel, pal.textLight]}>
                deputy roles
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[styles.aboutText, pal.text]}>
          {board?.description ||
            `${plainCommunityName} is a community space for governance, public coordination, and structured participation.`}
        </Text>
        {board?.quadrant ? (
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutLabel, pal.textLight]}>Quadrant:</Text>
            <Text style={[styles.aboutValue, pal.text]}>{board.quadrant}</Text>
          </View>
        ) : null}
        {createdAt ? (
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutLabel, pal.textLight]}>Created:</Text>
            <Text style={[styles.aboutValue, pal.text]}>
              {new Date(createdAt).toLocaleDateString()}
            </Text>
          </View>
        ) : null}
        {typeof board?.memberCount === 'number' ? (
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutLabel, pal.textLight]}>Members:</Text>
            <Text style={[styles.aboutValue, pal.text]}>
              {board.memberCount}
            </Text>
          </View>
        ) : null}
        <View style={styles.aboutInfo}>
          <Text style={[styles.aboutLabel, pal.textLight]}>Moderators:</Text>
          <Text style={[styles.aboutValue, pal.text]}>
            {governance.moderators.length
              ? governance.moderators
                  .map(
                    member => member.displayName || member.handle || member.did,
                  )
                  .join(', ')
              : 'Not published yet'}
          </Text>
        </View>

        {/* Parent Communities */}
        {board?.parentCommunityUris && board.parentCommunityUris.length > 0 ? (
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutLabel, pal.textLight]}>
              <Trans>Parent communities:</Trans>
            </Text>
            <View style={{flex: 1, flexDirection: 'row', flexWrap: 'wrap'}}>
              {board.parentCommunityUris.map(uri => (
                <CommunityUriChip key={uri} communityUri={uri} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Child Communities */}
        {typeof board?.childCommunityCount === 'number' &&
        board.childCommunityCount > 0 ? (
          <View style={styles.aboutInfo}>
            <Text style={[styles.aboutLabel, pal.textLight]}>
              <Trans>Child communities:</Trans>
            </Text>
            <View style={{flex: 1}}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={_(msg`View child communities`)}
                accessibilityHint={_(msg`Expands or collapses the list of child communities`)}
                onPress={() => setShowChildren(v => !v)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: t.palette.contrast_100 + '40',
                }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: t.palette.primary_600,
                  }}>
                  {board.childCommunityCount}{' '}
                  {board.childCommunityCount === 1
                    ? _(msg`child community`)
                    : _(msg`child communities`)}{' '}
                  {showChildren ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              {showChildren && (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginTop: 8,
                  }}>
                  {relationsLoading ? (
                    <Text style={[styles.aboutHelperText, pal.textLight]}>
                      <Trans>Loading...</Trans>
                    </Text>
                  ) : (
                    relationsData?.relations.map(relation => (
                      <CommunityUriChip
                        key={relation.uri}
                        communityUri={relation.childCommunityUri}
                      />
                    ))
                  )}
                </View>
              )}
            </View>
          </View>
        ) : null}

        {board ? (
          <View
            style={[
              styles.sectionCard,
              pal.border,
              t.atoms.bg,
              {backgroundColor: t.atoms.bg.backgroundColor},
            ]}>
            <Text style={[styles.sectionCardTitle, pal.text]}>
              Governance Setup
            </Text>
            <Text
              style={[
                styles.aboutHelperText,
                pal.textLight,
                {marginBottom: 8},
              ]}>
              Delegate and subdelegate chats exist as linked governance
              resources for this community.
            </Text>
            <View style={styles.aboutInfo}>
              <Text style={[styles.aboutLabel, pal.textLight]}>
                Delegates chat:
              </Text>
              <Text style={[styles.aboutValue, pal.text]}>
                {board.delegatesChatId}
              </Text>
            </View>
            <View style={styles.aboutInfo}>
              <Text style={[styles.aboutLabel, pal.textLight]}>
                Subdelegates chat:
              </Text>
              <Text style={[styles.aboutValue, pal.text]}>
                {board.subdelegatesChatId}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.rulesCard,
          pal.border,
          t.atoms.bg,
          {backgroundColor: t.atoms.bg.backgroundColor},
        ]}>
        <Text style={[styles.rulesTitle, pal.text]}>
          <Trans>Community Rules</Trans>
        </Text>
        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleItem}>
            <View
              style={[
                styles.ruleNumber,
                {backgroundColor: t.palette.primary_500},
              ]}>
              <Text style={styles.ruleNumberText}>{index + 1}</Text>
            </View>
            <Text style={[styles.ruleText, pal.text]}>{rule}</Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.sectionCard,
          pal.border,
          t.atoms.bg,
          {backgroundColor: t.atoms.bg.backgroundColor},
        ]}>
        <Text style={[styles.sectionCardTitle, pal.text]}>
          <Trans>Policy Results</Trans>
        </Text>

        <View style={styles.policyTreeItem}>
          <View style={styles.policyTreeHeader}>
            <Text style={[styles.policyTreeTitle, pal.text]}>
              <Trans>Answered by voters</Trans>
            </Text>
          </View>

          {/* Results Table */}
          <View style={styles.resultsSection}>
            <TableContent pal={pal} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.expandCard,
          pal.border,
          t.atoms.bg,
          {backgroundColor: t.atoms.bg.backgroundColor},
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open Community Civic Tree"
        accessibilityHint="Opens the public tree of arguments, evidence, proposals, votes, and references for this community"
        onPress={() => {
          navigation.navigate('DeliberationGraph', {
            communityUri: board?.uri || undefined,
            communityName: board?.name || resolvedCommunityName,
          })
        }}>
        <View style={styles.expandCardContent}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
            <TreeIcon size="lg" style={pal.text} />
            <Text style={[styles.expandCardTitle, pal.text, {marginBottom: 0}]}>
              {CIVIC_TREE_LABELS.community}
            </Text>
          </View>
          <Text style={[styles.expandCardSubtitle, pal.textLight]}>
            {CIVIC_TREE_COPY.communityPublic}
          </Text>
        </View>
        <Text style={[styles.expandIcon, pal.text]}>⌄</Text>
      </TouchableOpacity>
    </View>
  )
}
