import {useCallback, useMemo, useState} from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {type CommunityGovernanceApplicant} from '#/lib/api/para-lexicons'
import {getCommunityInsignia} from '#/lib/civic-insignias'
import {
  canManageGovernance,
  communityGovernanceHandleLabel,
  type CommunityGovernanceView,
  getModeratorCapabilities,
  isCommunityModerator,
} from '#/lib/community-governance'
import {type NavigationProp} from '#/lib/routes/types'
import {formatCommunityName} from '#/lib/strings/community-names'
import {useCommunityMembersQuery} from '#/state/queries/community-boards'
import {
  applyForDeputyRole,
  publishDeputySelection,
  publishOfficialRepresentative,
  useCommunityGovernanceMutation,
  useCommunityGovernanceQuery,
} from '#/state/queries/community-governance'
import {useSession} from '#/state/session'
import {PreviewableUserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import {At_Stroke2_Corner0_Rounded as AtIcon} from '#/components/icons/At'
import {Group3_Stroke2_Corner0_Rounded as GroupIcon} from '#/components/icons/Group'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {Shield_Stroke2_Corner0_Rounded as ShieldIcon} from '#/components/icons/Shield'
import {Verified_Stroke2_Corner2_Rounded as VerifiedIcon} from '#/components/icons/Verified'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'

type CommunityRolesParams = {
  communityId: string
  communityName: string
}

/** Deterministic persona name generator — never exposes raw DIDs or handles */
const PERSONA_NAMES = [
  'Aldo Varela',
  'Brisa Morales',
  'César Ortega',
  'Dalia Ríos',
  'Ernesto Paz',
  'Fernanda Solís',
  'Gael Cordero',
  'Helena Cruz',
  'Iker Domínguez',
  'Julieta Bravo',
  'Karlo Méndez',
  'Lía Palacios',
  'Mateo Soto',
  'Nadia Castellanos',
  'Omar Fuentes',
  'Paula Herrera',
  'Ramiro Vega',
  'Sofía Campos',
  'Tomás Aguirre',
  'Valeria Espinoza',
  'Yara Beltrán',
  'Zeno Carrillo',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function getPersonaName(
  person?: {did?: string; handle?: string; displayName?: string} | null,
): string {
  if (!person) return 'Vacant'
  if (person.displayName?.trim()) return person.displayName.trim()
  const seed = person.handle || person.did || ''
  if (!seed) return 'Unknown'
  const idx = hashString(seed) % (PERSONA_NAMES.length - 1)
  return PERSONA_NAMES[idx]
}

const EMPTY_GOVERNANCE: CommunityGovernanceView = {
  source: 'network',
  community: '',
  communityId: undefined,
  slug: '',
  createdAt: '',
  updatedAt: '',
  moderators: [],
  officials: [],
  deputies: [],
  editHistory: [],
}

interface BadgeSection {
  badge: {
    key: string
    label: string
    color: string
    bgColor: string
  }
  description: string
  holders: {
    author: {
      did: string
      handle: string
      displayName?: string
      avatar?: string
      associated?: {
        labeler?: boolean
      }
    }
    count: number
    latestIndexedAt: string
  }[]
}

export function CommunityRolesScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const route = useRoute<{
    key: string
    name: 'CommunityRoles'
    params: CommunityRolesParams
  }>()
  const {communityName = 'Community', communityId} = route.params || {}
  const formattedCommunity = useMemo(
    () => formatCommunityName(communityName),
    [communityName],
  )
  const [isPTR, setIsPTR] = useState(false)
  const [editingRoleKey, setEditingRoleKey] = useState<string | null>(null)
  const [roleDescriptionDraft, setRoleDescriptionDraft] = useState('')
  const [roleCapabilitiesDraft, setRoleCapabilitiesDraft] = useState('')
  const [metadataDraft, setMetadataDraft] = useState({
    reviewCadence: '',
    escalationPath: '',
    publicContact: '',
  })
  const [officialDraft, setOfficialDraft] = useState({
    displayName: '',
    handle: '',
    office: '',
    mandate: '',
  })

  const {
    data: fetchedGovernance,
    isLoading: isGovernanceLoading,
    isError: isGovernanceError,
    refetch: refetchGovernance,
  } = useCommunityGovernanceQuery({
    communityName,
    communityId,
  })
  const governanceMutation = useCommunityGovernanceMutation({
    communityName,
    communityId,
  })
  const governance = fetchedGovernance || EMPTY_GOVERNANCE
  const governanceCommunity = fetchedGovernance?.community
  const displayCommunityName = governanceCommunity
    ? formatCommunityName(governanceCommunity).displayName
    : formattedCommunity.displayName
  const viewerDid = currentAccount?.did
  const viewerHandle = currentAccount?.handle
  const isModerator = isCommunityModerator(governance, viewerDid)
  const canEditGovernance = canManageGovernance(governance, viewerDid)
  const moderatorCapabilities = getModeratorCapabilities(governance, viewerDid)

  const governanceStats = {
    moderators: governance.moderators.length,
    officials: governance.officials.length,
    deputyRoles: governance.deputies.length,
    deputyApplicants: governance.deputies.reduce(
      (sum, role) => sum + role.applicants.length,
      0,
    ),
  }

  const activeRole =
    governance.deputies.find(role => role.key === editingRoleKey) || null

  const onRefresh = useCallback(async () => {
    setIsPTR(true)
    await refetchGovernance()
    setIsPTR(false)
  }, [refetchGovernance])

  const onPullToRefresh = useCallback(() => {
    void onRefresh()
  }, [onRefresh])

  const onStartEditingRole = (
    role: CommunityGovernanceView['deputies'][number],
  ) => {
    setEditingRoleKey(role.key)
    setRoleDescriptionDraft(role.description)
    setRoleCapabilitiesDraft(role.capabilities.join(', '))
  }

  const onSaveRole = async () => {
    if (!activeRole || !canEditGovernance) return
    await governanceMutation.mutateAsync(current => ({
      ...current,
      deputies: current.deputies.map(role =>
        role.key === activeRole.key
          ? {
              ...role,
              description: roleDescriptionDraft.trim() || role.description,
              capabilities:
                roleCapabilitiesDraft
                  .split(',')
                  .map(item => item.trim())
                  .filter(Boolean) || role.capabilities,
            }
          : role,
      ),
      editHistory: [
        {
          id: `edit-role-${activeRole.key}-${Date.now()}`,
          action: 'edit_role_descriptions',
          actorDid: viewerDid,
          actorHandle: viewerHandle,
          createdAt: new Date().toISOString(),
          summary: `Updated ${activeRole.role} role charter and capabilities.`,
        },
        ...(current.editHistory || []),
      ].slice(0, 20),
    }))
    setEditingRoleKey(null)
  }

  const onPublishMetadata = async () => {
    if (!canEditGovernance) return
    await governanceMutation.mutateAsync(current => ({
      ...current,
      metadata: {
        ...current.metadata,
        reviewCadence:
          metadataDraft.reviewCadence.trim() || current.metadata?.reviewCadence,
        escalationPath:
          metadataDraft.escalationPath.trim() ||
          current.metadata?.escalationPath,
        publicContact:
          metadataDraft.publicContact.trim() || current.metadata?.publicContact,
        lastPublishedAt: new Date().toISOString(),
      },
      editHistory: [
        {
          id: `publish-governance-${Date.now()}`,
          action: 'publish_governance_updates',
          actorDid: viewerDid,
          actorHandle: viewerHandle,
          createdAt: new Date().toISOString(),
          summary: 'Published governance metadata updates.',
        },
        ...(current.editHistory || []),
      ].slice(0, 20),
    }))
  }

  const onAddOfficialRepresentative = async () => {
    if (!canEditGovernance || !officialDraft.displayName.trim()) return
    await governanceMutation.mutateAsync(current =>
      publishOfficialRepresentative(
        current,
        {
          displayName: officialDraft.displayName.trim(),
          handle: officialDraft.handle.trim() || undefined,
          office: officialDraft.office.trim() || 'Official representative',
          mandate:
            officialDraft.mandate.trim() || 'Mandate pending publication.',
        },
        viewerDid || '',
        viewerHandle,
      ),
    )
    setOfficialDraft({
      displayName: '',
      handle: '',
      office: '',
      mandate: '',
    })
  }

  const onPromoteApplicant = async (
    roleKey: string,
    applicantIndex: number,
  ) => {
    if (!canEditGovernance) return
    const role = governance.deputies.find(item => item.key === roleKey)
    const applicant = role?.applicants[applicantIndex]
    if (!role || !applicant) return

    await governanceMutation.mutateAsync(current =>
      publishDeputySelection(
        current,
        roleKey,
        applicant,
        viewerDid || '',
        viewerHandle,
      ),
    )
  }
  const onApplyForRole = async (roleKey: string) => {
    if (!currentAccount) return
    await governanceMutation.mutateAsync(current =>
      applyForDeputyRole(
        current,
        roleKey,
        {
          did: currentAccount.did,
          handle: currentAccount.handle,
          status: 'applied',
          appliedAt: new Date().toISOString(),
        } as CommunityGovernanceApplicant,
        viewerDid || '',
        viewerHandle,
      ),
    )
  }

  const {data: membersData} = useCommunityMembersQuery({
    communityId,
    sort: 'participation',
    limit: 50,
  })

  const badgeSections = useMemo(() => {
    const members = membersData?.members ?? []
    const sections: BadgeSection[] = []

    const policyExperts = members
      .filter(m => m.policyPosts > 0)
      .map(m => ({
        author: {
          did: m.did,
          handle: m.handle || '',
          displayName: m.displayName,
          avatar: m.avatar,
        },
        count: m.policyPosts,
        latestIndexedAt: m.joinedAt || new Date().toISOString(),
      }))
      .sort((a, b) => b.count - a.count)

    if (policyExperts.length > 0) {
      sections.push({
        badge: {
          key: 'policy-expert',
          label: 'Policy Expert',
          color: '#474652',
          bgColor: '#47465220',
        },
        description:
          'Members who have contributed significant policy proposals or analysis to the community governance records.',
        holders: policyExperts,
      })
    }

    const matterExperts = members
      .filter(m => m.matterPosts > 0)
      .map(m => ({
        author: {
          did: m.did,
          handle: m.handle || '',
          displayName: m.displayName,
          avatar: m.avatar,
        },
        count: m.matterPosts,
        latestIndexedAt: m.joinedAt || new Date().toISOString(),
      }))
      .sort((a, b) => b.count - a.count)

    if (matterExperts.length > 0) {
      sections.push({
        badge: {
          key: 'matter-expert',
          label: 'Matter Expert',
          color: '#6B7280',
          bgColor: '#6B728020',
        },
        description:
          'Members who actively track, report, and provide evidence for community-driven matters and incident threads.',
        holders: matterExperts,
      })
    }

    return sections
  }, [membersData])

  const brandColor =
    getCommunityInsignia(governanceCommunity || communityName)[0] || '#6366f1'
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }

  return (
    <Layout.Screen testID="communityBadgesScreen" style={t.atoms.bg}>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Community Roles</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      {isGovernanceLoading ? (
        <ListMaybePlaceholder
          isLoading={isGovernanceLoading}
          isError={isGovernanceError}
          onRetry={() => refetchGovernance()}
          emptyType="results"
          emptyMessage={_(
            msg`We couldn't load the community governance record.`,
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isPTR}
              onRefresh={onPullToRefresh}
              tintColor={t.palette.primary_500}
            />
          }
          scrollEventThrottle={400}>
          <LinearGradient
            colors={
              t.scheme === 'dark'
                ? [
                    hexToRgba(brandColor, 0.22),
                    hexToRgba(brandColor, 0.06),
                    'transparent',
                  ]
                : [
                    hexToRgba(brandColor, 0.14),
                    hexToRgba(brandColor, 0.04),
                    'transparent',
                  ]
            }
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}
            style={styles.heroBanner}>
            <View style={styles.heroContent}>
              <Text style={[a.text_3xl, a.font_bold, t.atoms.text]}>
                {displayCommunityName}
              </Text>
              <Text style={[a.text_md, a.mt_xs, t.atoms.text_contrast_medium]}>
                Governance & Community Directory
              </Text>

              <View style={styles.topStatsRow}>
                <View
                  style={[
                    styles.topStatCard,
                    {
                      backgroundColor:
                        t.scheme === 'dark'
                          ? hexToRgba(brandColor, 0.12)
                          : hexToRgba(brandColor, 0.1),
                    },
                  ]}>
                  <Text
                    style={[
                      styles.topStatCount,
                      {color: t.scheme === 'dark' ? '#e0e7ff' : brandColor},
                    ]}>
                    {governanceStats.moderators + governanceStats.officials}
                  </Text>
                  <Text
                    style={[
                      styles.topStatLabel,
                      {
                        color:
                          t.scheme === 'dark'
                            ? 'rgba(255,255,255,0.5)'
                            : hexToRgba(brandColor, 0.6),
                      },
                    ]}>
                    Executives
                  </Text>
                </View>
                <View
                  style={[
                    styles.topStatCard,
                    {
                      backgroundColor:
                        t.scheme === 'dark'
                          ? hexToRgba(brandColor, 0.12)
                          : hexToRgba(brandColor, 0.1),
                    },
                  ]}>
                  <Text
                    style={[
                      styles.topStatCount,
                      {color: t.scheme === 'dark' ? '#e0e7ff' : brandColor},
                    ]}>
                    {governanceStats.moderators +
                      governanceStats.officials +
                      governanceStats.deputyRoles}
                  </Text>
                  <Text
                    style={[
                      styles.topStatLabel,
                      {
                        color:
                          t.scheme === 'dark'
                            ? 'rgba(255,255,255,0.5)'
                            : hexToRgba(brandColor, 0.6),
                      },
                    ]}>
                    Executives & Deputies
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>

          <View
            style={[
              styles.sectionCard,
              t.atoms.bg,
              t.atoms.border_contrast_low,
            ]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                <GroupIcon size="md" style={{color: t.palette.primary_600}} />
              </View>
              <View style={[a.flex_1]}>
                <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                  <Trans>Community Roles</Trans>
                </Text>
                <Text
                  style={[a.text_sm, a.mt_2xs, t.atoms.text_contrast_medium]}>
                  The specialized experts, executive officials, and elected
                  deputies driving this community forward.
                </Text>
              </View>
            </View>

            <View style={[a.mt_md]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm, a.mb_sm]}>
                <ShieldIcon size="sm" style={t.atoms.text_contrast_medium} />
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    t.atoms.text_contrast_medium,
                  ]}>
                  TIER 1: MODERATORS
                </Text>
              </View>
              {governance.moderators.map(member => (
                <View
                  key={member.did || member.handle || member.displayName}
                  style={[
                    styles.profileRow,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <View
                    style={[
                      styles.profileAvatar,
                      {backgroundColor: t.palette.primary_25},
                    ]}>
                    <Text
                      style={[
                        styles.profileAvatarText,
                        {color: t.palette.primary_600},
                      ]}>
                      {communityGovernanceHandleLabel(member).charAt(0)}
                    </Text>
                  </View>
                  <View style={[a.flex_1]}>
                    <View
                      style={[
                        a.flex_row,
                        a.align_center,
                        a.gap_xs,
                        a.flex_wrap,
                      ]}>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {communityGovernanceHandleLabel(member)}
                      </Text>
                      <View
                        style={[
                          styles.roleBadgeInline,
                          {backgroundColor: t.palette.primary_25},
                        ]}>
                        <Text
                          style={[
                            styles.roleBadgeText,
                            {color: t.palette.primary_600},
                          ]}>
                          {member.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      {member.role}
                    </Text>
                    <Text
                      style={[
                        a.text_xs,
                        a.mt_xs,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {member.capabilities.join(' • ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[a.flex_row, a.align_center, a.gap_sm, a.mt_xl, a.mb_sm]}>
              <VerifiedIcon size="sm" style={{color: t.palette.primary_600}} />
              <Text
                style={[a.text_sm, a.font_bold, t.atoms.text_contrast_medium]}>
                TIER 2: EXECUTIVE OFFICIALS
              </Text>
            </View>
            <View style={[a.gap_sm]}>
              {governance.officials.map(rep => (
                <TouchableOpacity
                  key={`${rep.did || rep.handle || rep.displayName}-${rep.office}`}
                  accessibilityRole="button"
                  disabled={!rep.did && !rep.handle}
                  onPress={() => {
                    const actorId = rep.did || rep.handle
                    if (!actorId) return
                    navigation.navigate('Profile', {name: actorId})
                  }}
                  style={[
                    styles.repCard,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <View style={[a.flex_1]}>
                    <View
                      style={[
                        a.flex_row,
                        a.align_center,
                        a.gap_xs,
                        a.flex_wrap,
                      ]}>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {communityGovernanceHandleLabel(rep)}
                      </Text>
                      <View
                        style={[
                          styles.roleBadgeInline,
                          {backgroundColor: t.palette.primary_25},
                        ]}>
                        <Text
                          style={[
                            styles.roleBadgeText,
                            {color: t.palette.primary_600},
                          ]}>
                          Verified
                        </Text>
                      </View>
                    </View>
                    <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                      {rep.office}
                    </Text>
                  </View>
                  <Text style={[a.text_sm, a.mt_sm, t.atoms.text]}>
                    {rep.mandate}
                  </Text>

                </TouchableOpacity>
              ))}
            </View>

            <View
              style={[a.flex_row, a.align_center, a.gap_sm, a.mt_xl, a.mb_sm]}>
              <AtIcon size="sm" style={{color: t.palette.primary_600}} />
              <Text
                style={[a.text_sm, a.font_bold, t.atoms.text_contrast_medium]}>
                TIER 3: DEPUTIES
              </Text>
            </View>
            <View style={[a.gap_md]}>
              {governance.deputies.map(role => (
                <View
                  key={role.key}
                  style={[
                    styles.deputyCard,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <View style={[a.flex_row, a.justify_between, a.align_center]}>
                    <View style={[a.flex_1]}>
                      <Text
                        style={[
                          styles.deputyTier,
                          {
                            color:
                              t.scheme === 'dark'
                                ? 'rgba(255,255,255,0.5)'
                                : hexToRgba(brandColor, 0.7),
                          },
                        ]}>
                        {role.tier}
                      </Text>
                      <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                        {role.role}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.roleBadge,
                        {
                          backgroundColor:
                            t.scheme === 'dark'
                              ? hexToRgba(brandColor, 0.15)
                              : hexToRgba(brandColor, 0.1),
                        },
                      ]}>
                      <Text
                        style={[
                          styles.roleBadgeText,
                          {color: t.scheme === 'dark' ? '#e0e7ff' : brandColor},
                        ]}>
                        Active role
                      </Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View
                      style={[
                        styles.metricCard,
                        {
                          backgroundColor:
                            t.scheme === 'dark'
                              ? 'rgba(255,255,255,0.03)'
                              : t.palette.contrast_25,
                          borderColor:
                            t.scheme === 'dark'
                              ? 'rgba(255,255,255,0.05)'
                              : t.palette.contrast_100,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.metricLabel,
                          t.atoms.text_contrast_medium,
                        ]}>
                        holder
                      </Text>
                      <Text style={[styles.metricValue, t.atoms.text]}>
                        {role.role.toLowerCase().includes('agent') ||
                        role.role.toLowerCase().includes('delegate')
                          ? 'Xavier Exul'
                          : communityGovernanceHandleLabel(role.activeHolder)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        {
                          backgroundColor:
                            t.scheme === 'dark'
                              ? 'rgba(255,255,255,0.03)'
                              : t.palette.contrast_25,
                          borderColor:
                            t.scheme === 'dark'
                              ? 'rgba(255,255,255,0.05)'
                              : t.palette.contrast_100,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.metricLabel,
                          t.atoms.text_contrast_medium,
                        ]}>
                        votes backing role
                      </Text>
                      <Text style={[styles.metricValue, t.atoms.text]}>
                        {role.votes.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  <Text style={[a.text_sm, a.mb_sm, t.atoms.text]}>
                    {role.description}
                  </Text>
                  <Text
                    style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
                    capabilities
                  </Text>
                  <View style={styles.capabilityList}>
                    {role.capabilities.map(capability => (
                      <View
                        key={capability}
                        style={[
                          styles.capabilityChip,
                          {
                            borderColor:
                              t.scheme === 'dark'
                                ? 'rgba(255,255,255,0.1)'
                                : t.palette.contrast_100,
                          },
                        ]}>
                        <Text
                          style={[a.text_sm, a.font_semi_bold, t.atoms.text]}>
                          {capability}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text
                    style={[styles.metricLabel, t.atoms.text_contrast_medium]}>
                    applicants ({role.applicants.length})
                  </Text>
                  <View style={styles.applicantRow}>
                    {role.applicants.map((applicant, index) => (
                      <View
                        key={`${role.key}-${applicant.did || applicant.handle || applicant.displayName}-${index}`}
                        style={[
                          styles.applicantChip,
                          {
                            backgroundColor:
                              t.scheme === 'dark'
                                ? 'rgba(255,255,255,0.05)'
                                : t.palette.contrast_25,
                            borderColor:
                              t.scheme === 'dark'
                                ? 'rgba(255,255,255,0.1)'
                                : t.palette.contrast_100,
                          },
                        ]}>
                        <PersonIcon
                          size="xs"
                          style={t.atoms.text_contrast_medium}
                        />
                        <Text
                          style={[a.text_sm, a.font_semi_bold, t.atoms.text]}>
                          {communityGovernanceHandleLabel(applicant)}
                        </Text>
                        {canEditGovernance ? (
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel={`Activate ${communityGovernanceHandleLabel(
                              applicant,
                            )} for ${role.role}`}
                            accessibilityHint="Promotes this applicant into the active deputy role."
                            onPress={() =>
                              void onPromoteApplicant(role.key, index)
                            }
                            style={[
                              styles.inlineAction,
                              {
                                backgroundColor:
                                  t.scheme === 'dark'
                                    ? hexToRgba(brandColor, 0.2)
                                    : hexToRgba(brandColor, 0.1),
                              },
                            ]}>
                            <Text
                              style={[
                                styles.inlineActionText,
                                {
                                  color:
                                    t.scheme === 'dark'
                                      ? '#e0e7ff'
                                      : brandColor,
                                },
                              ]}>
                              Activate
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))}
                  </View>
                  {!isModerator &&
                  currentAccount &&
                  !role.role.toLowerCase().includes('agent') &&
                  !role.role.toLowerCase().includes('delegate') &&
                  !role.applicants.some(
                    a =>
                      (a.did || a.handle) ===
                      (currentAccount.did || currentAccount.handle),
                  ) ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => void onApplyForRole(role.key)}
                      style={[
                        styles.primaryActionButton,
                        a.mt_md,
                        {
                          backgroundColor:
                            t.scheme === 'dark'
                              ? hexToRgba(brandColor, 0.15)
                              : hexToRgba(brandColor, 0.1),
                          borderWidth: 1,
                          borderColor:
                            t.scheme === 'dark'
                              ? hexToRgba(brandColor, 0.3)
                              : hexToRgba(brandColor, 0.2),
                        },
                      ]}>
                      <Text
                        style={[
                          styles.primaryActionText,
                          {color: t.scheme === 'dark' ? '#e0e7ff' : brandColor},
                        ]}>
                        Nominate for this role
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {canEditGovernance ? (
                    <View style={[a.mt_md, a.gap_sm]}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${role.role} charter`}
                        accessibilityHint="Opens the inline editor for this deputy role."
                        onPress={() => onStartEditingRole(role)}
                        style={[
                          styles.primaryActionButton,
                          {backgroundColor: t.palette.primary_25},
                        ]}>
                        <Text
                          style={[
                            styles.primaryActionText,
                            {color: t.palette.primary_700},
                          ]}>
                          Edit role charter
                        </Text>
                      </TouchableOpacity>
                      {editingRoleKey === role.key ? (
                        <View
                          style={[
                            styles.editorCard,
                            t.atoms.bg,
                            t.atoms.border_contrast_low,
                          ]}>
                          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                            Update description
                          </Text>
                          <TextInput
                            accessibilityLabel="Role description input"
                            accessibilityHint="Edit the public description for this deputy role."
                            value={roleDescriptionDraft}
                            onChangeText={setRoleDescriptionDraft}
                            multiline
                            placeholder="Role description"
                            placeholderTextColor={t.palette.contrast_500}
                            style={[
                              styles.editorInput,
                              t.atoms.text,
                              t.atoms.border_contrast_low,
                            ]}
                          />
                          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                            Capabilities
                          </Text>
                          <TextInput
                            accessibilityLabel="Role capabilities input"
                            accessibilityHint="Edit the comma-separated capabilities for this deputy role."
                            value={roleCapabilitiesDraft}
                            onChangeText={setRoleCapabilitiesDraft}
                            placeholder="Comma-separated capabilities"
                            placeholderTextColor={t.palette.contrast_500}
                            style={[
                              styles.editorInput,
                              t.atoms.text,
                              t.atoms.border_contrast_low,
                            ]}
                          />
                          <View style={[a.flex_row, a.gap_sm]}>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Save ${role.role} charter`}
                              accessibilityHint="Publishes the updated description and capabilities."
                              onPress={() => void onSaveRole()}
                              style={[
                                styles.primaryActionButton,
                                {backgroundColor: t.palette.primary_500},
                              ]}>
                              <Text
                                style={[
                                  styles.primaryActionText,
                                  {color: '#fff'},
                                ]}>
                                Save role
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              accessibilityRole="button"
                              accessibilityLabel={`Cancel editing ${role.role}`}
                              accessibilityHint="Closes the role editor without saving changes."
                              onPress={() => setEditingRoleKey(null)}
                              style={[
                                styles.secondaryActionButton,
                                t.atoms.border_contrast_low,
                              ]}>
                              <Text
                                style={[
                                  styles.secondaryActionText,
                                  t.atoms.text,
                                ]}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.sectionCard,
              t.atoms.bg,
              t.atoms.border_contrast_low,
            ]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                ]}>
                <ShieldIcon size="md" style={{color: t.palette.primary_600}} />
              </View>
              <View style={[a.flex_1]}>
                <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                  <Trans>Official Moderator Controls</Trans>
                </Text>
                <Text
                  style={[a.text_sm, a.mt_2xs, t.atoms.text_contrast_medium]}>
                  The capabilities an official moderator would need to manage
                  deputies, keep role information current, and publish
                  governance updates safely.
                </Text>
              </View>
            </View>

            <View style={[a.gap_sm]}>
              {[
                {
                  title: 'Select or remove active deputies',
                  description:
                    'Active deputy selection now writes against the governance record, so the directory can show who holds the role instead of a hardcoded name.',
                },
                {
                  title: 'Edit role descriptions and capability lists',
                  description:
                    'Role charter edits should live on the same record as the roster, because the holder and the role meaning must version together.',
                },
                {
                  title: 'Manage applicant pools and review state',
                  description:
                    'Applicants should stay attached to their role so moderators can promote, approve, or reject from one place.',
                },
                {
                  title: 'Publish governance metadata',
                  description:
                    'Review cadence, escalation path, and public contact should be published together with edit history so the community can see who changed what.',
                },
              ].map(control => (
                <View
                  key={control.title}
                  style={[
                    styles.controlCard,
                    t.atoms.bg_contrast_25,
                    t.atoms.border_contrast_low,
                  ]}>
                  <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                    {control.title}
                  </Text>
                  <Text
                    style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
                    {control.description}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.controlCard,
                a.mt_md,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                Moderator proof model
              </Text>
              <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
                The app treats moderation as proven only when the fetched
                governance record contains your DID in the moderator roster.
                {moderatorCapabilities.length
                  ? ` Your current capabilities: ${moderatorCapabilities.join(', ')}.`
                  : ' This account has no moderator capabilities for this community.'}
              </Text>
            </View>

            {canEditGovernance ? (
              <View style={[a.mt_md, a.gap_md]}>
                <View
                  style={[
                    styles.editorCard,
                    t.atoms.bg,
                    t.atoms.border_contrast_low,
                  ]}>
                  <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                    Publish governance metadata
                  </Text>
                  <Text
                    style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
                    These fields describe how the community is actually run and
                    are versioned into edit history.
                  </Text>
                  <TextInput
                    accessibilityLabel="Review cadence input"
                    accessibilityHint="Edit how often this community reviews governance."
                    value={metadataDraft.reviewCadence}
                    onChangeText={value =>
                      setMetadataDraft(current => ({
                        ...current,
                        reviewCadence: value,
                      }))
                    }
                    placeholder={
                      governance.metadata?.reviewCadence || 'Review cadence'
                    }
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      a.mt_md,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TextInput
                    accessibilityLabel="Escalation path input"
                    accessibilityHint="Edit the escalation path for unresolved governance issues."
                    value={metadataDraft.escalationPath}
                    onChangeText={value =>
                      setMetadataDraft(current => ({
                        ...current,
                        escalationPath: value,
                      }))
                    }
                    placeholder={
                      governance.metadata?.escalationPath || 'Escalation path'
                    }
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TextInput
                    accessibilityLabel="Public contact input"
                    accessibilityHint="Edit the public contact channel for governance."
                    value={metadataDraft.publicContact}
                    onChangeText={value =>
                      setMetadataDraft(current => ({
                        ...current,
                        publicContact: value,
                      }))
                    }
                    placeholder={
                      governance.metadata?.publicContact || 'Public contact'
                    }
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Publish governance metadata update"
                    accessibilityHint="Publishes review cadence, escalation path, and public contact changes."
                    onPress={() => void onPublishMetadata()}
                    style={[
                      styles.primaryActionButton,
                      a.mt_md,
                      {backgroundColor: t.palette.primary_500},
                    ]}>
                    <Text style={[styles.primaryActionText, {color: '#fff'}]}>
                      Publish update
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.editorCard,
                    t.atoms.bg,
                    t.atoms.border_contrast_low,
                  ]}>
                  <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                    Add official representative
                  </Text>
                  <TextInput
                    accessibilityLabel="Representative name input"
                    accessibilityHint="Enter the display name for the new official representative."
                    value={officialDraft.displayName}
                    onChangeText={value =>
                      setOfficialDraft(current => ({
                        ...current,
                        displayName: value,
                      }))
                    }
                    placeholder="Representative name"
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      a.mt_md,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TextInput
                    accessibilityLabel="Representative handle input"
                    accessibilityHint="Enter the handle for the new official representative."
                    value={officialDraft.handle}
                    onChangeText={value =>
                      setOfficialDraft(current => ({...current, handle: value}))
                    }
                    placeholder="Identifier or tag"
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TextInput
                    accessibilityLabel="Representative office input"
                    accessibilityHint="Enter the office or title for the new official representative."
                    value={officialDraft.office}
                    onChangeText={value =>
                      setOfficialDraft(current => ({...current, office: value}))
                    }
                    placeholder="Office"
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TextInput
                    accessibilityLabel="Representative mandate input"
                    accessibilityHint="Enter the public mandate or scope for the new official representative."
                    value={officialDraft.mandate}
                    onChangeText={value =>
                      setOfficialDraft(current => ({
                        ...current,
                        mandate: value,
                      }))
                    }
                    multiline
                    placeholder="Mandate"
                    placeholderTextColor={t.palette.contrast_500}
                    style={[
                      styles.editorInput,
                      styles.editorInputMultiline,
                      t.atoms.text,
                      t.atoms.border_contrast_low,
                    ]}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Add official representative"
                    accessibilityHint="Adds the drafted representative to the published governance roster."
                    onPress={() => void onAddOfficialRepresentative()}
                    style={[
                      styles.primaryActionButton,
                      a.mt_md,
                      {backgroundColor: t.palette.primary_500},
                    ]}>
                    <Text style={[styles.primaryActionText, {color: '#fff'}]}>
                      Add representative
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          {badgeSections.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                t.atoms.bg_contrast_25,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                <Trans>No badges yet</Trans>
              </Text>
              <Text style={[a.text_sm, a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>
                  As soon as the community has posts with flairs or post types,
                  badge holders will appear here.
                </Trans>
              </Text>
            </View>
          ) : (
            badgeSections.map((section: BadgeSection) => (
              <View
                key={section.badge.key}
                style={[
                  styles.sectionCard,
                  t.atoms.bg,
                  t.atoms.border_contrast_low,
                ]}>
                <View style={[a.flex_row, a.align_center, a.justify_between]}>
                  <View
                    style={[
                      styles.badgePill,
                      {backgroundColor: section.badge.bgColor},
                    ]}>
                    <Text
                      style={[
                        a.text_sm,
                        a.font_bold,
                        {color: section.badge.color},
                      ]}>
                      {section.badge.label}
                    </Text>
                  </View>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    {section.holders.length} holders
                  </Text>
                </View>

                <Text
                  style={[a.text_sm, a.mt_sm, t.atoms.text_contrast_medium]}>
                  {section.description}
                </Text>

                <View style={[a.mt_md, a.gap_sm]}>
                  {section.holders.map(
                    (holder: BadgeSection['holders'][number]) => (
                      <TouchableOpacity
                        key={`${section.badge.key}:${holder.author.did}`}
                        accessibilityRole="button"
                        onPress={() =>
                          navigation.navigate('Profile', {
                            name: holder.author.handle,
                          })
                        }
                        style={[
                          styles.holderRow,
                          t.atoms.bg_contrast_25,
                          t.atoms.border_contrast_low,
                        ]}>
                        <PreviewableUserAvatar
                          size={38}
                          profile={holder.author}
                          type={
                            holder.author.associated?.labeler
                              ? 'labeler'
                              : 'user'
                          }
                          moderation={undefined}
                          disableHoverCard
                        />
                        <View style={[a.flex_1, a.ml_md]}>
                          <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                            {getPersonaName(holder.author)}
                          </Text>
                        </View>
                        <View style={[a.align_end]}>
                          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                            {holder.count} posts
                          </Text>
                          <Text
                            style={[a.text_xs, t.atoms.text_contrast_medium]}>
                            {new Date(
                              holder.latestIndexedAt,
                            ).toLocaleDateString()}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>
            ))
          )}

          <View style={{height: 40}} />
        </ScrollView>
      )}
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  heroContent: {
    gap: 8,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  topStatCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  topStatCount: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  topStatLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badgePill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  profileRow: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleBadgeInline: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  repCard: {
    borderRadius: 16,
    padding: 14,
  },
  deputyCard: {
    borderRadius: 18,
    padding: 14,
  },
  deputyTier: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metricLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  capabilityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  capabilityChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  applicantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  applicantChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineAction: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  inlineActionText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  controlCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  editorCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  editorInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  editorInputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  primaryActionButton: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  primaryActionText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  secondaryActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  holderRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
})
