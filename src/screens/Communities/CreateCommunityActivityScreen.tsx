import {useState} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {
  type CreateCommunityActivityInput,
  useCommunityOrganizers,
  useCreateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {
  buildEconomicDetails,
  EconomicDetailsFields,
  emptyEconomicDraft,
} from '#/features/communityActivities/components/forms/EconomicDetailsFields'
import {
  buildFinancialPlan,
  emptyPlanDraft,
  FinancialPlanFields,
} from '#/features/communityActivities/components/forms/FinancialPlanFields'
import {
  combineDateTime,
  DateTimeRow,
  Section,
  TextRow,
} from '#/features/communityActivities/components/forms/FormBits'
import {
  buildSocialDetails,
  EMPTY_SOCIAL_DRAFT,
  SocialDetailsFields,
} from '#/features/communityActivities/components/forms/SocialDetailsFields'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'CreateCommunityActivity'
>

export function CreateCommunityActivityScreen({route, navigation}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {communityUri, communityName, communityId} = route.params
  const category = route.params.category === 'economic' ? 'economic' : 'social'
  const {canOrganize} = useCommunityOrganizers({
    communityUri,
    communityName,
    communityId,
  })
  const create = useCreateCommunityActivityMutation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('10:00')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [social, setSocial] = useState(EMPTY_SOCIAL_DRAFT)
  const [economic, setEconomic] = useState(emptyEconomicDraft)
  const [plan, setPlan] = useState(() => emptyPlanDraft(communityName))
  const [errors, setErrors] = useState<string[]>([])

  const onPublish = () => {
    const problems: string[] = []
    const startsAt = combineDateTime(startDate, startTime)
    const endsAt = endDate
      ? combineDateTime(endDate, endTime || '23:59')
      : undefined
    if (!title.trim()) problems.push(_(msg`Add a title.`))
    if (!startsAt) problems.push(_(msg`Pick a start date.`))
    if (startsAt && endsAt && endsAt < startsAt) {
      problems.push(_(msg`The end must be after the start.`))
    }
    const base = {
      communityUri,
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: startsAt ?? '',
      endsAt,
      location: location.trim() || undefined,
      status: 'planned' as const,
    }

    let input: CreateCommunityActivityInput | undefined
    if (category === 'social') {
      const details = buildSocialDetails(social, _)
      problems.push(...details.problems)
      if (details.value) {
        input = {category, record: {...base, details: details.value}}
      }
    } else {
      const details = buildEconomicDetails(economic, _)
      const financialPlan = buildFinancialPlan(plan, _)
      problems.push(...details.problems, ...financialPlan.problems)
      if (details.value && financialPlan.value) {
        input = {
          category,
          record: {
            ...base,
            details: details.value,
            financialPlan: financialPlan.value,
          },
        }
      }
    }

    setErrors(Array.from(new Set(problems)))
    if (problems.length > 0 || !input) return

    create.mutate(input, {
      onSuccess: ({uri}) => {
        Toast.show(_(msg`Activity published`))
        navigation.replace('CommunityActivity', {activityUri: uri})
      },
      onError: err => setErrors([cleanError(err)]),
    })
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {category === 'social' ? (
              <Trans>Register civic activity</Trans>
            ) : (
              <Trans>Register economic activity</Trans>
            )}
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {communityName}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {!canOrganize ? (
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>
                Only this community's creator, moderators and officials can
                register activities.
              </Trans>
            </Text>
          ) : (
            <View style={[a.gap_lg]}>
              {category === 'social' ? (
                <SocialDetailsFields draft={social} onChange={setSocial} />
              ) : (
                <EconomicDetailsFields
                  draft={economic}
                  onChange={setEconomic}
                  currency={plan.currency || 'MXN'}
                />
              )}

              <Section title={_(msg`When and where`)}>
                <TextRow
                  label={_(msg`Title`)}
                  value={title}
                  onChange={setTitle}
                  maxLength={300}
                />
                <TextRow
                  label={_(msg`Description`)}
                  value={description}
                  onChange={setDescription}
                  multiline
                  maxLength={5000}
                />
                <DateTimeRow
                  dateLabel={_(msg`Starts`)}
                  date={startDate}
                  onDate={setStartDate}
                  time={startTime}
                  onTime={setStartTime}
                />
                <DateTimeRow
                  dateLabel={_(msg`Ends (optional)`)}
                  date={endDate}
                  onDate={setEndDate}
                  time={endTime}
                  onTime={setEndTime}
                />
                <TextRow
                  label={_(msg`Location`)}
                  value={location}
                  onChange={setLocation}
                  maxLength={300}
                />
              </Section>

              {category === 'economic' ? (
                <FinancialPlanFields draft={plan} onChange={setPlan} />
              ) : null}

              {errors.length > 0 ? (
                <View
                  style={[
                    a.p_md,
                    a.rounded_md,
                    a.gap_xs,
                    {backgroundColor: t.palette.negative_25},
                  ]}>
                  {errors.map(problem => (
                    <Text
                      key={problem}
                      style={[a.text_sm, {color: t.palette.negative_600}]}>
                      • {problem}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Button
                label={_(msg`Publish activity`)}
                size="large"
                color="primary"
                disabled={create.isPending}
                onPress={onPublish}>
                <ButtonText>
                  <Trans>Publish activity</Trans>
                </ButtonText>
              </Button>
            </View>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
