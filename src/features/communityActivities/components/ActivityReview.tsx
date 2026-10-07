import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

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
  ALLOCATION_RECIPIENTS,
  ASSEMBLY_FORMATS,
  formatBps,
  formatMinor,
  getActivityKindMeta,
  INSTRUMENT_TYPES,
  PERMIT_STATUSES,
  SALE_CHANNELS,
} from '#/lib/community-activities'
import {type CreateCommunityActivityInput} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {type CreationStep} from '../creation'
import {Section} from './forms/FormBits'

export function ActivityReview({
  input,
  communityName,
  timezone,
  onEdit,
  disabled,
}: {
  input: CreateCommunityActivityInput
  communityName: string
  timezone: string
  onEdit: (step: CreationStep) => void
  disabled?: boolean
}) {
  const {_, i18n} = useLingui()
  const record = input.record
  const d = record.details
  const fmt = (iso?: string) =>
    iso
      ? i18n.date(new Date(iso), {dateStyle: 'medium', timeStyle: 'short'})
      : undefined
  const money = (amount?: number) =>
    amount !== undefined && input.category === 'economic'
      ? formatMinor(amount, input.record.financialPlan.currency)
      : undefined
  const edit = (step: CreationStep) => (
    <Button
      disabled={disabled}
      label={_(
        msg`Edit ${step === 'basics' ? _(msg`Basics`) : step === 'money' ? _(msg`Money plan`) : _(msg`Activity details`)}`,
      )}
      size="small"
      color="secondary"
      style={[a.self_start]}
      onPress={() => onEdit(step)}>
      <ButtonText>{_(msg`Edit`)}</ButtonText>
    </Button>
  )
  const format = (value: string) => {
    const option = ASSEMBLY_FORMATS.find(f => f.value === value)
    return option ? i18n._(option.label) : value
  }
  let rows: Array<{label: string; value?: string}> = []
  const row = (
    label: string,
    value: string | number | string[] | undefined,
  ) => ({
    label,
    value: Array.isArray(value)
      ? value.join('\n') || undefined
      : value === undefined
        ? undefined
        : String(value),
  })
  switch (d.$type) {
    case SOCIAL_ACTIVITY_PEACEFUL_MARCH:
      rows = [
        row(_(msg`Meeting point`), d.meetingPoint),
        row(_(msg`Route`), d.route),
        row(_(msg`Destination`), d.destination),
        row(
          _(msg`Permit status`),
          i18n._(PERMIT_STATUSES.find(p => p.value === d.permitStatus)!.label),
        ),
        row(_(msg`Permit or folio number (optional)`), d.permitReference),
        row(_(msg`Expected attendance`), d.expectedAttendance),
        row(_(msg`Safety or logistics contact`), d.safetyContact),
        row(_(msg`Accessibility notes`), d.accessibilityNotes),
      ]
      break
    case SOCIAL_ACTIVITY_SIGNATURE_DRIVE:
      rows = [
        row(
          _(msg`Instrument type`),
          i18n._(
            INSTRUMENT_TYPES.find(p => p.value === d.instrumentType)!.label,
          ),
        ),
        row(_(msg`Name of the bill, law or initiative`), d.instrumentTitle),
        row(_(msg`Link to the text (optional)`), d.instrumentUrl),
        row(_(msg`Signatures needed`), d.targetSignatures),
        row(_(msg`Deadline (optional)`), fmt(d.deadline)),
        row(_(msg`Collection points (one per line)`), d.collectionPoints),
        row(_(msg`What signers need`), d.signerRequirements),
      ]
      break
    case SOCIAL_ACTIVITY_ASSEMBLY:
      rows = [
        row(_(msg`Format`), format(d.format)),
        row(_(msg`Link to join`), d.meetingUrl),
        row(_(msg`Agenda (one item per line)`), d.agenda),
        row(_(msg`Quorum required (optional)`), d.quorumRequired),
      ]
      break
    case SOCIAL_ACTIVITY_CABILDEO:
      rows = [
        row(_(msg`Format`), format(d.format)),
        row(_(msg`Link to join`), d.meetingUrl),
        row(_(msg`Who took part (one per line)`), d.participants),
        row(_(msg`What was argued (one point per line)`), d.arguments),
        row(_(msg`Where it landed (optional)`), d.outcome),
        row(_(msg`Link to the recording (optional)`), d.recordingUrl),
      ]
      break
    case ECONOMIC_ACTIVITY_SALE:
      rows = [
        row(
          _(msg`Sales channel`),
          i18n._(SALE_CHANNELS.find(c => c.value === d.channel)!.label),
        ),
        ...d.items.flatMap(item => [
          row(item.name, money(item.unitPriceMinor)),
          row(_(msg`Stock: ${item.name}`), item.quantityAvailable),
        ]),
      ]
      break
    case ECONOMIC_ACTIVITY_RAFFLE:
      rows = [
        row(_(msg`Ticket price`), money(d.ticketPriceMinor)),
        row(_(msg`Tickets for sale`), d.ticketsAvailable),
        ...d.prizes.map((prize, index) =>
          row(
            _(msg`Prize ${index + 1}`),
            [prize.description, money(prize.estimatedValueMinor)]
              .filter(Boolean)
              .join(' · '),
          ),
        ),
        row(_(msg`Draw date`), fmt(d.drawAt)),
        row(_(msg`How the winner is drawn`), d.drawMethod),
        row(_(msg`Raffle permit number (optional)`), d.permitReference),
      ]
      break
    case ECONOMIC_ACTIVITY_FUNDRAISER:
      rows = [
        row(_(msg`What the money is for`), d.purpose),
        row(_(msg`Beneficiary (optional)`), d.beneficiary),
        row(_(msg`Suggested donation`), money(d.suggestedDonationMinor)),
        row(_(msg`How to give (one per line)`), d.donationChannels),
      ]
      break
  }
  return (
    <>
      <Section title={_(msg`Basics`)}>
        <Row label={_(msg`Community`)} value={communityName} />
        <Row
          label={_(msg`Activity kind`)}
          value={i18n._(getActivityKindMeta(d.$type).label)}
        />
        <Button
          disabled={disabled}
          label={_(msg`Edit activity type`)}
          size="small"
          color="secondary"
          style={[a.self_start]}
          onPress={() => onEdit('type')}>
          <ButtonText>{_(msg`Edit activity type`)}</ButtonText>
        </Button>
        <Row label={_(msg`Title`)} value={record.title} />
        <Row label={_(msg`Description`)} value={record.description} />
        <Row label={_(msg`Starts`)} value={fmt(record.startsAt)} />
        <Row label={_(msg`Ends (optional)`)} value={fmt(record.endsAt)} />
        <Row label={_(msg`Location`)} value={record.location} />
        <Text style={[a.text_sm]}>
          {_(msg`Times use your device timezone: ${timezone}.`)}
        </Text>
        {edit('basics')}
      </Section>
      <Section title={_(msg`Activity details`)}>
        {rows.map((item, index) => (
          <Row key={index} label={item.label} value={item.value} />
        ))}
        {edit('details')}
      </Section>
      {input.category === 'economic' ? (
        <Section
          title={_(msg`Money plan`)}
          subtitle={_(
            msg`These prices and money destinations become the committed terms of your activity. Review them before publishing.`,
          )}>
          <Row
            label={_(msg`Currency`)}
            value={input.record.financialPlan.currency}
          />
          <Row
            label={_(msg`Fundraising goal (optional)`)}
            value={money(input.record.financialPlan.fundingGoalMinor)}
          />
          <Row
            label={_(msg`Expense budget cap (optional)`)}
            value={money(input.record.financialPlan.expenseBudgetMinor)}
          />
          <Row
            label={_(msg`Percentages apply to`)}
            value={
              input.record.financialPlan.allocationBase === 'net_proceeds'
                ? _(msg`Profit (income − expenses)`)
                : _(msg`All income`)
            }
          />
          {input.record.financialPlan.allocations.map((allocation, index) => (
            <Row
              key={index}
              label={`${allocation.label} (${i18n._(ALLOCATION_RECIPIENTS.find(r => r.value === allocation.recipient)!.label)})`}
              value={formatBps(allocation.shareBps)}
            />
          ))}
          <Row label={_(msg`Total`)} value="100%" />
          {edit('money')}
        </Section>
      ) : null}
    </>
  )
}

// Stack labels and values so long descriptions and links remain readable on phones.
function Row({label, value}: {label: string; value?: string}) {
  const t = useTheme()
  if (value === undefined || value === '') return null
  return (
    <View style={[a.gap_xs]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>{label}</Text>
      <Text style={[a.text_md, a.leading_snug]}>{value}</Text>
    </View>
  )
}
