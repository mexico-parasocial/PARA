import {useState} from 'react'
import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  type CommunityActivityAcknowledgementResponse,
  type CommunityActivityAcknowledgementRole,
  type CommunityActivityContributor,
} from '#/lib/api/para-lexicons'
import {
  CONTRIBUTOR_ROLES,
  contributorShares,
  defaultMetricFor,
  findAnswer,
  formatBps,
  formatMinor,
  MEASUREMENT_METHODS,
  MEASUREMENT_METRICS,
  parseMoneyToMinor,
  type ServedAcknowledgement,
  type ServedMeasurement,
} from '#/lib/community-activities'
import {cleanError} from '#/lib/strings/errors'
import {
  type CommunityActivityView,
  useAcknowledgeActivityClaimMutation,
  useAddActivityMeasurementMutation,
  useUpdateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {useFetchDid} from '#/state/queries/handle'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {ChoiceChips} from '../ChoiceChips'
import {Card, LabeledInput} from './CardBits'

/*
 * Evidence around an activity, after the Hypercerts claim model: who did the
 * work, dated counts of how it went, and the answers of the people a claim
 * names. The AppView decides what counts; nothing here promotes a record the
 * AppView did not serve, and a missing answer is shown as "not confirmed
 * yet", never as a confirmation.
 */

// ─── Answers to a claim ────────────────────────────────────────────────────

/** How a claim stands with the account it names. */
function AnswerBadge({answer}: {answer: ServedAcknowledgement | undefined}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [label, color] = !answer
    ? [l`Not confirmed yet`, t.atoms.text_contrast_medium.color]
    : answer.response === 'accepted'
      ? [l`Confirmed`, t.palette.positive_600]
      : answer.response === 'partial'
        ? [l`Partly confirmed`, t.palette.negative_500]
        : [l`Disputed`, t.palette.negative_600]
  return (
    <View style={[a.gap_2xs]}>
      <Text style={[a.text_xs, a.font_semi_bold, {color}]}>
        {answer?.response === 'accepted' ? '✓ ' : ''}
        {label}
        {answer && !answer.current
          ? ` · ${l`answered an earlier version`}`
          : ''}
      </Text>
      {answer?.record.amountReceivedMinor !== undefined &&
      answer.record.currency ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Received:{' '}
            {formatMinor(
              answer.record.amountReceivedMinor,
              answer.record.currency,
            )}
          </Trans>
        </Text>
      ) : null}
      {answer?.record.note ? (
        <Text style={[a.text_xs, a.italic, t.atoms.text_contrast_medium]}>
          “{answer.record.note}”
        </Text>
      ) : null}
    </View>
  )
}

/**
 * The status of a claim, plus confirm / dispute controls when the viewer is
 * the account it names. A recipient may also say how much arrived.
 */
