import {useMemo} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommunityActivityAllocationBase,
  type CommunityActivityAllocationRecipient,
  type CommunityActivityFinancialPlan,
} from '#/lib/api/para-lexicons'
import {
  ALLOCATION_RECIPIENTS,
  BPS_TOTAL,
  formatBps,
  parseMoneyToMinor,
  parsePercentToBps,
  validateFinancialPlan,
} from '#/lib/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Text} from '#/components/Typography'
import {ChoiceChips} from '../ChoiceChips'
import {type Built, Section, TextRow, type Translate} from './FormBits'

export type PlanDraft = {
  currency: string
  allocationBase: CommunityActivityAllocationBase
  fundingGoal: string
  expenseBudget: string
  allocations: Array<{
    recipient: CommunityActivityAllocationRecipient
    label: string
    percent: string
  }>
  committed: boolean
}

export function emptyPlanDraft(communityName: string): PlanDraft {
  return {
    currency: 'MXN',
    allocationBase: 'net_proceeds',
    fundingGoal: '',
    expenseBudget: '',
    allocations: [
      {recipient: 'community', label: communityName, percent: '100'},
    ],
    committed: false,
  }
}

/** Empty → undefined; otherwise minor units, or NaN when unparseable. */
export function optionalMoney(input: string) {
  if (!input.trim()) return undefined
  return parseMoneyToMinor(input) ?? NaN
}

export function buildFinancialPlan(
  draft: PlanDraft,
  _: Translate,
): Built<CommunityActivityFinancialPlan> {
  const problems: string[] = []
  const fundingGoalMinor = optionalMoney(draft.fundingGoal)
  const expenseBudgetMinor = optionalMoney(draft.expenseBudget)
  if (Number.isNaN(fundingGoalMinor) || Number.isNaN(expenseBudgetMinor)) {
    problems.push(_(msg`Amounts must be numbers with up to 2 decimals.`))
  }
  const plan: CommunityActivityFinancialPlan = {
    currency: draft.currency.trim().toUpperCase(),
    allocationBase: draft.allocationBase,
    fundingGoalMinor,
    expenseBudgetMinor,
    allocations: draft.allocations.map(row => ({
      recipient: row.recipient,
      label: row.label.trim(),
      shareBps: parsePercentToBps(row.percent) ?? 0,
    })),
    committedAt: new Date().toISOString(),
  }
  for (const issue of validateFinancialPlan(plan)) {
    problems.push(
      {
        currency: _(msg`Use a 3-letter currency code, e.g. MXN.`),
        no_allocations: _(msg`Say where the money goes.`),
        allocation_label: _(msg`Every destination needs a name.`),
        allocation_share: _(
          msg`Every destination needs a percentage above zero.`,
        ),
        shares_total: _(msg`Destinations must add up to exactly 100%.`),
      }[issue],
    )
  }
  if (!draft.committed) {
    problems.push(_(msg`Confirm that you commit to this business model.`))
  }
  return {problems, value: plan}
}

