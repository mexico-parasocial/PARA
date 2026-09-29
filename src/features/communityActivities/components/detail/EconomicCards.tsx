import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommunityActivityLedgerEntryType,
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  type EconomicActivityRaffle,
} from '#/lib/api/para-lexicons'
import {
  ALLOCATION_RECIPIENTS,
  committedUnitPrice,
  computeTermsDigest,
  EXPENSE_CATEGORIES,
  formatBps,
  formatMinor,
  LEDGER_ENTRY_TYPES,
  type LedgerSummary,
  parseMoneyToMinor,
  SALE_CHANNELS,
} from '#/lib/community-activities'
import {cleanError} from '#/lib/strings/errors'
import {
  type CommunityLedgerEntryView,
  type EconomicActivityView,
  useAddLedgerEntryMutation,
  useUpdateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {DateField} from '#/components/forms/DateField'
import * as TextField from '#/components/forms/TextField'
import {InlineLinkText} from '#/components/Link'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {ChoiceChips} from '../ChoiceChips'
import {BulletList, Card, ProgressBar, Row, Warning} from './CardBits'

/** The committed offer: what is sold, at what price, or what is raised for. */
export function EconomicTermsCard({
  activity,
  isOrganizer,
}: {
  activity: EconomicActivityView
  isOrganizer: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {details, financialPlan} = activity.record
  const money = (minor: number | undefined) =>
    minor !== undefined ? formatMinor(minor, financialPlan.currency) : undefined

  if (details.$type === ECONOMIC_ACTIVITY_SALE) {
    const channel = SALE_CHANNELS.find(c => c.value === details.channel)
    return (
      <Card
        title={_(msg`For sale`)}
        subtitle={channel ? i18n._(channel.label) : undefined}>
        {details.items.map(item => (
          <View
            key={item.name}
            style={[a.flex_row, a.justify_between, a.gap_md]}>
            <Text style={[a.text_sm, a.flex_1]}>{item.name}</Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {item.quantityAvailable !== undefined
                ? _(msg`${i18n.number(item.quantityAvailable)} available`)
                : ''}
            </Text>
            <Text style={[a.text_sm, a.font_bold]}>
              {money(item.unitPriceMinor)}
            </Text>
          </View>
        ))}
      </Card>
    )
  }

  if (details.$type === ECONOMIC_ACTIVITY_RAFFLE) {
    return (
      <Card title={_(msg`Raffle terms`)}>
        <Row
          label={_(msg`Ticket price`)}
          value={money(details.ticketPriceMinor)}
          emphasis
        />
        <Row
          label={_(msg`Tickets for sale`)}
          value={i18n.number(details.ticketsAvailable)}
        />
        {details.prizes.map((prize, index) => (
          <Row
            key={index}
            label={
              details.prizes.length > 1
                ? _(msg`Prize ${index + 1}`)
                : _(msg`Prize`)
            }
            value={[prize.description, money(prize.estimatedValueMinor)]
              .filter(Boolean)
              .join(' · ')}
          />
        ))}
        <Row
          label={_(msg`Draw`)}
          value={i18n.date(new Date(details.drawAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        />
        <Row label={_(msg`Method`)} value={details.drawMethod} />
        <Row label={_(msg`Permit`)} value={details.permitReference} />
        <Row
          label={_(msg`Winning tickets`)}
          value={
            details.winningTickets?.length
              ? details.winningTickets.join(', ')
              : _(msg`Not drawn yet`)
          }
          emphasis
        />
        {isOrganizer && !details.winningTickets?.length ? (
          <PublishWinnersForm activity={activity} raffle={details} />
        ) : null}
      </Card>
    )
  }

  if (details.$type === ECONOMIC_ACTIVITY_FUNDRAISER) {
    return (
      <Card title={_(msg`Fundraiser`)}>
        <Text style={[a.text_md, a.leading_snug]}>{details.purpose}</Text>
        <Row label={_(msg`Beneficiary`)} value={details.beneficiary} />
        <Row
          label={_(msg`Suggested donation`)}
          value={money(details.suggestedDonationMinor)}
        />
        <BulletList
          title={_(msg`How to give`)}
          items={details.donationChannels}
        />
      </Card>
    )
  }

  return null
}

function PublishWinnersForm({
  activity,
  raffle,
}: {
  activity: EconomicActivityView
  raffle: EconomicActivityRaffle
}) {
  const {_} = useLingui()
  const update = useUpdateCommunityActivityMutation()
  const [input, setInput] = useState('')
  const tickets = input
    .split(/[,\s]+/)
    .map(ticket => ticket.trim())
    .filter(Boolean)

  return (
    <View style={[a.flex_row, a.gap_sm, a.align_center]}>
      <View style={[a.flex_1]}>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Winning tickets`)}
            placeholder={_(msg`Winning ticket numbers, comma separated`)}
            value={input}
            onChangeText={setInput}
          />
        </TextField.Root>
      </View>
      <Button
        label={_(msg`Publish the winning tickets`)}
        size="small"
        color="primary"
        disabled={update.isPending || tickets.length === 0}
        onPress={() =>
          update.mutate(
            {
              activity,
              changes: {details: {...raffle, winningTickets: tickets}},
            },
            {onError: err => Toast.show(cleanError(err), {type: 'error'})},
          )
        }>
        <ButtonText>
          <Trans>Publish</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}

export function BusinessModelCard({
  activity,
}: {
  activity: EconomicActivityView
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const plan = activity.record.financialPlan
  const digest = useMemo(
    () => computeTermsDigest(activity.record),
    [activity.record],
  )
  const money = (minor: number) => formatMinor(minor, plan.currency)

  return (
    <Card
      title={_(msg`Business model`)}
      subtitle={_(
        msg`Committed ${i18n.date(new Date(plan.committedAt), {
          dateStyle: 'medium',
        })} before any money moved.`,
      )}>
      <Row
        label={_(msg`Goal`)}
        value={
          plan.fundingGoalMinor !== undefined
            ? money(plan.fundingGoalMinor)
            : undefined
        }
      />
      <Row
        label={_(msg`Expense budget`)}
        value={
          plan.expenseBudgetMinor !== undefined
            ? money(plan.expenseBudgetMinor)
            : undefined
        }
      />
      <Text style={[a.text_sm, a.font_semi_bold, a.mt_sm]}>
        {plan.allocationBase === 'gross_income'
          ? _(msg`Of all income:`)
          : _(msg`Of the profit (income − expenses):`)}
      </Text>
      {plan.allocations.map((allocation, index) => {
        const recipient = ALLOCATION_RECIPIENTS.find(
          r => r.value === allocation.recipient,
        )
        return (
          <Row
            key={index}
            label={`${allocation.label}${
              recipient ? ` (${i18n._(recipient.label)})` : ''
            }`}
            value={formatBps(allocation.shareBps)}
            emphasis
          />
        )
      })}
      <Text
        selectable
        style={[
          a.text_xs,
          t.atoms.text_contrast_medium,
          {fontFamily: 'monospace'},
        ]}>
        <Trans>Terms fingerprint {digest.slice(0, 16)}</Trans>
      </Text>
    </Card>
  )
}

export function TransparencyCard({
  summary,
  unitLabel,
}: {
  summary: LedgerSummary
  /** "tickets" or "units"; omitted when the activity sells nothing. */
  unitLabel?: string
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const money = (minor: number) => formatMinor(minor, summary.currency)
  const oversold =
    summary.unitsAvailable !== undefined &&
    summary.unitsSold > summary.unitsAvailable
  const warnings = [
    summary.staleEntryCount > 0 &&
      _(
        msg`${summary.staleEntryCount} ledger entries were booked under different terms. The split or the prices changed after money moved.`,
      ),
    summary.mispricedEntryCount > 0 &&
      _(
        msg`${summary.mispricedEntryCount} income entries do not match quantity × the committed price.`,
      ),
    oversold &&
      _(
        msg`More units were reported sold (${summary.unitsSold}) than were offered (${summary.unitsAvailable ?? 0}).`,
      ),
    summary.budgetOverrunMinor > 0 &&
      _(
        msg`Expenses exceed the committed budget by ${money(summary.budgetOverrunMinor)}.`,
      ),
    summary.unplannedDeliveredMinor > 0 &&
      _(
        msg`${money(summary.unplannedDeliveredMinor)} went to recipients that are not in the plan.`,
      ),
    summary.foreignCurrencyEntryCount > 0 &&
      _(
        msg`${summary.foreignCurrencyEntryCount} entries use another currency and are left out of the totals.`,
      ),
  ].filter((w): w is string => Boolean(w))

  return (
    <Card
      title={_(msg`Where the money is`)}
      subtitle={_(
        msg`Computed from the ledger below and the committed business model.`,
      )}>
      {summary.fundingGoalProgressBps !== undefined ? (
        <View style={[a.gap_xs]}>
          <ProgressBar bps={summary.fundingGoalProgressBps} />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              {formatBps(summary.fundingGoalProgressBps)} of the goal raised
            </Trans>
          </Text>
        </View>
      ) : null}
      {unitLabel && summary.unitsAvailable !== undefined ? (
        <View style={[a.gap_xs]}>
          <ProgressBar
            bps={Math.floor(
              (summary.unitsSold * 10000) / Math.max(1, summary.unitsAvailable),
            )}
          />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {i18n.number(summary.unitsSold)} /{' '}
            {i18n.number(summary.unitsAvailable)} {unitLabel}
          </Text>
        </View>
      ) : null}
      <Row label={_(msg`Income`)} value={money(summary.incomeMinor)} />
      <Row label={_(msg`Expenses`)} value={`−${money(summary.expenseMinor)}`} />
      <Row
        label={_(msg`Profit`)}
        value={money(summary.netProceedsMinor)}
        emphasis
      />
      <View style={[a.gap_sm, a.mt_sm]}>
        {summary.settlements.map((settlement, index) => (
          <View
            key={index}
            style={[a.p_md, a.gap_xs, a.rounded_sm, t.atoms.bg_contrast_25]}>
            <Text style={[a.text_sm, a.font_bold]}>
              {settlement.label} · {formatBps(settlement.shareBps)}
            </Text>
            <Row
              label={_(msg`Owed under the plan`)}
              value={money(settlement.committedMinor)}
            />
            <Row
              label={_(msg`Delivered`)}
              value={money(settlement.deliveredMinor)}
            />
            <Row
              label={_(msg`Pending`)}
              value={money(settlement.outstandingMinor)}
              emphasis
            />
          </View>
        ))}
      </View>
      {warnings.map(warning => (
        <Warning key={warning}>{warning}</Warning>
      ))}
    </Card>
  )
}

export function LedgerCard({
  activity,
  ledger,
  isOrganizer,
}: {
  activity: EconomicActivityView
  ledger: CommunityLedgerEntryView[]
  isOrganizer: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const digest = useMemo(
    () => computeTermsDigest(activity.record),
    [activity.record],
  )
  const [isAdding, setIsAdding] = useState(false)

  return (
    <Card
      title={_(msg`Public ledger`)}
      subtitle={_(
        msg`Every entry is a signed record in the organizer's account.`,
      )}>
      {isOrganizer ? (
        isAdding ? (
          <LedgerEntryForm
            activity={activity}
            onDone={() => setIsAdding(false)}
          />
        ) : (
          <Button
            label={_(msg`Book a ledger entry`)}
            size="small"
            color="primary"
            style={[a.self_start]}
            onPress={() => setIsAdding(true)}>
            <ButtonText>
              <Trans>Book an entry</Trans>
            </ButtonText>
          </Button>
        )
      ) : null}
      {ledger.length === 0 ? (
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>No money has moved yet.</Trans>
        </Text>
      ) : (
        ledger.map(({uri, record}) => {
          const type = LEDGER_ENTRY_TYPES.find(
            e => e.value === record.entryType,
          )
          const sign = record.entryType === 'income' ? '+' : '−'
          return (
            <View
              key={uri}
              style={[
                a.gap_2xs,
                a.pt_sm,
                a.border_t,
                t.atoms.border_contrast_low,
              ]}>
              <View style={[a.flex_row, a.justify_between, a.gap_md]}>
                <Text style={[a.text_sm, a.font_semi_bold, a.flex_1]}>
                  {record.description}
                </Text>
                <Text
                  style={[
                    a.text_sm,
                    a.font_bold,
                    {
                      color:
                        record.entryType === 'income'
                          ? t.palette.positive_600
                          : t.atoms.text.color,
                    },
                  ]}>
                  {sign}
                  {formatMinor(record.amountMinor, record.currency)}
                </Text>
              </View>
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {[
                  type ? i18n._(type.label) : record.entryType,
                  record.quantity
                    ? `${i18n.number(record.quantity)} × ${record.itemName ?? ''}`.trim()
                    : record.itemName,
                  record.category,
                  record.recipient ? `→ ${record.recipient}` : undefined,
                  i18n.date(new Date(record.occurredAt), {dateStyle: 'medium'}),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {record.receiptUrl ? (
                <InlineLinkText
                  to={record.receiptUrl}
                  label={_(msg`Receipt`)}
                  style={[a.text_xs]}>
                  {_(msg`Receipt`)}
                </InlineLinkText>
              ) : null}
              {record.termsDigest !== digest ? (
                <Text style={[a.text_xs, {color: t.palette.negative_600}]}>
                  ⚠️ <Trans>Booked under earlier terms</Trans>
                </Text>
              ) : null}
            </View>
          )
        })
      )}
    </Card>
  )
}

function LedgerEntryForm({
  activity,
  onDone,
}: {
  activity: EconomicActivityView
  onDone: () => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {details, financialPlan: plan} = activity.record
  const add = useAddLedgerEntryMutation()
  const [entryType, setEntryType] =
    useState<CommunityActivityLedgerEntryType>('income')
  const [itemName, setItemName] = useState(
    details.$type === ECONOMIC_ACTIVITY_SALE ? details.items[0]?.name : '',
  )
  const [quantity, setQuantity] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string>('other')
  const [recipient, setRecipient] = useState<string>(
    plan.allocations[0]?.recipient ?? 'community',
  )
  const [receiptUrl, setReceiptUrl] = useState('')
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().slice(0, 10),
  )
  const [error, setError] = useState<string>()

  // Sales and raffles book income by quantity so it can be checked against
  // the committed price; the amount follows unless the organizer overrides it.
  const sellsUnits = details.$type !== ECONOMIC_ACTIVITY_FUNDRAISER
  const countsUnits = entryType === 'income' && sellsUnits
  const unitPrice = committedUnitPrice(details, itemName)
  const onQuantity = (value: string) => {
    setQuantity(value)
    const units = Number(value)
    if (unitPrice !== undefined && Number.isInteger(units) && units > 0) {
      setAmount(((units * unitPrice) / 100).toFixed(2))
    }
  }
  const incomeCategory =
    details.$type === ECONOMIC_ACTIVITY_RAFFLE
      ? 'tickets'
      : details.$type === ECONOMIC_ACTIVITY_SALE
        ? 'sales'
        : 'other'

  const onSubmit = () => {
    const amountMinor = parseMoneyToMinor(amount)
    const units = quantity.trim() ? Number(quantity) : undefined
    if (!amountMinor) {
      setError(_(msg`Enter an amount greater than zero.`))
      return
    }
    if (units !== undefined && (!Number.isInteger(units) || units < 1)) {
      setError(_(msg`Quantity must be a whole number.`))
      return
    }
    if (!description.trim()) {
      setError(_(msg`Describe the entry.`))
      return
    }
    const occurredAt = new Date(`${occurredOn}T12:00:00`)
    add.mutate(
      {
        activity,
        entry: {
          entryType,
          amountMinor,
          quantity: countsUnits ? units : undefined,
          itemName:
            countsUnits && details.$type === ECONOMIC_ACTIVITY_SALE
              ? itemName
              : undefined,
          description: description.trim(),
          category:
            entryType === 'income'
              ? incomeCategory
              : entryType === 'expense'
                ? category
                : undefined,
          recipient: entryType === 'donation' ? recipient : undefined,
          receiptUrl: receiptUrl.trim() || undefined,
          occurredAt: Number.isNaN(occurredAt.getTime())
            ? new Date().toISOString()
            : occurredAt.toISOString(),
        },
      },
      {
        onSuccess: () => {
          Toast.show(_(msg`Entry booked`))
          onDone()
        },
        onError: err => setError(cleanError(err)),
      },
    )
  }

  return (
    <View style={[a.gap_md, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
      <ChoiceChips
        label={_(msg`Entry type`)}
        value={entryType}
        onChange={value => {
          setEntryType(value)
          setCategory('other')
        }}
        options={LEDGER_ENTRY_TYPES.map(e => ({
          value: e.value,
          label: i18n._(e.label),
        }))}
      />
      {countsUnits && details.$type === ECONOMIC_ACTIVITY_SALE ? (
        <ChoiceChips
          label={_(msg`Item sold`)}
          value={itemName ?? ''}
          onChange={setItemName}
          options={details.items.map(item => ({
            value: item.name,
            label: item.name,
          }))}
        />
      ) : null}
      {countsUnits ? (
        <LabeledInput
          label={
            details.$type === ECONOMIC_ACTIVITY_RAFFLE
              ? _(msg`Tickets sold`)
              : _(msg`Units sold`)
          }
          value={quantity}
          onChange={onQuantity}
          keyboardType="number-pad"
        />
      ) : null}
      <LabeledInput
        label={_(msg`Amount (${plan.currency})`)}
        value={amount}
        onChange={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <LabeledInput
        label={_(msg`Description`)}
        value={description}
        onChange={setDescription}
      />
      {entryType === 'expense' ? (
        <ChoiceChips
          label={_(msg`Category`)}
          value={category}
          onChange={setCategory}
          options={EXPENSE_CATEGORIES.map(c => ({value: c, label: c}))}
        />
      ) : null}
      {entryType === 'donation' ? (
        <View style={[a.gap_xs]}>
          <TextField.LabelText>
            <Trans>Delivered to</Trans>
          </TextField.LabelText>
          <ChoiceChips
            label={_(msg`Delivered to`)}
            value={recipient}
            onChange={setRecipient}
            options={plan.allocations.map(allocation => ({
              value: allocation.recipient,
              label: allocation.label,
            }))}
          />
        </View>
      ) : null}
      <View>
        <TextField.LabelText>
          <Trans>Date</Trans>
        </TextField.LabelText>
        <DateField
          label={_(msg`Date`)}
          value={occurredOn}
          onChangeDate={setOccurredOn}
          maximumDate={new Date()}
        />
      </View>
      <LabeledInput
        label={_(msg`Receipt link (optional)`)}
        value={receiptUrl}
        onChange={setReceiptUrl}
        keyboardType="url"
        placeholder="https://"
      />
      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}
      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          label={_(msg`Cancel`)}
          size="small"
          color="secondary"
          onPress={onDone}>
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Book entry`)}
          size="small"
          color="primary"
          disabled={add.isPending}
          onPress={onSubmit}>
          <ButtonText>
            <Trans>Book entry</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

function LabeledInput({
  label,
  value,
  onChange,
  keyboardType,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  keyboardType?: 'number-pad' | 'decimal-pad' | 'url'
  placeholder?: string
}) {
  return (
    <View>
      <TextField.LabelText>{label}</TextField.LabelText>
      <TextField.Root>
        <TextField.Input
          label={label}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'url' ? 'none' : undefined}
          placeholder={placeholder ?? null}
        />
      </TextField.Root>
    </View>
  )
}