export function ClaimAnswer({
  activity,
  subject,
  namedDid,
  role,
  acknowledgements,
  currency,
}: {
  activity: CommunityActivityView
  subject: {uri: string; cid: string}
  namedDid: string
  role: CommunityActivityAcknowledgementRole
  acknowledgements: ServedAcknowledgement[]
  /** Recipients only: lets them state the amount that arrived. */
  currency?: string
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {currentAccount} = useSession()
  const answer = findAnswer(acknowledgements, {
    did: namedDid,
    subjectUri: subject.uri,
    role,
  })
  const acknowledge = useAcknowledgeActivityClaimMutation()
  const [disputing, setDisputing] = useState(false)
  const [note, setNote] = useState('')
  const [received, setReceived] = useState('')
  const [error, setError] = useState<string>()
  const isNamed = currentAccount?.did === namedDid
  // Asking again is only useful when there is no answer, or it no longer
  // describes what the organizer now says.
  const canAnswer = isNamed && (!answer || !answer.current || disputing)

  const send = (response: CommunityActivityAcknowledgementResponse) => {
    const amountReceivedMinor = received.trim()
      ? parseMoneyToMinor(received)
      : undefined
    if (received.trim() && amountReceivedMinor === undefined) {
      setError(l`Enter the amount as a number.`)
      return
    }
    if (response !== 'accepted' && !note.trim()) {
      setError(l`Say what is wrong, so the organizer can answer it.`)
      return
    }
    acknowledge.mutate(
      {
        activity,
        subject,
        role,
        response,
        note: response === 'accepted' ? undefined : note,
        amountReceivedMinor:
          response === 'accepted' ? undefined : amountReceivedMinor,
        currency,
      },
      {
        onSuccess: () => {
          setDisputing(false)
          setError(undefined)
          Toast.show(l`Your answer is published`)
        },
        onError: err => setError(cleanError(err)),
      },
    )
  }

  return (
    <View style={[a.gap_xs]}>
      <AnswerBadge answer={answer} />
      {isNamed && !canAnswer ? (
        <Button
          label={l`Change your answer`}
          size="tiny"
          color="secondary"
          style={[a.self_start]}
          onPress={() => setDisputing(true)}>
          <ButtonText>
            <Trans>Change answer</Trans>
          </ButtonText>
        </Button>
      ) : null}
      {canAnswer ? (
        <View style={[a.gap_sm, a.p_sm, a.rounded_sm, t.atoms.bg_contrast_25]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {role === 'recipient' ? (
              <Trans>
                You are named as the recipient. Your answer is public and stays
                on record.
              </Trans>
            ) : (
              <Trans>
                You are listed as a contributor. Your answer is public and stays
                on record.
              </Trans>
            )}
          </Text>
          {disputing ? (
            <>
              <LabeledInput
                label={l`What is wrong?`}
                value={note}
                onChange={setNote}
              />
              {currency ? (
                <LabeledInput
                  label={l`Amount that arrived (${currency}), if any`}
                  value={received}
                  onChange={setReceived}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              ) : null}
            </>
          ) : null}
          {error ? (
            <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
              {error}
            </Text>
          ) : null}
          <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
            {disputing ? (
              <>
                {currency ? (
                  <Button
                    label={l`Report that part of it arrived`}
                    size="small"
                    color="secondary"
                    disabled={acknowledge.isPending}
                    onPress={() => send('partial')}>
                    <ButtonText>
                      <Trans>Part of it</Trans>
                    </ButtonText>
                  </Button>
                ) : null}
                <Button
                  label={l`Dispute this claim`}
                  size="small"
                  color="negative"
                  disabled={acknowledge.isPending}
                  onPress={() => send('rejected')}>
                  <ButtonText>
                    <Trans>Dispute</Trans>
                  </ButtonText>
                </Button>
                <Button
                  label={l`Cancel`}
                  size="small"
                  color="secondary"
                  onPress={() => {
                    setDisputing(false)
                    setError(undefined)
                  }}>
                  <ButtonText>
                    <Trans>Cancel</Trans>
                  </ButtonText>
                </Button>
              </>
            ) : (
              <>
                <Button
                  label={
                    role === 'recipient'
                      ? l`Confirm you received it`
                      : l`Confirm you took part`
                  }
                  size="small"
                  color="primary"
                  disabled={acknowledge.isPending}
                  onPress={() => send('accepted')}>
                  <ButtonText>
                    {role === 'recipient' ? (
                      <Trans>Confirm received</Trans>
                    ) : (
                      <Trans>Confirm</Trans>
                    )}
                  </ButtonText>
                </Button>
                <Button
                  label={l`Report a problem with this claim`}
                  size="small"
                  color="secondary"
                  onPress={() => setDisputing(true)}>
                  <ButtonText>
                    <Trans>Report a problem</Trans>
                  </ButtonText>
                </Button>
              </>
            )}
          </View>
        </View>
      ) : null}
    </View>
  )
}

/** `@handle` for an account, falling back to its DID while it loads. */
export function AccountName({did}: {did: string}) {
  const {data} = useProfileQuery({did})
  return (
    <Text style={[a.text_sm, a.font_semi_bold]} emoji>
      {data?.displayName || (data?.handle ? `@${data.handle}` : did)}
    </Text>
  )
}

// ─── Contributors ──────────────────────────────────────────────────────────

export function ContributorsCard({
  activity,
  acknowledgements,
  isOrganizer,
}: {
  activity: CommunityActivityView
  acknowledgements: ServedAcknowledgement[]
  isOrganizer: boolean
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const contributors = activity.record.contributors ?? []
  const shares = contributorShares(contributors)
  const update = useUpdateCommunityActivityMutation()
  const [isAdding, setIsAdding] = useState(false)

  if (!contributors.length && !isOrganizer) return null

  const save = (next: CommunityActivityContributor[], onDone?: () => void) => {
    // Spelled out per category so the union narrows for the mutation input.
    const input =
      activity.category === 'social'
        ? {activity, changes: {contributors: next}}
        : {activity, changes: {contributors: next}}
    update.mutate(input, {
      onSuccess: onDone,
      onError: err => Toast.show(cleanError(err), {type: 'error'}),
    })
  }

  return (
    <Card
      title={l`Who did the work`}
      subtitle={l`Credited by the organizer. Each person with an account can confirm or dispute their part.`}>
      {contributors.length === 0 ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Nobody is credited yet.</Trans>
        </Text>
      ) : (
        contributors.map((contributor, index) => {
          const role = CONTRIBUTOR_ROLES.find(r => r.value === contributor.role)
          const share = shares?.[index]
          return (
            <View
              key={`${contributor.did ?? contributor.name}-${index}`}
              style={[
                a.gap_xs,
                a.pt_sm,
                a.border_t,
                t.atoms.border_contrast_low,
              ]}>
              <View style={[a.flex_row, a.justify_between, a.gap_md]}>
                <View style={[a.flex_1, a.gap_2xs]}>
                  {contributor.did ? (
                    <AccountName did={contributor.did} />
                  ) : (
                    <Text style={[a.text_sm, a.font_semi_bold]} emoji>
                      {contributor.name}
                    </Text>
                  )}
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {[
                      role ? i18n._(role.label) : contributor.role,
                      share !== undefined
                        ? l`${formatBps(share)} of the work`
                        : undefined,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                  {contributor.roleDescription ? (
                    <Text style={[a.text_sm, a.leading_snug]}>
                      {contributor.roleDescription}
                    </Text>
                  ) : null}
                </View>
                {isOrganizer ? (
                  <Button
                    label={l`Remove this contributor`}
                    size="tiny"
                    color="secondary"
                    disabled={update.isPending}
                    onPress={() =>
                      save(contributors.filter((_c, i) => i !== index))
                    }>
                    <ButtonText>
                      <Trans>Remove</Trans>
                    </ButtonText>
                  </Button>
                ) : null}
              </View>
              {contributor.did ? (
                <ClaimAnswer
                  activity={activity}
                  subject={{uri: activity.uri, cid: activity.cid}}
                  namedDid={contributor.did}
                  role="contributor"
                  acknowledgements={acknowledgements}
                />
              ) : (
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  <Trans>No account, so this cannot be confirmed.</Trans>
                </Text>
              )}
            </View>
          )
        })
      )}
      {isOrganizer ? (
        isAdding ? (
          <ContributorForm
            pending={update.isPending}
            onCancel={() => setIsAdding(false)}
            onAdd={contributor =>
              save([...contributors, contributor], () => setIsAdding(false))
            }
          />
        ) : (
          <Button
            label={l`Credit someone for this activity`}
            size="small"
            color="secondary"
            style={[a.self_start]}
            onPress={() => setIsAdding(true)}>
            <ButtonText>
              <Trans>Credit someone</Trans>
            </ButtonText>
          </Button>
        )
      ) : null}
    </Card>
  )
}

function ContributorForm({
  pending,
  onAdd,
  onCancel,
}: {
  pending: boolean
  onAdd: (contributor: CommunityActivityContributor) => void
  onCancel: () => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const fetchDid = useFetchDid()
  const [who, setWho] = useState('')
  const [role, setRole] = useState('volunteer')
  const [description, setDescription] = useState('')
  const [weight, setWeight] = useState('')
  const [error, setError] = useState<string>()
  const [resolving, setResolving] = useState(false)

  const onSubmit = async () => {
    const input = who.trim().replace(/^@/, '')
    if (!input) {
      setError(l`Enter a handle, or a name for someone without an account.`)
      return
    }
    const parsedWeight = weight.trim() ? Number(weight) : undefined
    if (
      parsedWeight !== undefined &&
      (!Number.isInteger(parsedWeight) || parsedWeight < 1)
    ) {
      setError(l`The share must be a whole number above zero.`)
      return
    }
    // A handle names an account that can confirm its part; anything with a
    // space is a plain name.
    let did: string | undefined
    if (input.startsWith('did:') || /^[^\s]+\.[^\s]+$/.test(input)) {
      setResolving(true)
      try {
        did = await fetchDid(input)
      } catch {
        setError(l`No account found for ${input}.`)
        return
      } finally {
        setResolving(false)
      }
    }
    onAdd({
      ...(did ? {did} : {name: input}),
      role,
      roleDescription: description.trim() || undefined,
      weight: parsedWeight,
    })
  }

  return (
    <View style={[a.gap_md, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
      <LabeledInput
        label={l`Handle, or name if they have no account`}
        value={who}
        onChange={setWho}
        placeholder="alice.test"
      />
      <ChoiceChips
        label={l`Role`}
        value={role}
        onChange={setRole}
        options={CONTRIBUTOR_ROLES.map(r => ({
          value: r.value,
          label: i18n._(r.label),
        }))}
      />
      <LabeledInput
        label={l`What they did (optional)`}
        value={description}
        onChange={setDescription}
      />
      <LabeledInput
        label={l`Relative share of the work (optional)`}
        value={weight}
        onChange={setWeight}
        keyboardType="number-pad"
        placeholder="1"
      />
      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}
      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          label={l`Cancel`}
          size="small"
          color="secondary"
          onPress={onCancel}>
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        <Button
          label={l`Add contributor`}
          size="small"
          color="primary"
          disabled={pending || resolving}
          onPress={() => void onSubmit()}>
          <ButtonText>
            <Trans>Add</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

// ─── Measurements ──────────────────────────────────────────────────────────

export function MeasurementsCard({
  activity,
  measurements,
  isOrganizer,
}: {
  activity: CommunityActivityView
  measurements: ServedMeasurement[]
  isOrganizer: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {hasSession} = useSession()
  const [isAdding, setIsAdding] = useState(false)
  const official = measurements.filter(m => m.official)
  const independent = measurements.filter(m => !m.official)

  return (
    <Card
      title={l`Counts`}
      subtitle={l`Dated counts with how they were taken. A count cannot be changed once published; a correction is a new count.`}>
      {measurements.length === 0 ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>Nothing has been counted yet.</Trans>
        </Text>
      ) : null}
      {official.length ? (
        <MeasurementList title={l`By the organizers`} items={official} />
      ) : null}
      {independent.length ? (
        <MeasurementList
          title={l`Independent counts by members`}
          items={independent}
          showAuthor
        />
      ) : null}
      {hasSession ? (
        isAdding ? (
          <MeasurementForm
            activity={activity}
            isOrganizer={isOrganizer}
            onDone={() => setIsAdding(false)}
          />
        ) : (
          <Button
            label={l`Publish a count for this activity`}
            size="small"
            color="secondary"
            style={[a.self_start]}
            onPress={() => setIsAdding(true)}>
            <ButtonText>
              <Trans>Add a count</Trans>
            </ButtonText>
          </Button>
        )
      ) : null}
    </Card>
  )
}

function MeasurementList({
  title,
  items,
  showAuthor,
}: {
  title: string
  items: ServedMeasurement[]
  showAuthor?: boolean
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  // Newest first to read; the AppView sends them oldest first.
  const ordered = [...items].sort((x, y) =>
    y.record.measuredAt.localeCompare(x.record.measuredAt),
  )
  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.text_sm, a.font_semi_bold, t.atoms.text_contrast_medium]}>
        {title}
      </Text>
      {ordered.map(m => {
        const metric = MEASUREMENT_METRICS.find(
          x => x.value === m.record.metric,
        )
        const method = MEASUREMENT_METHODS.find(
          x => x.value === m.record.method,
        )
        const range =
          m.record.valueLow !== undefined || m.record.valueHigh !== undefined
            ? l`between ${i18n.number(m.record.valueLow ?? m.record.value)} and ${i18n.number(m.record.valueHigh ?? m.record.value)}`
            : undefined
        return (
          <View
            key={m.uri}
            style={[
              a.gap_2xs,
              a.pt_sm,
              a.border_t,
              t.atoms.border_contrast_low,
            ]}>
            <View style={[a.flex_row, a.justify_between, a.gap_md]}>
              <Text style={[a.text_sm, a.flex_1]}>
                {metric ? i18n._(metric.label) : m.record.metric}
              </Text>
              <Text style={[a.text_sm, a.font_bold]}>
                {i18n.number(m.record.value)}
              </Text>
            </View>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {[
                i18n.date(new Date(m.record.measuredAt), {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
                method ? i18n._(method.label) : m.record.method,
                range,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {showAuthor ? <AccountName did={m.author} /> : null}
            {m.record.methodNote ? (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {m.record.methodNote}
              </Text>
            ) : null}
            {m.edited ? (
              <Text style={[a.text_xs, {color: t.palette.negative_600}]}>
                ⚠️{' '}
                <Trans>
                  Edited after publishing. The original count is shown.
                </Trans>
              </Text>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

function MeasurementForm({
  activity,
  isOrganizer,
  onDone,
}: {
  activity: CommunityActivityView
  isOrganizer: boolean
  onDone: () => void
}) {
  const t = useTheme()
  const {t: l, i18n} = useLingui()
  const add = useAddActivityMeasurementMutation()
  const [metric, setMetric] = useState(
    defaultMetricFor(activity.record.details?.$type),
  )
  const [method, setMethod] = useState('headcount')
  const [value, setValue] = useState('')
  const [low, setLow] = useState('')
  const [high, setHigh] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string>()
  const estimate = method === 'photo_estimate'

  const onSubmit = () => {
    const whole = (input: string) =>
      input.trim() === '' ? undefined : Number(input)
    const count = whole(value)
    const valueLow = estimate ? whole(low) : undefined
    const valueHigh = estimate ? whole(high) : undefined
    const valid = (n: number | undefined) =>
      n === undefined || (Number.isInteger(n) && n >= 0)
    if (count === undefined || !valid(count)) {
      setError(l`Enter the count as a whole number.`)
      return
    }
    if (
      !valid(valueLow) ||
      !valid(valueHigh) ||
      (valueLow !== undefined && valueLow > count) ||
      (valueHigh !== undefined && valueHigh < count)
    ) {
      setError(l`The range must contain the count.`)
      return
    }
    const cumulative = MEASUREMENT_METRICS.find(
      m => m.value === metric,
    )?.cumulative
    add.mutate(
      {
        activity,
        measurement: {
          metric,
          value: count,
          valueLow,
          valueHigh,
          cumulative,
          method,
          methodNote: note.trim() || undefined,
          measuredAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          Toast.show(l`Count published`)
          onDone()
        },
        onError: err => setError(cleanError(err)),
      },
    )
  }

  return (
    <View style={[a.gap_md, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
      {!isOrganizer ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Shown as an independent count if you are an active member of this
            community; otherwise it is not shown.
          </Trans>
        </Text>
      ) : null}
      <ChoiceChips
        label={l`What you counted`}
        value={metric}
        onChange={setMetric}
        options={MEASUREMENT_METRICS.map(m => ({
          value: m.value,
          label: i18n._(m.label),
        }))}
      />
      <LabeledInput
        label={
          MEASUREMENT_METRICS.find(m => m.value === metric)?.cumulative
            ? l`Total so far`
            : l`Count`
        }
        value={value}
        onChange={setValue}
        keyboardType="number-pad"
      />
      <ChoiceChips
        label={l`How you counted`}
        value={method}
        onChange={setMethod}
        options={MEASUREMENT_METHODS.map(m => ({
          value: m.value,
          label: i18n._(m.label),
        }))}
      />
      {estimate ? (
        <View style={[a.flex_row, a.gap_sm]}>
          <View style={[a.flex_1]}>
            <LabeledInput
              label={l`At least`}
              value={low}
              onChange={setLow}
              keyboardType="number-pad"
            />
          </View>
          <View style={[a.flex_1]}>
            <LabeledInput
              label={l`At most`}
              value={high}
              onChange={setHigh}
              keyboardType="number-pad"
            />
          </View>
        </View>
      ) : null}
      <LabeledInput
        label={l`Who counted, and where (optional)`}
        value={note}
        onChange={setNote}
      />
      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}
      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          label={l`Cancel`}
          size="small"
          color="secondary"
          onPress={onDone}>
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        <Button
          label={l`Publish count`}
          size="small"
          color="primary"
          disabled={add.isPending}
          onPress={onSubmit}>
          <ButtonText>
            <Trans>Publish</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}