export function FinancialPlanFields({
  draft,
  onChange,
}: {
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const set = (patch: Partial<PlanDraft>) => onChange({...draft, ...patch})
  const setRow = (index: number, patch: Partial<PlanDraft['allocations'][0]>) =>
    set({
      allocations: draft.allocations.map((row, i) =>
        i === index ? {...row, ...patch} : row,
      ),
    })
  const totalBps = useMemo(
    () =>
      draft.allocations.reduce(
        (sum, row) => sum + (parsePercentToBps(row.percent) ?? 0),
        0,
      ),
    [draft.allocations],
  )

  return (
    <Section
      title={_(msg`Business model`)}
      subtitle={_(
        msg`Decide where every peso goes before any money moves. The split and the prices above are fingerprinted into every ledger entry, so anyone can see if they change later.`,
      )}>
      <View style={[a.flex_row, a.gap_sm]}>
        <View style={[{width: 96}]}>
          <TextRow
            label={_(msg`Currency`)}
            value={draft.currency}
            onChange={currency => set({currency: currency.toUpperCase()})}
            maxLength={3}
          />
        </View>
        <View style={[a.flex_1]}>
          <TextRow
            label={_(msg`Fundraising goal (optional)`)}
            value={draft.fundingGoal}
            onChange={fundingGoal => set({fundingGoal})}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
      </View>
      <TextRow
        label={_(msg`Expense budget cap (optional)`)}
        value={draft.expenseBudget}
        onChange={expenseBudget => set({expenseBudget})}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      <View style={[a.gap_sm]}>
        <TextField.LabelText>
          <Trans>Percentages apply to</Trans>
        </TextField.LabelText>
        <ChoiceChips
          label={_(msg`Percentages apply to`)}
          value={draft.allocationBase}
          onChange={allocationBase => set({allocationBase})}
          options={[
            {value: 'net_proceeds', label: _(msg`Profit (income − expenses)`)},
            {value: 'gross_income', label: _(msg`All income`)},
          ]}
        />
      </View>

      <View style={[a.gap_md]}>
        <TextField.LabelText>
          <Trans>Where the money goes</Trans>
        </TextField.LabelText>
        {draft.allocations.map((row, index) => (
          <View
            key={index}
            style={[
              a.gap_sm,
              a.p_md,
              a.rounded_md,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <ChoiceChips
              label={_(msg`Recipient`)}
              value={row.recipient}
              onChange={recipient => setRow(index, {recipient})}
              options={ALLOCATION_RECIPIENTS.map(r => ({
                value: r.value,
                label: i18n._(r.label),
              }))}
            />
            <View style={[a.flex_row, a.gap_sm, a.align_end]}>
              <View style={[a.flex_1]}>
                <TextField.Root>
                  <TextField.Input
                    label={_(msg`Name of the recipient`)}
                    placeholder={_(msg`Name of the recipient`)}
                    value={row.label}
                    onChangeText={label => setRow(index, {label})}
                    maxLength={120}
                  />
                </TextField.Root>
              </View>
              <View style={[{width: 88}]}>
                <TextField.Root>
                  <TextField.Input
                    label={_(msg`Percentage`)}
                    placeholder="%"
                    value={row.percent}
                    onChangeText={percent => setRow(index, {percent})}
                    keyboardType="decimal-pad"
                  />
                  <TextField.SuffixText label="%">%</TextField.SuffixText>
                </TextField.Root>
              </View>
            </View>
            {draft.allocations.length > 1 ? (
              <Button
                label={_(msg`Remove destination`)}
                size="tiny"
                color="negative_subtle"
                style={[a.self_start]}
                onPress={() =>
                  set({
                    allocations: draft.allocations.filter(
                      (_row, i) => i !== index,
                    ),
                  })
                }>
                <ButtonText>
                  <Trans>Remove</Trans>
                </ButtonText>
              </Button>
            ) : null}
          </View>
        ))}
        <View style={[a.flex_row, a.justify_between, a.align_center]}>
          <Button
            label={_(msg`Add destination`)}
            size="small"
            color="secondary"
            disabled={draft.allocations.length >= 10}
            onPress={() =>
              set({
                allocations: [
                  ...draft.allocations,
                  {recipient: 'party', label: '', percent: ''},
                ],
              })
            }>
            <ButtonText>
              <Trans>Add destination</Trans>
            </ButtonText>
          </Button>
          <Text
            style={[
              a.text_md,
              a.font_bold,
              {
                color:
                  totalBps === BPS_TOTAL
                    ? t.palette.positive_600
                    : t.palette.negative_500,
              },
            ]}>
            <Trans>Total {formatBps(totalBps)}</Trans>
          </Text>
        </View>
      </View>

      <Toggle.Item
        name="commit"
        label={_(msg`I commit to this business model`)}
        value={draft.committed}
        onChange={committed => set({committed})}>
        <Toggle.Checkbox />
        <Toggle.LabelText style={[a.flex_1]}>
          <Trans>
            I commit to these prices and this split. I will book every income,
            expense and donation in the public ledger.
          </Trans>
        </Toggle.LabelText>
      </Toggle.Item>
    </Section>
  )
}
