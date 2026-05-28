import {type ComponentProps, useEffect, useMemo, useRef, useState} from 'react'
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {useHorizontalGovernanceEnabled} from '#/lib/hooks/useHorizontalGovernance'
import {type NavigationProp} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {useActorAutocompleteQuery} from '#/state/queries/actor-autocomplete'
import {
  useCommunityBoardQuery,
  useCommunityBoardsQuery,
  useCreateCommunityMutation,
} from '#/state/queries/community-boards'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as SegmentedControl from '#/components/forms/SegmentedControl'
import * as Layout from '#/components/Layout'
import {useAnalytics} from '#/analytics'

export function CreateCommunityScreen() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const analytics = useAnalytics()
  const trackedEligibilityRef = useRef(false)
  const trackedSuccessRef = useRef(false)
  const isHorizontalGovernanceEnabled = useHorizontalGovernanceEnabled()

  const [name, setName] = useState('')
  const [quadrant, setQuadrant] = useState('')
  const [description, setDescription] = useState('')
  const [founderStarterPackName, setFounderStarterPackName] = useState('')
  const [governanceMode, setGovernanceMode] = useState<'hierarchical' | 'horizontal'>('hierarchical')
  const [foundingMembersQuery, setFoundingMembersQuery] = useState('')
  const [selectedFoundingMembers, setSelectedFoundingMembers] = useState<
    AppBskyActorDefs.ProfileViewBasic[]
  >([])
  const [parentCommunityUri, setParentCommunityUri] = useState<string>('')
  const [parentSearchQuery, setParentSearchQuery] = useState('')
  const [createdUri, setCreatedUri] = useState<string | undefined>()
  // TODO(mlv): remove feature flag once backend createBoard lexicon accepts parentCommunityUri
  const enableParentCommunityPicker = false
  const mentionQuery = useMemo(
    () => getMentionQuery(foundingMembersQuery),
    [foundingMembersQuery],
  )
  const plannedFounders = 1 + selectedFoundingMembers.length
  const remainingFounders = Math.max(0, 9 - plannedFounders)

  const {data: boardsData} = useCommunityBoardsQuery({limit: 12})
  const {
    data: foundingMemberSuggestions,
    isFetching: isFetchingFoundingMemberSuggestions,
  } = useActorAutocompleteQuery(mentionQuery, true, 6)
  const createMutation = useCreateCommunityMutation()
  const {
    data: createdBoardData,
    isLoading: isHydratingBoard,
    isError: isHydrationError,
    error: hydrationError,
    refetch: refetchBoard,
  } = useCommunityBoardQuery({
    uri: createdUri,
    enabled: Boolean(createdUri),
  })

  const canCreateCommunity = boardsData?.canCreateCommunity ?? true
  const createdBoard = createdBoardData?.board
  const currentError = useMemo(() => {
    return createMutation.error || hydrationError || null
  }, [createMutation.error, hydrationError])
  const filteredFoundingMemberSuggestions = useMemo(() => {
    return (foundingMemberSuggestions || []).filter(profile => {
      return !selectedFoundingMembers.some(
        selected => selected.did === profile.did,
      )
    })
  }, [foundingMemberSuggestions, selectedFoundingMembers])

  useEffect(() => {
    if (trackedEligibilityRef.current || !boardsData) {
      return
    }

    trackedEligibilityRef.current = true
  }, [boardsData])

  useEffect(() => {
    if (!createdBoard || trackedSuccessRef.current) return
    trackedSuccessRef.current = true
    analytics.metric('community:create:submitSucceeded', {})
  }, [analytics, createdBoard])

  const onSubmit = async () => {
    analytics.metric('community:create:submitStarted', {})
    trackedSuccessRef.current = false

    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        quadrant: quadrant.trim(),
        description: description.trim() || undefined,
        founderStarterPackName: founderStarterPackName.trim() || undefined,
        governanceMode: isHorizontalGovernanceEnabled ? governanceMode : undefined,
        parentCommunityUri: parentCommunityUri || undefined,
      })
      setCreatedUri(result.uri)
    } catch {
      analytics.metric('community:create:submitFailed', {})
    }
  }

  const onPressSubmit = () => {
    void onSubmit()
  }

  const onContinue = () => {
    if (!createdBoard) return
    analytics.metric('community:create:wizardCompleted', {})
    navigation.navigate('CommunityProfile', {
      communityId: createdBoard.communityId,
      communityName: createdBoard.name,
    })
  }

  const isSubmitting = createMutation.isPending || isHydratingBoard
  const formDisabled =
    !canCreateCommunity ||
    isSubmitting ||
    name.trim().length === 0 ||
    quadrant.trim().length === 0

  const onSelectFoundingMember = (
    profile: AppBskyActorDefs.ProfileViewBasic,
  ) => {
    setSelectedFoundingMembers(prev => {
      if (prev.some(item => item.did === profile.did)) {
        return prev
      }
      return [...prev, profile]
    })
    setFoundingMembersQuery('')
  }

  const onRemoveFoundingMember = (did: string) => {
    setSelectedFoundingMembers(prev => prev.filter(item => item.did !== did))
  }

  return (
    <Layout.Screen testID="createCommunityScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Create Community</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}>
        <Layout.Center>
          <View style={styles.shell}>
            <View
              style={[
                styles.heroCard,
                {backgroundColor: t.palette.primary_500},
              ]}>
              <Text style={styles.heroEyebrow}>Open creation</Text>
              <Text style={styles.heroTitle}>
                Start a community and unlock it with 9 founding members.
              </Text>
              <Text style={styles.heroBody}>
                This creates the board record in draft, seeds your founder
                membership, publishes initial governance, and links an internal
                starter pack used to reach quorum.
              </Text>
            </View>

            {createdBoard ? (
              <View style={[styles.card, t.atoms.bg, styles.cardSpacing]}>
                <Text style={[styles.cardTitle, t.atoms.text]}>
                  Community created! (Draft Setup)
                </Text>
                <Text style={[styles.cardBody, t.atoms.text_contrast_medium]}>
                  {createdBoard.name} has been drafted. A founding starter pack
                  has been created and you're the first member! You will need to
                  reach a quorum of 9 members to unlock full community access.
                </Text>

                <View style={styles.checklist}>
                  <ChecklistItem
                    theme={t}
                    label={`Board published in nonant ${createdBoard.quadrant}`}
                  />
                  <ChecklistItem
                    theme={t}
                    label={`Creator membership is ${createdBoard.viewerMembershipState}`}
                  />
                  <ChecklistItem
                    theme={t}
                    label={
                      createdBoard.governanceMode === 'horizontal'
                        ? `Horizontal setup seeded with ${createdBoard.governanceSummary?.moderatorCount ?? 1} temporary facilitator${(createdBoard.governanceSummary?.moderatorCount ?? 1) === 1 ? '' : 's'}`
                        : `Governance seeded with ${createdBoard.governanceSummary?.moderatorCount ?? 1} moderator${(createdBoard.governanceSummary?.moderatorCount ?? 1) === 1 ? '' : 's'}`
                    }
                  />
                </View>

                {selectedFoundingMembers.length > 0 ? (
                  <View
                    style={[
                      styles.foundersProgressCard,
                      {backgroundColor: t.palette.primary_25},
                    ]}>
                    <Text style={[styles.foundersProgressTitle, t.atoms.text]}>
                      Founding shortlist ready
                    </Text>
                    <Text
                      style={[
                        styles.foundersProgressBody,
                        t.atoms.text_contrast_medium,
                      ]}>
                      Planned invites:{' '}
                      {selectedFoundingMembers
                        .map(profile => `@${profile.handle}`)
                        .join(', ')}
                    </Text>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.topologyCard,
                    {backgroundColor: t.palette.primary_25},
                  ]}>
                  <Text style={[styles.topologyTitle, t.atoms.text]}>
                    Governance topology
                  </Text>
                  <Text
                    style={[styles.topologyBody, t.atoms.text_contrast_medium]}>
                    Delegate and subdelegate chat resources are linked as
                    administrative infrastructure, not as the main framing of
                    the community.
                  </Text>
                  <Text style={[styles.topologyValue, t.atoms.text]}>
                    Delegates chat: {createdBoard.delegatesChatId}
                  </Text>
                  <Text style={[styles.topologyValue, t.atoms.text]}>
                    Subdelegates chat: {createdBoard.subdelegatesChatId}
                  </Text>
                </View>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onContinue}
                  style={[
                    styles.primaryButton,
                    {backgroundColor: t.palette.primary_500},
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    Continue to community
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, t.atoms.bg, styles.cardSpacing]}>
                <Text style={[styles.cardTitle, t.atoms.text]}>
                  Community basics
                </Text>
                <Text style={[styles.cardBody, t.atoms.text_contrast_medium]}>
                  Start with the public identity of the community. Advanced chat
                  topology, governance details, and the founding starter pack
                  are seeded automatically after creation.
                </Text>

                {!canCreateCommunity ? (
                  <StatusCard
                    theme={t}
                    title="Creation unavailable"
                    body="Community creation should be open, but this client could not confirm capability right now. Please retry in a moment."
                  />
                ) : null}

                <Field
                  theme={t}
                  label="Community name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Nuevo León Water Table"
                  description="Use the public name people will recognize when they receive the draft invite."
                />
                <Field
                  theme={t}
                  label="Nonant"
                  value={quadrant}
                  onChangeText={setQuadrant}
                  placeholder="noreste-agua"
                  autoCapitalize="none"
                  description="Pick the territorial nonant this community belongs to. The backend still stores this in the existing community field."
                />
                <Field
                  theme={t}
                  label="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Short public description for the community directory."
                  multiline
                  numberOfLines={4}
                  description="This appears in the community profile while the community is still in draft."
                />
                <Field
                  theme={t}
                  label="Founder Starter Pack Name (optional)"
                  value={founderStarterPackName}
                  onChangeText={setFounderStarterPackName}
                  placeholder="Founding Members: Nuevo León Water Table"
                  description="This remains internal and is only used to track the founding quorum."
                />

                {isHorizontalGovernanceEnabled ? (
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, t.atoms.text]}>
                      Governance model
                    </Text>
                    <Text
                      style={[
                        styles.fieldDescription,
                        t.atoms.text_contrast_medium,
                      ]}>
                      Hierarchical communities have an owner/moderator
                      structure. Horizontal communities use rotating
                      facilitators and assembly votes.
                    </Text>
                    <Text
                      style={[
                        styles.fieldDescription,
                        t.atoms.text_contrast_medium,
                      ]}>
                      Horizontal role eligibility can be backed by private m8
                      proofs, including joined during founding period and
                      continuous party membership for at least 30 days, without
                      exposing the raw join date.
                    </Text>
                    <SegmentedControl.Root
                      type="radio"
                      label="Governance model"
                      value={governanceMode}
                      onChange={v =>
                        setGovernanceMode(v)
                      }>
                      <SegmentedControl.Item
                        label="Hierarchical"
                        value="hierarchical">
                        <SegmentedControl.ItemText>
                          Hierarchical
                        </SegmentedControl.ItemText>
                      </SegmentedControl.Item>
                      <SegmentedControl.Item
                        label="Horizontal"
                        value="horizontal">
                        <SegmentedControl.ItemText>
                          Horizontal
                        </SegmentedControl.ItemText>
                      </SegmentedControl.Item>
                    </SegmentedControl.Root>
                  </View>
                ) : null}

                {/* Parent Community Picker (feature-flagged) */}
                {enableParentCommunityPicker ? (
                  <ParentCommunityPicker
                    theme={t}
                    boardsData={boardsData}
                    selectedUri={parentCommunityUri}
                    searchQuery={parentSearchQuery}
                    onChangeSearchQuery={setParentSearchQuery}
                    onSelect={setParentCommunityUri}
                    onClear={() => {
                      setParentCommunityUri('')
                      setParentSearchQuery('')
                    }}
                  />
                ) : null}

                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, t.atoms.text]}>
                    Founding members to invite
                  </Text>
                  <Text
                    style={[
                      styles.fieldDescription,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Type `@` and we&apos;ll suggest people to add to your
                    founding shortlist. Founder counts as member 1 of 9.
                  </Text>
                  <TextInput
                    accessibilityLabel="Founding members to invite"
                    accessibilityHint="Type an at-sign followed by a handle to search for people to add to the founding shortlist."
                    value={foundingMembersQuery}
                    onChangeText={setFoundingMembersQuery}
                    placeholder="@mariana, @raul..."
                    placeholderTextColor={t.palette.contrast_400}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      styles.input,
                      {
                        borderColor: t.palette.contrast_100,
                        color: t.atoms.text.color,
                        backgroundColor: t.atoms.bg.backgroundColor,
                      },
                    ]}
                  />

                  <View
                    style={[
                      styles.foundersProgressCard,
                      {backgroundColor: t.palette.primary_25},
                    ]}>
                    <Text style={[styles.foundersProgressTitle, t.atoms.text]}>
                      Founding plan
                    </Text>
                    <Text
                      style={[
                        styles.foundersProgressBody,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {plannedFounders} of 9 planned so far. You still need{' '}
                      {remainingFounders} more people to complete the founding
                      quorum.
                    </Text>
                  </View>

                  {selectedFoundingMembers.length > 0 ? (
                    <View style={styles.selectedFoundersWrap}>
                      {selectedFoundingMembers.map(profile => (
                        <TouchableOpacity
                          key={profile.did}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove @${profile.handle} from founders`}
                          accessibilityHint="Removes this person from the founding shortlist"
                          onPress={() => onRemoveFoundingMember(profile.did)}
                          style={[
                            styles.selectedFounderChip,
                            {
                              backgroundColor: t.palette.primary_50,
                              borderColor: t.palette.primary_200,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.selectedFounderChipText,
                              {color: t.palette.primary_700},
                            ]}>
                            @{profile.handle} ×
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  {mentionQuery ? (
                    <View
                      style={[
                        styles.suggestionsCard,
                        {
                          borderColor: t.palette.contrast_100,
                          backgroundColor: t.atoms.bg.backgroundColor,
                        },
                      ]}>
                      {filteredFoundingMemberSuggestions.map(profile => (
                        <TouchableOpacity
                          key={profile.did}
                          accessibilityRole="button"
                          accessibilityLabel={`Add @${profile.handle} as founder`}
                          accessibilityHint="Adds this person to the founding shortlist"
                          onPress={() => onSelectFoundingMember(profile)}
                          style={styles.suggestionRow}>
                          <View style={styles.suggestionIdentity}>
                            {profile.avatar ? (
                              <Image
                                accessibilityIgnoresInvertColors
                                source={{uri: profile.avatar}}
                                style={styles.suggestionAvatar}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.suggestionAvatarFallback,
                                  {backgroundColor: t.palette.primary_100},
                                ]}>
                                <Text
                                  style={[
                                    styles.suggestionAvatarFallbackText,
                                    {color: t.palette.primary_700},
                                  ]}>
                                  {profile.handle.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.suggestionTextBlock}>
                              <Text
                                style={[styles.suggestionTitle, t.atoms.text]}>
                                {profile.displayName || profile.handle}
                              </Text>
                              <Text
                                style={[
                                  styles.suggestionSubtitle,
                                  t.atoms.text_contrast_medium,
                                ]}>
                                @{profile.handle}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.suggestionAction,
                              {color: t.palette.primary_600},
                            ]}>
                            Add
                          </Text>
                        </TouchableOpacity>
                      ))}

                      {isFetchingFoundingMemberSuggestions ? (
                        <Text
                          style={[
                            styles.suggestionEmpty,
                            t.atoms.text_contrast_medium,
                          ]}>
                          Searching people…
                        </Text>
                      ) : filteredFoundingMemberSuggestions.length === 0 ? (
                        <Text
                          style={[
                            styles.suggestionEmpty,
                            t.atoms.text_contrast_medium,
                          ]}>
                          No people matched that `@` search yet.
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.fieldDescription,
                        t.atoms.text_contrast_medium,
                      ]}>
                      Start with `@` to search handles and prepare your first 8
                      invitations.
                    </Text>
                  )}
                </View>

                {currentError ? (
                  <View
                    style={[
                      styles.errorCard,
                      {backgroundColor: t.palette.negative_25},
                    ]}>
                    <Text style={[styles.errorText, t.atoms.text]}>
                      {cleanError(currentError) ||
                        'Something went wrong while creating the community.'}
                    </Text>
                  </View>
                ) : null}

                {createdUri && isHydratingBoard ? (
                  <StatusCard
                    theme={t}
                    title="Finishing setup"
                    body="Hydrating the board detail from server data so the setup screen reflects the real record."
                  />
                ) : null}

                {createdUri && isHydrationError ? (
                  <StatusCard
                    theme={t}
                    title="Setup needs one more fetch"
                    body={
                      cleanError(hydrationError) ||
                      'The board was created, but we need one more read to hydrate the setup view.'
                    }
                    actionLabel="Retry setup"
                    onPress={() => void refetchBoard()}
                  />
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={formDisabled}
                  onPress={onPressSubmit}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: formDisabled
                        ? t.palette.contrast_100
                        : t.palette.primary_500,
                      opacity: formDisabled ? 0.7 : 1,
                    },
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    {isSubmitting
                      ? 'Creating community...'
                      : 'Create community'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

function Field({
  theme,
  label,
  description,
  multiline,
  ...props
}: ComponentProps<typeof TextInput> & {
  theme: ReturnType<typeof useTheme>
  label: string
  description?: string
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, theme.atoms.text]}>{label}</Text>
      {description ? (
        <Text
          style={[styles.fieldDescription, theme.atoms.text_contrast_medium]}>
          {description}
        </Text>
      ) : null}
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor={theme.palette.contrast_400}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            borderColor: theme.palette.contrast_100,
            color: theme.atoms.text.color,
            backgroundColor: theme.atoms.bg.backgroundColor,
          },
        ]}
      />
    </View>
  )
}

function getMentionQuery(value: string) {
  const trimmed = value.trimStart()
  const match = trimmed.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/)
  return match?.[1] ?? ''
}

function StatusCard({
  theme,
  title,
  body,
  actionLabel,
  onPress,
}: {
  theme: ReturnType<typeof useTheme>
  title: string
  body: string
  actionLabel?: string
  onPress?: () => void
}) {
  return (
    <View style={[styles.card, theme.atoms.bg, styles.cardSpacing]}>
      <Text style={[styles.cardTitle, theme.atoms.text]}>{title}</Text>
      <Text style={[styles.cardBody, theme.atoms.text_contrast_medium]}>
        {body}
      </Text>
      {actionLabel && onPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={onPress}
          style={[
            styles.secondaryButton,
            {borderColor: theme.palette.contrast_100},
          ]}>
          <Text style={[styles.secondaryButtonText, theme.atoms.text]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

function ChecklistItem({
  theme,
  label,
}: {
  theme: ReturnType<typeof useTheme>
  label: string
}) {
  return (
    <View style={styles.checklistItem}>
      <View
        style={[styles.checkDot, {backgroundColor: theme.palette.primary_500}]}
      />
      <Text style={[styles.checkLabel, theme.atoms.text]}>{label}</Text>
    </View>
  )
}

function ParentCommunityPicker({
  theme,
  boardsData,
  selectedUri,
  searchQuery,
  onChangeSearchQuery,
  onSelect,
  onClear,
}: {
  theme: ReturnType<typeof useTheme>
  boardsData: {boards: Array<{uri: string; name: string; quadrant?: string; memberCount?: number}>} | undefined
  selectedUri: string
  searchQuery: string
  onChangeSearchQuery: (q: string) => void
  onSelect: (uri: string) => void
  onClear: () => void
}) {
  const selectedBoard = boardsData?.boards.find(b => b.uri === selectedUri)

  const suggestions = useMemo(() => {
    if (!boardsData?.boards) return []
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return boardsData.boards.filter(
      b =>
        b.uri !== selectedUri &&
        (b.name.toLowerCase().includes(q) ||
          (b.quadrant?.toLowerCase() || '').includes(q)),
    )
  }, [boardsData, searchQuery, selectedUri])

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, theme.atoms.text]}>
        Parent community (optional)
      </Text>
      <Text
        style={[
          styles.fieldDescription,
          theme.atoms.text_contrast_medium,
        ]}>
        Link this new community under an existing parent community.
        This appears in the About tab and helps users navigate between related communities.
      </Text>

      {selectedBoard ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 8,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: theme.palette.primary_50,
              borderWidth: 1,
              borderColor: theme.palette.primary_200,
              gap: 8,
            }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: '700',
                color: theme.palette.primary_700,
              }}>
              {selectedBoard.name}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Remove parent community"
              accessibilityHint="Clears the selected parent community"
              onPress={onClear}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '800',
                  color: theme.palette.primary_500,
                }}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TextInput
            accessibilityLabel="Search parent communities"
            accessibilityHint="Type to search for an existing community to link as parent"
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            placeholder="Search communities..."
            placeholderTextColor={theme.palette.contrast_400}
            autoCapitalize="none"
            autoCorrect={false}
            style={[
              styles.input,
              {
                borderColor: theme.palette.contrast_100,
                color: theme.atoms.text.color,
                backgroundColor: theme.atoms.bg.backgroundColor,
              },
            ]}
          />
          {suggestions.length > 0 ? (
            <View
              style={[
                styles.suggestionsCard,
                {
                  borderColor: theme.palette.contrast_100,
                  backgroundColor: theme.atoms.bg.backgroundColor,
                },
              ]}>
              {suggestions.slice(0, 6).map(board => (
                <TouchableOpacity
                  key={board.uri}
                  accessibilityRole="button"
                  onPress={() => {
                    onSelect(board.uri)
                    onChangeSearchQuery('')
                  }}
                  style={styles.suggestionRow}>
                  <View style={styles.suggestionIdentity}>
                    <View style={styles.suggestionTextBlock}>
                      <Text
                        style={[styles.suggestionTitle, theme.atoms.text]}>
                        {board.name}
                      </Text>
                      <Text
                        style={[
                          styles.suggestionSubtitle,
                          theme.atoms.text_contrast_medium,
                        ]}>
                        {board.quadrant || 'Community'}
                        {typeof board.memberCount === 'number'
                          ? ` · ${board.memberCount} members`
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.suggestionAction,
                      {color: theme.palette.primary_500},
                    ]}>
                    Select
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : searchQuery.trim().length > 0 ? (
            <Text
              style={[
                styles.suggestionEmpty,
                theme.atoms.text_contrast_medium,
              ]}>
              No communities match &quot;{searchQuery.trim()}&quot;
            </Text>
          ) : null}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  shell: {
    width: '100%',
    maxWidth: 720,
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heroCard: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 8,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroBody: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
  },
  cardSpacing: {
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorCard: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  checklist: {
    gap: 10,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  checkLabel: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  topologyCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 8,
  },
  topologyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  topologyBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  topologyValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  foundersProgressCard: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  foundersProgressTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  foundersProgressBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  selectedFoundersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectedFounderChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedFounderChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  suggestionsCard: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  suggestionIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  suggestionAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionAvatarFallbackText: {
    fontSize: 14,
    fontWeight: '800',
  },
  suggestionTextBlock: {
    gap: 2,
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionSubtitle: {
    fontSize: 13,
  },
  suggestionAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  suggestionEmpty: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
})
