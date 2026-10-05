import {useEffect, useRef, useState} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {type NavigationAction, usePreventRemove} from '@react-navigation/native'

import {
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_CABILDEO,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
} from '#/lib/api/para-lexicons'
import {
  ECONOMIC_ACTIVITY_KINDS,
  SOCIAL_ACTIVITY_KINDS,
} from '#/lib/community-activities'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {
  useCommunityOrganizers,
  useCreateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import * as Layout from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {IS_WEB} from '#/env'
import {ActivityReview} from '#/features/communityActivities/components/ActivityReview'
import {ChoiceChips} from '#/features/communityActivities/components/ChoiceChips'
import {CreationSteps} from '#/features/communityActivities/components/CreationSteps'
import {EconomicDetailsFields} from '#/features/communityActivities/components/forms/EconomicDetailsFields'
import {FinancialPlanFields} from '#/features/communityActivities/components/forms/FinancialPlanFields'
import {
  DateTimeRow,
  FieldGroup,
  FieldMessage,
  FormContext,
  Section,
  TextRow,
} from '#/features/communityActivities/components/forms/FormBits'
import {SocialDetailsFields} from '#/features/communityActivities/components/forms/SocialDetailsFields'
import {
  type ActivityDraft,
  buildActivity,
  type CreationStep,
  creationSteps,
  emptyActivityDraft,
  updateActivityDraft,
} from '#/features/communityActivities/creation'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'CreateCommunityActivity'
>

export function CreateCommunityActivityScreen({route, navigation}: Props) {
  const {_, i18n} = useLingui()
  const t = useTheme()
  const {communityUri, communityName, communityId} = route.params
  const category = route.params.category === 'economic' ? 'economic' : 'social'
  const {canOrganize} = useCommunityOrganizers({
    communityUri,
    communityName,
    communityId,
  })
  const create = useCreateCommunityActivityMutation()
  const [draft, setDraft] = useState(() =>
    emptyActivityDraft(category, communityName),
  )
  const [step, setStep] = useState<CreationStep>('type')
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [attempted, setAttempted] = useState<Set<CreationStep>>(() => new Set())
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string>()
  const [publishedUri, setPublishedUri] = useState<string>()
  const [discarding, setDiscarding] = useState(false)
  const focusField = useRef<string | undefined>(undefined)
  const busy = useRef(false)
  const pendingAction = useRef<NavigationAction | undefined>(undefined)
  const discard = Prompt.usePromptControl()
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const content = useRef<React.ComponentRef<typeof View>>(null)
  const fields = useRef(new Map<string, React.ComponentRef<typeof View>>())
  const steps = creationSteps(category)
  const index = steps.indexOf(step)
  const built = buildActivity(draft, communityUri, _)
  const reviewIssues =
    !draft.plan.committed && attempted.has('review') && category === 'economic'
      ? [
          {
            field: 'plan.committed',
            step: 'review' as const,
            message: _(msg`Confirm that you commit to this business model.`),
          },
        ]
      : []
  const issues = [...built.issues, ...reviewIssues]
  const touch = (field: string) =>
    setTouched(previous => new Set(previous).add(field))
  const update = (patch: Partial<ActivityDraft>) => {
    if (busy.current) return
    setDraft(previous => updateActivityDraft(previous, patch))
    setDirty(true)
    setError(undefined)
  }
  const goTo = (next: CreationStep) => {
    if (busy.current) return
    setStep(next)
    setError(undefined)
  }
  const reveal = (field: string) => {
    const target = fields.current.get(field)
    if (IS_WEB) {
      target?.measureInWindow((_x, y) =>
        window.scrollTo({
          top: Math.max(0, window.scrollY + y - 80),
          behavior: 'smooth',
        }),
      )
      return
    }
    if (target && content.current)
      target.measureLayout(
        content.current,
        (_x, y) =>
          scroll.current?.scrollTo({y: Math.max(0, y - 16), animated: true}),
        () => {},
      )
  }
  useEffect(() => {
    const field = focusField.current
    focusField.current = undefined
    const frame = requestAnimationFrame(() => {
      if (field) reveal(field)
      else if (IS_WEB) window.scrollTo(0, 0)
      else scroll.current?.scrollTo({y: 0, animated: false})
    })
    return () => cancelAnimationFrame(frame)
  }, [step])

  usePreventRemove(
    (dirty || create.isPending) && !publishedUri && !discarding,
    ({data}) => {
      if (busy.current) return
      pendingAction.current = data.action
      discard.open()
    },
  )
  useEffect(() => {
    if (publishedUri)
      navigation.replace('CommunityActivity', {activityUri: publishedUri})
    else if (discarding && pendingAction.current)
      navigation.dispatch(pendingAction.current)
  }, [publishedUri, discarding, navigation])

  const next = () => {
    const problems = built.issues.filter(issue => issue.step === step)
    setAttempted(previous => new Set(previous).add(step))
    if (problems.length) {
      reveal(problems[0].field)
      return
    }
    goTo(steps[index + 1])
  }
  const publish = () => {
    if (busy.current || create.isPending || !canOrganize) return
    const submission = buildActivity(draft, communityUri, _, {publishing: true})
    setAttempted(new Set(steps))
    if (!submission.value || submission.issues.length) {
      const first = submission.issues[0]
      if (first) {
        if (first.step === step) reveal(first.field)
        else {
          focusField.current = first.field
          setStep(first.step)
        }
      }
      return
    }
    busy.current = true
    create.mutate(submission.value, {
      onSuccess: ({uri}) => {
        Toast.show(_(msg`Activity published`))
        setPublishedUri(uri)
      },
      onError: err => {
        busy.current = false
        setError(cleanError(err))
      },
    })
  }
  const kind = category === 'social' ? draft.social.kind : draft.economic.kind
  const descriptions = {
    [SOCIAL_ACTIVITY_PEACEFUL_MARCH]: _(
      msg`Bring people together for a peaceful march. Plan the meeting point, route, and public logistics.`,
    ),
    [SOCIAL_ACTIVITY_SIGNATURE_DRIVE]: _(
      msg`Collect signatures supporting a bill, law, initiative, referendum, or petition.`,
    ),
    [SOCIAL_ACTIVITY_ASSEMBLY]: _(
      msg`Gather the community around an agenda, in person, online, or both.`,
    ),
    [SOCIAL_ACTIVITY_CABILDEO]: _(
      msg`Organize a conversation and optionally document its participants, arguments, and outcome.`,
    ),
    [ECONOMIC_ACTIVITY_SALE]: _(
      msg`Sell items at agreed prices, with a public plan for where the money goes.`,
    ),
    [ECONOMIC_ACTIVITY_RAFFLE]: _(
      msg`Offer tickets for a prize draw. State the prizes, draw method, and money destinations.`,
    ),
    [ECONOMIC_ACTIVITY_FUNDRAISER]: _(
      msg`Raise contributions for a stated purpose and explain how the money will be used.`,
    ),
  }
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    _(msg`Device local time`)
  const basics = draft.basics
  const setBasic = (patch: Partial<ActivityDraft['basics']>) =>
    update({basics: {...basics, ...patch}})
  const setPlan = (patch: Partial<ActivityDraft['plan']>) =>
    update({plan: {...draft.plan, ...patch}})

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton disabled={create.isPending} />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {category === 'social'
              ? _(msg`Register civic activity`)
              : _(msg`Register economic activity`)}
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {communityName}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={styles.center}>
        <ScrollView
          ref={scroll}
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {!canOrganize ? (
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              {_(
                msg`Only this community's creator, moderators and officials can register activities.`,
              )}
            </Text>
          ) : (
            <FormContext.Provider
              value={{
                disabled: create.isPending,
                issues,
                visible: field =>
                  touched.has(field) ||
                  attempted.has(
                    issues.find(issue => issue.field === field)?.step ?? step,
                  ),
                touch,
                register: (field, node) => {
                  if (node) fields.current.set(field, node)
                  else fields.current.delete(field)
                },
              }}>
              <View ref={content} collapsable={false} style={[a.gap_lg]}>
                <CreationSteps steps={steps} current={step} />
                <View
                  pointerEvents={create.isPending ? 'none' : 'auto'}
                  accessibilityElementsHidden={create.isPending}
                  importantForAccessibility={
                    create.isPending ? 'no-hide-descendants' : 'auto'
                  }
                  style={[a.gap_lg]}>
                  {step === 'type' ? (
                    <Section
                      title={_(msg`Choose an activity type`)}
                      subtitle={_(
                        msg`Choose the type that best matches what your community will organize.`,
                      )}>
                      <FieldGroup id="kind">
                        {category === 'social' ? (
                          <ChoiceChips
                            label={_(msg`Activity kind`)}
                            value={
                              draft.kindSelected ? draft.social.kind : undefined
                            }
                            onChange={kind =>
                              update({
                                kindSelected: true,
                                social: {...draft.social, kind},
                              })
                            }
                            options={SOCIAL_ACTIVITY_KINDS.map(k => ({
                              value: k.value,
                              label: `${k.emoji} ${i18n._(k.label)}`,
                            }))}
                          />
                        ) : (
                          <ChoiceChips
                            label={_(msg`Activity kind`)}
                            value={
                              draft.kindSelected
                                ? draft.economic.kind
                                : undefined
                            }
                            onChange={kind =>
                              update({
                                kindSelected: true,
                                economic: {...draft.economic, kind},
                              })
                            }
                            options={ECONOMIC_ACTIVITY_KINDS.map(k => ({
                              value: k.value,
                              label: `${k.emoji} ${i18n._(k.label)}`,
                            }))}
                          />
                        )}
                        {draft.kindSelected ? (
                          <Text style={[a.text_md, a.leading_snug]}>
                            {descriptions[kind]}
                          </Text>
                        ) : (
                          (category === 'social'
                            ? SOCIAL_ACTIVITY_KINDS
                            : ECONOMIC_ACTIVITY_KINDS
                          ).map(k => (
                            <View key={k.value} style={[a.gap_xs]}>
                              <Text style={[a.font_bold]}>
                                {i18n._(k.label)}
                              </Text>
                              <Text
                                style={[
                                  a.text_sm,
                                  t.atoms.text_contrast_medium,
                                ]}>
                                {descriptions[k.value]}
                              </Text>
                            </View>
                          ))
                        )}
                      </FieldGroup>
                    </Section>
                  ) : null}
                  {step === 'basics' ? (
                    <Section
                      title={_(msg`Basics`)}
                      subtitle={_(
                        msg`Give the activity a name, schedule, and place so people know what to expect.`,
                      )}>
                      <TextRow
                        id="basics.title"
                        label={_(msg`Title`)}
                        value={basics.title}
                        onChange={title => setBasic({title})}
                        maxLength={300}
                      />
                      <TextRow
                        id="basics.description"
                        label={_(msg`Description`)}
                        value={basics.description}
                        onChange={description => setBasic({description})}
                        multiline
                        maxLength={5000}
                      />
                      <DateTimeRow
                        id="basics.startDate"
                        dateLabel={_(msg`Starts`)}
                        date={basics.startDate}
                        onDate={startDate => setBasic({startDate})}
                        time={basics.startTime}
                        onTime={startTime => setBasic({startTime})}
                      />
                      <DateTimeRow
                        id="basics.endDate"
                        dateLabel={_(msg`Ends (optional)`)}
                        date={basics.endDate}
                        onDate={endDate => setBasic({endDate})}
                        time={basics.endTime}
                        onTime={endTime => setBasic({endTime})}
                        optional
                      />
                      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                        {_(msg`Times use your device timezone: ${timezone}.`)}
                      </Text>
                      <TextRow
                        id="basics.location"
                        label={_(msg`Location`)}
                        value={basics.location}
                        onChange={location => setBasic({location})}
                        maxLength={300}
                      />
                      {category === 'economic' ? (
                        <TextRow
                          id="plan.currency"
                          label={_(msg`Currency`)}
                          value={draft.plan.currency}
                          onChange={currency =>
                            setPlan({currency: currency.toUpperCase()})
                          }
                          maxLength={3}
                          help={_(
                            msg`Use a 3-letter code such as MXN. All prices and ledger amounts use this currency.`,
                          )}
                        />
                      ) : null}
                    </Section>
                  ) : null}
                  {step === 'details' ? (
                    category === 'social' ? (
                      <SocialDetailsFields
                        draft={draft.social}
                        onChange={social => update({social})}
                      />
                    ) : (
                      <EconomicDetailsFields
                        draft={draft.economic}
                        onChange={economic => update({economic})}
                        currency={draft.plan.currency}
                        fundingGoal={draft.plan.fundingGoal}
                        onFundingGoal={fundingGoal => setPlan({fundingGoal})}
                      />
                    )
                  ) : null}
                  {step === 'money' ? (
                    <FinancialPlanFields
                      draft={draft.plan}
                      onChange={plan => update({plan})}
                      showFundingGoal={
                        draft.economic.kind !== ECONOMIC_ACTIVITY_FUNDRAISER
                      }
                    />
                  ) : null}
                  {step === 'review' && built.value ? (
                    <>
                      <ActivityReview
                        disabled={create.isPending}
                        input={built.value}
                        communityName={communityName}
                        timezone={timezone}
                        onEdit={goTo}
                      />
                      {category === 'economic' ? (
                        <FieldGroup id="plan.committed">
                          <Toggle.Item
                            disabled={create.isPending}
                            name="commit"
                            label={_(msg`I commit to this business model`)}
                            value={draft.plan.committed}
                            onChange={committed => setPlan({committed})}>
                            <Toggle.Checkbox />
                            <Toggle.LabelText style={[a.flex_1]}>
                              {_(
                                msg`I commit to these prices and this split. I will book every income, expense and donation in the public ledger.`,
                              )}
                            </Toggle.LabelText>
                          </Toggle.Item>
                        </FieldGroup>
                      ) : null}
                    </>
                  ) : null}
                </View>
                {error ? <FieldMessage error={error} /> : null}
                {create.isPending ? (
                  <Text accessibilityLiveRegion="polite">
                    {_(msg`Publishing activity…`)}
                  </Text>
                ) : null}
                <View style={[a.flex_row, a.gap_md]}>
                  {index > 0 ? (
                    <Button
                      label={_(msg`Back`)}
                      size="large"
                      color="secondary"
                      disabled={create.isPending}
                      onPress={() => goTo(steps[index - 1])}>
                      <ButtonText>{_(msg`Back`)}</ButtonText>
                    </Button>
                  ) : null}
                  {step === 'review' ? (
                    <Button
                      label={_(msg`Publish activity`)}
                      size="large"
                      color="primary"
                      disabled={create.isPending}
                      onPress={publish}>
                      <ButtonText>{_(msg`Publish activity`)}</ButtonText>
                    </Button>
                  ) : (
                    <Button
                      label={_(msg`Next`)}
                      size="large"
                      color="primary"
                      disabled={create.isPending}
                      onPress={next}>
                      <ButtonText>{_(msg`Next`)}</ButtonText>
                    </Button>
                  )}
                </View>
              </View>
            </FormContext.Provider>
          )}
        </ScrollView>
      </Layout.Center>
      <Prompt.Basic
        control={discard}
        title={_(msg`Discard activity?`)}
        description={_(
          msg`Your changes will be lost. This activity has not been published.`,
        )}
        confirmButtonCta={_(msg`Discard`)}
        cancelButtonCta={_(msg`Keep editing`)}
        confirmButtonColor="negative"
        onConfirm={() => {
          discard.close()
          setDiscarding(true)
        }}
      />
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
