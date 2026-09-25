import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  type EconomicActivityDetails,
  type EconomicActivitySale,
} from '#/lib/api/para-lexicons'
import {
  ECONOMIC_ACTIVITY_KINDS,
  type EconomicActivityKind,
  SALE_CHANNELS,
} from '#/lib/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {ChoiceChips} from '../ChoiceChips'
import {optionalMoney} from './FinancialPlanFields'
import {
  type Built,
  combineDateTime,
  DateTimeRow,
  optionalCount,
  Section,
  splitLines,
  TextRow,
  type Translate,
} from './FormBits'

type Row<T> = T & {key: number}

export type EconomicDraft = {
  kind: EconomicActivityKind
  sale: {
    channel: EconomicActivitySale['channel']
    items: Array<Row<{name: string; price: string; quantity: string}>>
  }
  raffle: {
    ticketPrice: string
    tickets: string
    prizes: Array<Row<{description: string; value: string}>>
    drawDate: string
    drawTime: string
    drawMethod: string
    permitReference: string
  }
  fundraiser: {
    purpose: string
    beneficiary: string
    suggestedDonation: string
    donationChannels: string
  }
}

let nextKey = 1
const newKey = () => nextKey++

export function emptyEconomicDraft(): EconomicDraft {
  return {
    kind: ECONOMIC_ACTIVITY_SALE,
    sale: {
      channel: 'in_person',
      items: [{key: newKey(), name: '', price: '', quantity: ''}],
    },
    raffle: {
      ticketPrice: '',
      tickets: '',
      prizes: [{key: newKey(), description: '', value: ''}],
      drawDate: '',
      drawTime: '18:00',
      drawMethod: '',
      permitReference: '',
    },
    fundraiser: {
      purpose: '',
      beneficiary: '',
      suggestedDonation: '',
      donationChannels: '',
    },
  }
}

const orUndefined = (value: string) => value.trim() || undefined

export function buildEconomicDetails(
  draft: EconomicDraft,
  _: Translate,
): Built<EconomicActivityDetails> {
  const problems: string[] = []
  const badMoney = () =>
    problems.push(_(msg`Amounts must be numbers with up to 2 decimals.`))
  const badCount = () =>
    problems.push(_(msg`Quantities must be whole numbers.`))

  if (draft.kind === ECONOMIC_ACTIVITY_SALE) {
    const rows = draft.sale.items.filter(
      row => row.name.trim() || row.price.trim(),
    )
    if (rows.length === 0) problems.push(_(msg`List at least one item.`))
    const names = new Set<string>()
    const items = rows.map(row => {
      const unitPriceMinor = optionalMoney(row.price)
      const quantityAvailable = optionalCount(row.quantity)
      if (!row.name.trim()) problems.push(_(msg`Every item needs a name.`))
      if (unitPriceMinor === undefined || Number.isNaN(unitPriceMinor)) {
        badMoney()
      }
      if (Number.isNaN(quantityAvailable)) badCount()
      // Ledger income entries point at items by name.
      if (names.has(row.name.trim())) {
        problems.push(_(msg`Item names must be unique.`))
      }
      names.add(row.name.trim())
      return {
        name: row.name.trim(),
        unitPriceMinor: unitPriceMinor ?? 0,
        quantityAvailable,
      }
    })
    return {
      problems,
      value: {
        $type: ECONOMIC_ACTIVITY_SALE,
        channel: draft.sale.channel,
        items,
      },
    }
  }

  if (draft.kind === ECONOMIC_ACTIVITY_RAFFLE) {
    const r = draft.raffle
    const ticketPriceMinor = optionalMoney(r.ticketPrice)
    const ticketsAvailable = optionalCount(r.tickets)
    const drawAt = combineDateTime(r.drawDate, r.drawTime)
    if (ticketPriceMinor === undefined || Number.isNaN(ticketPriceMinor)) {
      problems.push(_(msg`Set the ticket price.`))
    }
    if (!ticketsAvailable) {
      problems.push(_(msg`Set how many tickets will be sold.`))
    }
    const prizes = r.prizes
      .filter(p => p.description.trim())
      .map(p => {
        const estimatedValueMinor = optionalMoney(p.value)
        if (Number.isNaN(estimatedValueMinor)) badMoney()
        return {description: p.description.trim(), estimatedValueMinor}
      })
    if (prizes.length === 0) problems.push(_(msg`Describe at least one prize.`))
    if (!drawAt) problems.push(_(msg`Pick the draw date.`))
    if (!r.drawMethod.trim()) {
      problems.push(_(msg`Explain how the winner is drawn.`))
    }
    return {
      problems,
      value: {
        $type: ECONOMIC_ACTIVITY_RAFFLE,
        ticketPriceMinor: ticketPriceMinor ?? 0,
        ticketsAvailable: ticketsAvailable || 0,
        prizes,
        drawAt: drawAt ?? '',
        drawMethod: r.drawMethod.trim(),
        permitReference: orUndefined(r.permitReference),
      },
    }
  }

  const f = draft.fundraiser
  const suggestedDonationMinor = optionalMoney(f.suggestedDonation)
  if (!f.purpose.trim()) problems.push(_(msg`Say what the money is for.`))
  if (Number.isNaN(suggestedDonationMinor)) badMoney()
  return {
    problems,
    value: {
      $type: ECONOMIC_ACTIVITY_FUNDRAISER,
      purpose: f.purpose.trim(),
      beneficiary: orUndefined(f.beneficiary),
      suggestedDonationMinor,
      donationChannels: splitLines(f.donationChannels),
    },
  }
}

