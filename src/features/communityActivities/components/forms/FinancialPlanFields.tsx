import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  ALLOCATION_RECIPIENTS,
  formatBps,
  parsePercentToBps,
} from '#/lib/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {Text} from '#/components/Typography'
import {newKey, type PlanDraft} from '../../creation'
import {ChoiceChips} from '../ChoiceChips'
import {FieldGroup, Section, TextRow} from './FormBits'

export function FinancialPlanFields({
  draft,
  onChange,
  showFundingGoal,
}: {
  draft: PlanDraft
  onChange: (draft: PlanDraft) => void
  showFundingGoal: boolean
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const set = (patch: Partial<PlanDraft>) => onChange({...draft, ...patch})
  const setRow = (key: number, patch: Partial<PlanDraft['allocations'][0]>) =>
    set({
      allocations: draft.allocations.map(row =>
        row.key === key ? {...row, ...patch} : row,
      ),
    })
  const total = draft.allocations.reduce(
    (sum, row) => sum + (parsePercentToBps(row.percent) ?? 0),
    0,
  )
  return (
    <Section
      title={_(msg`Money plan`)}
      subtitle={_(
        msg`Decide where the money goes and whether percentages apply to all income or income after expenses. You will confirm these terms on review.`,
      )}>
      {showFundingGoal ? (
        <TextRow
          id="plan.fundingGoal"
          label={_(msg`Fundraising goal (optional)`)}
          value={draft.fundingGoal}
          onChange={fundingGoal => set({fundingGoal})}
          keyboardType="decimal-pad"
        />
      ) : null}
      <TextRow
        id="plan.expenseBudget"
        label={_(msg`Expense budget cap (optional)`)}
        value={draft.expenseBudget}
        onChange={expenseBudget => set({expenseBudget})}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />
      <TextField.LabelText>{_(msg`Percentages apply to`)}</TextField.LabelText>
      <ChoiceChips
        label={_(msg`Percentages apply to`)}
        value={draft.allocationBase}
        onChange={allocationBase => set({allocationBase})}
        options={[
          {value: 'net_proceeds', label: _(msg`Profit (income − expenses)`)},
          {value: 'gross_income', label: _(msg`All income`)},
        ]}
      />
      <FieldGroup id="plan.allocations">
        <TextField.LabelText>
          {_(msg`Where the money goes`)}
        </TextField.LabelText>
        {draft.allocations.map(row => (
          <View
            key={row.key}
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
              onChange={recipient => setRow(row.key, {recipient})}
              options={ALLOCATION_RECIPIENTS.map(r => ({
                value: r.value,
                label: i18n._(r.label),
              }))}
            />
            <TextRow
              id={`plan.allocations.${row.key}.label`}
              label={_(msg`Name of the recipient`)}
              value={row.label}
              onChange={label => setRow(row.key, {label})}
              maxLength={120}
            />
            <TextRow
              id={`plan.allocations.${row.key}.percent`}
              label={_(msg`Percentage`)}
              value={row.percent}
              onChange={percent => setRow(row.key, {percent})}
              keyboardType="decimal-pad"
              placeholder="%"
            />
            {draft.allocations.length > 1 ? (
              <Button
                label={_(msg`Remove destination`)}
                size="tiny"
                color="negative_subtle"
                style={[a.self_start]}
                onPress={() =>
                  set({
                    allocations: draft.allocations.filter(
                      r => r.key !== row.key,
                    ),
                  })
                }>
                <ButtonText>{_(msg`Remove`)}</ButtonText>
              </Button>
            ) : null}
          </View>
        ))}
        <Text
          style={[
            a.text_md,
            a.font_bold,
            {
              color:
                total === 10000
                  ? t.palette.positive_600
                  : t.palette.negative_500,
            },
          ]}>
          {_(msg`Total ${formatBps(total)}`)}
        </Text>
      </FieldGroup>
      <Button
        label={_(msg`Add destination`)}
        size="small"
        color="secondary"
        style={[a.self_start]}
        disabled={draft.allocations.length >= 10}
        onPress={() =>
          set({
            allocations: [
              ...draft.allocations,
              {key: newKey(), recipient: 'party', label: '', percent: ''},
            ],
          })
        }>
        <ButtonText>{_(msg`Add destination`)}</ButtonText>
      </Button>
    </Section>
  )
}
