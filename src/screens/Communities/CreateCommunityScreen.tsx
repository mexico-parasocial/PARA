import {type ComponentProps, useEffect, useMemo, useRef, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  COMPASS_COLORS,
  COMPASS_GRID_ROWS,
  COMPASS_POSITION_NAMES,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {MEXICAN_STATES} from '#/lib/constants/mexico'
import {
  type DataTabNavigatorParams,
  type PlatformNavigationProp as NavigationProp,
} from '#/lib/routes/types'
import {normalizeCommunitySearchName} from '#/lib/strings/community-names'
import {cleanError} from '#/lib/strings/errors'
import {
  useCommunityBoardQuery,
  useCommunityBoardsQuery,
  useCreateCommunityMutation,
} from '#/state/queries/community-boards'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon} from '#/components/icons/Chevron'
import * as Layout from '#/components/Layout'
import {useDebouncedValue} from '#/components/live/utils'
import * as Menu from '#/components/Menu'
import {useAnalytics} from '#/analytics'

export function CreateCommunityScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp<DataTabNavigatorParams>>()
  const analytics = useAnalytics()
  const trackedSuccessRef = useRef(false)

  const [name, setName] = useState('')
  const [quadrant, setQuadrant] = useState('')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')
  const [createdUri, setCreatedUri] = useState<string | undefined>()

  const {data: boardsData} = useCommunityBoardsQuery({limit: 12})
  const createMutation = useCreateCommunityMutation()

  // Community names are unique: two boards with the same name cannot be told
  // apart in any picker. Checked against the directory as the name is typed;
  // the submit button waits for the check so a fast tap cannot skip it.
  const trimmedName = name.trim()
  const debouncedName = useDebouncedValue(trimmedName, 400)
  const nameLookup = useCommunityBoardsQuery(
    {limit: 25, query: debouncedName},
    debouncedName.length >= 2,
  )
  const isCheckingName =
    trimmedName.length >= 2 &&
    (trimmedName !== debouncedName || nameLookup.isFetching)
  const isNameTaken = useMemo(() => {
    const wanted = normalizeCommunitySearchName(trimmedName)
    return (
      wanted.length > 0 &&
      (nameLookup.data?.boards ?? []).some(
        board => normalizeCommunitySearchName(board.name) === wanted,
      )
    )
  }, [nameLookup.data, trimmedName])
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
        region: region || undefined,
        description: description.trim() || undefined,
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
    Boolean(createdUri) ||
    isNameTaken ||
    isCheckingName ||
    name.trim().length === 0 ||
    quadrant.trim().length === 0

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
            {createdBoard ? (
              <View style={[styles.card, t.atoms.bg, styles.cardSpacing]}>
                <Text style={[styles.cardTitle, t.atoms.text]}>
                  <Trans>Community created</Trans>
                </Text>
                <Text style={[styles.cardBody, t.atoms.text_contrast_medium]}>
                  <Trans>You’re the owner of {createdBoard.name}.</Trans>
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={onContinue}
                  style={[
                    styles.primaryButton,
                    {backgroundColor: t.palette.primary_500},
                  ]}>
                  <Text style={styles.primaryButtonText}>
                    <Trans>Continue to community</Trans>
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.card, t.atoms.bg, styles.cardSpacing]}>
                <Text style={[styles.cardTitle, t.atoms.text]}>
                  <Trans>Community basics</Trans>
                </Text>

                {!canCreateCommunity ? (
                  <StatusCard
                    theme={t}
                    title={l`Creation unavailable`}
                    body={l`Community creation is currently unavailable. Please try again later.`}
                  />
                ) : null}

                <Field
                  theme={t}
                  label={l`Community name`}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nuevo León Water Table"
                />
                {isNameTaken ? (
                  <Text
                    style={[
                      styles.fieldDescription,
                      {color: t.palette.negative_500},
                    ]}>
                    <Trans>
                      A community named “{trimmedName}” already exists. Choose a
                      different name.
                    </Trans>
                  </Text>
                ) : null}
                <NonantPicker
                  theme={t}
                  value={quadrant}
                  onChange={setQuadrant}
                />
                <StatePicker theme={t} value={region} onChange={setRegion} />
                <Field
                  theme={t}
                  label={l`Description (optional)`}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={l`Short public description for the community directory.`}
                  multiline
                  numberOfLines={4}
                />
                {currentError ? (
                  <View
                    style={[
                      styles.errorCard,
                      {backgroundColor: t.palette.negative_25},
                    ]}>
                    <Text style={[styles.errorText, t.atoms.text]}>
                      {cleanError(currentError) ||
                        l`Something went wrong while creating the community.`}
                    </Text>
                  </View>
                ) : null}

                {createdUri && isHydratingBoard ? (
                  <StatusCard
                    theme={t}
                    title={l`Community created`}
                    body={l`Waiting for the community profile to become available.`}
                  />
                ) : null}

                {createdUri && isHydrationError ? (
                  <StatusCard
                    theme={t}
                    title={l`Community created`}
                    body={
                      cleanError(hydrationError) ||
                      l`The community profile is still loading. Try again in a moment.`
                    }
                    actionLabel={l`Reload profile`}
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
                      ? l`Creating community…`
                      : l`Create community`}
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

/**
 * Nonant selector — the community's position on the political compass.
 *
 * A dropdown on web, a bottom sheet on native: the same `Menu` used elsewhere
 * in the app, with the trigger styled as a form control so it sits flush with
 * the surrounding fields.
 *
 * The nine positions, their order and their colors all come from
 * `#/lib/compass/compassColors` — per CLAUDE.md that file is the single source
 * of truth, so nothing here restates an id, a name or a hex value. Items are
 * listed in `COMPASS_GRID_ROWS` order (auth → centre → lib) rather than
 * alphabetically, so the menu reads in the same order as the compass itself.
 */
function NonantPicker({
  theme,
  value,
  onChange,
}: {
  theme: ReturnType<typeof useTheme>
  value: string
  onChange: (next: CompassPositionId) => void
}) {
  const selected = COMPASS_GRID_ROWS.flat().find(id => id === value)

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, theme.atoms.text]}>Nonant</Text>
      <Text style={[styles.fieldDescription, theme.atoms.text_contrast_medium]}>
        The compass position this community organizes around.
      </Text>

      <Menu.Root>
        <Menu.Trigger label="Select a nonant">
          {({props: menuProps, state}) => (
            <TouchableOpacity
              {...menuProps}
              activeOpacity={0.7}
              style={[
                styles.input,
                styles.nonantTrigger,
                {
                  borderColor: state.focused
                    ? theme.palette.primary_500
                    : theme.palette.contrast_100,
                  backgroundColor: theme.atoms.bg.backgroundColor,
                },
              ]}>
              {selected ? (
                <View
                  style={[
                    styles.nonantSwatch,
                    {backgroundColor: COMPASS_COLORS[selected]},
                  ]}
                />
              ) : null}
              <Text
                numberOfLines={1}
                style={[
                  styles.nonantValue,
                  selected
                    ? theme.atoms.text
                    : {color: theme.palette.contrast_400},
                ]}>
                {selected
                  ? COMPASS_POSITION_NAMES[selected]
                  : 'Select a nonant'}
              </Text>
              <ChevronDownIcon size="sm" fill={theme.palette.contrast_500} />
            </TouchableOpacity>
          )}
        </Menu.Trigger>

        <Menu.Outer>
          {COMPASS_GRID_ROWS.map((row, rowIndex) => (
            <Menu.Group key={rowIndex}>
              {row.map(id => (
                <Menu.Item
                  key={id}
                  label={COMPASS_POSITION_NAMES[id]}
                  onPress={() => onChange(id)}>
                  <View
                    style={[
                      styles.nonantSwatch,
                      {backgroundColor: COMPASS_COLORS[id]},
                    ]}
                  />
                  <Menu.ItemText>{COMPASS_POSITION_NAMES[id]}</Menu.ItemText>
                  <Menu.ItemRadio selected={value === id} />
                </Menu.Item>
              ))}
            </Menu.Group>
          ))}
        </Menu.Outer>
      </Menu.Root>
    </View>
  )
}