export function EconomicDetailsFields({
  draft,
  onChange,
  currency,
}: {
  draft: EconomicDraft
  onChange: (draft: EconomicDraft) => void
  currency: string
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const set = <K extends 'sale' | 'raffle' | 'fundraiser'>(
    key: K,
    patch: Partial<EconomicDraft[K]>,
  ) => onChange({...draft, [key]: {...draft[key], ...patch}})
  const priceLabel = _(msg`Price (${currency})`)

  return (
    <>
      <Section title={_(msg`What kind of economic activity?`)}>
        <ChoiceChips
          label={_(msg`Activity kind`)}
          value={draft.kind}
          onChange={kind => onChange({...draft, kind})}
          options={ECONOMIC_ACTIVITY_KINDS.map(kind => ({
            value: kind.value,
            label: `${kind.emoji} ${i18n._(kind.label)}`,
          }))}
        />
      </Section>

      {draft.kind === ECONOMIC_ACTIVITY_SALE ? (
        <Section
          title={_(msg`What is for sale`)}
          subtitle={_(
            msg`Prices are part of the commitment. Leave stock empty if it is open-ended.`,
          )}>
          <View style={[a.gap_sm]}>
            <TextField.LabelText>
              {_(msg`Where it is sold`)}
            </TextField.LabelText>
            <ChoiceChips
              label={_(msg`Sales channel`)}
              value={draft.sale.channel}
              onChange={channel => set('sale', {channel})}
              options={SALE_CHANNELS.map(c => ({
                value: c.value,
                label: i18n._(c.label),
              }))}
            />
          </View>
          {draft.sale.items.map((item, index) => {
            const setItem = (patch: Partial<typeof item>) =>
              set('sale', {
                items: draft.sale.items.map((row, i) =>
                  i === index ? {...row, ...patch} : row,
                ),
              })
            return (
              <View
                key={item.key}
                style={[
                  a.gap_sm,
                  a.p_md,
                  a.rounded_md,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <TextRow
                  label={_(msg`Item`)}
                  value={item.name}
                  onChange={name => setItem({name})}
                  maxLength={120}
                />
                <View style={[a.flex_row, a.gap_sm]}>
                  <View style={[a.flex_1]}>
                    <TextRow
                      label={priceLabel}
                      value={item.price}
                      onChange={price => setItem({price})}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                    />
                  </View>
                  <View style={[a.flex_1]}>
                    <TextRow
                      label={_(msg`Stock`)}
                      value={item.quantity}
                      onChange={quantity => setItem({quantity})}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                {draft.sale.items.length > 1 ? (
                  <RemoveButton
                    onPress={() =>
                      set('sale', {
                        items: draft.sale.items.filter((_r, i) => i !== index),
                      })
                    }
                  />
                ) : null}
              </View>
            )
          })}
          <AddButton
            label={_(msg`Add item`)}
            disabled={draft.sale.items.length >= 50}
            onPress={() =>
              set('sale', {
                items: [
                  ...draft.sale.items,
                  {key: newKey(), name: '', price: '', quantity: ''},
                ],
              })
            }
          />
        </Section>
      ) : null}

      {draft.kind === ECONOMIC_ACTIVITY_RAFFLE ? (
        <Section title={_(msg`Raffle terms`)}>
          <View style={[a.flex_row, a.gap_sm]}>
            <View style={[a.flex_1]}>
              <TextRow
                label={_(msg`Ticket price (${currency})`)}
                value={draft.raffle.ticketPrice}
                onChange={ticketPrice => set('raffle', {ticketPrice})}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View style={[a.flex_1]}>
              <TextRow
                label={_(msg`Tickets for sale`)}
                value={draft.raffle.tickets}
                onChange={tickets => set('raffle', {tickets})}
                keyboardType="number-pad"
              />
            </View>
          </View>
          {draft.raffle.prizes.map((prize, index) => {
            const setPrize = (patch: Partial<typeof prize>) =>
              set('raffle', {
                prizes: draft.raffle.prizes.map((row, i) =>
                  i === index ? {...row, ...patch} : row,
                ),
              })
            return (
              <View key={prize.key} style={[a.flex_row, a.gap_sm, a.align_end]}>
                <View style={[a.flex_1]}>
                  <TextRow
                    label={
                      index === 0 ? _(msg`Prize`) : _(msg`Prize ${index + 1}`)
                    }
                    value={prize.description}
                    onChange={description => setPrize({description})}
                    maxLength={300}
                  />
                </View>
                <View style={[{width: 120}]}>
                  <TextRow
                    label={_(msg`Value (optional)`)}
                    value={prize.value}
                    onChange={value => setPrize({value})}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            )
          })}
          <AddButton
            label={_(msg`Add prize`)}
            disabled={draft.raffle.prizes.length >= 20}
            onPress={() =>
              set('raffle', {
                prizes: [
                  ...draft.raffle.prizes,
                  {key: newKey(), description: '', value: ''},
                ],
              })
            }
          />
          <DateTimeRow
            dateLabel={_(msg`Draw date`)}
            date={draft.raffle.drawDate}
            onDate={drawDate => set('raffle', {drawDate})}
            time={draft.raffle.drawTime}
            onTime={drawTime => set('raffle', {drawTime})}
          />
          <TextRow
            label={_(msg`How the winner is drawn`)}
            placeholder={_(
              msg`e.g. Live-streamed draw from a sealed urn, witnessed by two members`,
            )}
            value={draft.raffle.drawMethod}
            onChange={drawMethod => set('raffle', {drawMethod})}
            multiline
            maxLength={1000}
          />
          <TextRow
            label={_(msg`Raffle permit number (if the law requires one)`)}
            value={draft.raffle.permitReference}
            onChange={permitReference => set('raffle', {permitReference})}
          />
        </Section>
      ) : null}

      {draft.kind === ECONOMIC_ACTIVITY_FUNDRAISER ? (
        <Section title={_(msg`Fundraiser`)}>
          <TextRow
            label={_(msg`What the money is for`)}
            value={draft.fundraiser.purpose}
            onChange={purpose => set('fundraiser', {purpose})}
            multiline
            maxLength={1000}
          />
          <TextRow
            label={_(msg`Beneficiary (optional)`)}
            value={draft.fundraiser.beneficiary}
            onChange={beneficiary => set('fundraiser', {beneficiary})}
          />
          <TextRow
            label={_(msg`Suggested donation (${currency}, optional)`)}
            value={draft.fundraiser.suggestedDonation}
            onChange={suggestedDonation =>
              set('fundraiser', {suggestedDonation})
            }
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <TextRow
            label={_(msg`How to give (one per line)`)}
            placeholder={_(
              msg`e.g. the organization's account, or the collection box at the assembly`,
            )}
            value={draft.fundraiser.donationChannels}
            onChange={donationChannels => set('fundraiser', {donationChannels})}
            multiline
          />
        </Section>
      ) : null}
    </>
  )
}

function AddButton({
  label,
  disabled,
  onPress,
}: {
  label: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Button
      label={label}
      size="small"
      color="secondary"
      style={[a.self_start]}
      disabled={disabled}
      onPress={onPress}>
      <ButtonText>{label}</ButtonText>
    </Button>
  )
}

function RemoveButton({onPress}: {onPress: () => void}) {
  const {_} = useLingui()
  return (
    <Button
      label={_(msg`Remove`)}
      size="tiny"
      color="negative_subtle"
      style={[a.self_start]}
      onPress={onPress}>
      <ButtonText>
        <Trans>Remove</Trans>
      </ButtonText>
    </Button>
  )
}