/**
 * Optional state selector. A community tied to one Mexican state lists under
 * that state in My Communities; leave it unset for any other community.
 */
function StatePicker({
  theme,
  value,
  onChange,
}: {
  theme: ReturnType<typeof useTheme>
  value: string
  onChange: (next: string) => void
}) {
  const states = MEXICAN_STATES.filter(state => state !== 'All')

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, theme.atoms.text]}>
        State (optional)
      </Text>
      <Text style={[styles.fieldDescription, theme.atoms.text_contrast_medium]}>
        The Mexican state this community belongs to, if it belongs to one.
      </Text>

      <Menu.Root>
        <Menu.Trigger label="Select a state">
          {({props: menuProps, state}) => (
            <TouchableOpacity
              {...menuProps}
              activeOpacity={0.7}
              style={[
                styles.input,
                styles.nonantTrigger,
                {
                  borderColor: state.focused
                    ? theme.palette.primary_500
                    : theme.palette.contrast_100,
                  backgroundColor: theme.atoms.bg.backgroundColor,
                },
              ]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.nonantValue,
                  value
                    ? theme.atoms.text
                    : {color: theme.palette.contrast_400},
                ]}>
                {value || 'No state'}
              </Text>
              <ChevronDownIcon size="sm" fill={theme.palette.contrast_500} />
            </TouchableOpacity>
          )}
        </Menu.Trigger>

        <Menu.Outer>
          <Menu.Group>
            <Menu.Item label="No state" onPress={() => onChange('')}>
              <Menu.ItemText>No state</Menu.ItemText>
              <Menu.ItemRadio selected={value === ''} />
            </Menu.Item>
            {states.map(state => (
              <Menu.Item
                key={state}
                label={state}
                onPress={() => onChange(state)}>
                <Menu.ItemText>{state}</Menu.ItemText>
                <Menu.ItemRadio selected={value === state} />
              </Menu.Item>
            ))}
          </Menu.Group>
        </Menu.Outer>
      </Menu.Root>
    </View>
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
  nonantTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  nonantValue: {
    flex: 1,
    fontSize: 15,
  },
  nonantSwatch: {
    width: 18,
    height: 18,
    borderRadius: 5,
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
})
