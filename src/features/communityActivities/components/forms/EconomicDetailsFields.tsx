import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
} from '#/lib/api/para-lexicons'
import {SALE_CHANNELS} from '#/lib/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import {type EconomicDraft, newKey} from '../../creation'
import {ChoiceChips} from '../ChoiceChips'
import {DateTimeRow, FieldGroup, Section, TextRow} from './FormBits'

export function EconomicDetailsFields({
  draft,
  onChange,
  currency,
  fundingGoal,
  onFundingGoal,
}: {
  draft: EconomicDraft
  onChange: (draft: EconomicDraft) => void
  currency: string
  fundingGoal: string
  onFundingGoal: (value: string) => void
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
          <FieldGroup id="sale.items">
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
                    id={`sale.items.${item.key}.name`}
                    label={_(msg`Item`)}
                    value={item.name}
                    onChange={name => setItem({name})}
                    maxLength={120}
                  />
                  <View style={[a.flex_row, a.gap_sm]}>
                    <View style={[a.flex_1]}>
                      <TextRow
                        id={`sale.items.${item.key}.price`}
                        label={priceLabel}
                        value={item.price}
                        onChange={price => setItem({price})}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                      />
                    </View>
                    <View style={[a.flex_1]}>
                      <TextRow
                        id={`sale.items.${item.key}.quantity`}
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
                          items: draft.sale.items.filter(
                            (_r, i) => i !== index,
                          ),
                        })
                      }
                    />
                  ) : null}
                </View>
              )
            })}
          </FieldGroup>
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
        <Section
          title={_(msg`Raffle terms`)}
          subtitle={_(
            msg`Describe the tickets, prizes, draw schedule, and how a winner will be chosen.`,
          )}>
          <View style={[a.flex_row, a.gap_sm]}>
            <View style={[a.flex_1]}>
              <TextRow
                id="raffle.ticketPrice"
                label={_(msg`Ticket price (${currency})`)}
                value={draft.raffle.ticketPrice}
                onChange={ticketPrice => set('raffle', {ticketPrice})}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View style={[a.flex_1]}>
              <TextRow
                id="raffle.tickets"
                label={_(msg`Tickets for sale`)}
                value={draft.raffle.tickets}
                onChange={tickets => set('raffle', {tickets})}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <FieldGroup id="raffle.prizes">
            {draft.raffle.prizes.map((prize, index) => {
              const setPrize = (patch: Partial<typeof prize>) =>
                set('raffle', {
                  prizes: draft.raffle.prizes.map((row, i) =>
                    i === index ? {...row, ...patch} : row,
                  ),
                })
              return (
                <View key={prize.key} style={[a.gap_sm]}>
                  <View style={[a.flex_1]}>
                    <TextRow
                      id={`raffle.prizes.${prize.key}.description`}
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
                      id={`raffle.prizes.${prize.key}.value`}
                      label={_(msg`Value (optional)`)}
                      value={prize.value}
                      onChange={value => setPrize({value})}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  {draft.raffle.prizes.length > 1 ? (
                    <RemoveButton
                      onPress={() =>
                        set('raffle', {
                          prizes: draft.raffle.prizes.filter(
                            row => row.key !== prize.key,
                          ),
                        })
                      }
                    />
                  ) : null}
                </View>
              )
            })}
          </FieldGroup>
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
            id="raffle.drawDate"
            dateLabel={_(msg`Draw date`)}
            date={draft.raffle.drawDate}
            onDate={drawDate => set('raffle', {drawDate})}
            time={draft.raffle.drawTime}
            onTime={drawTime => set('raffle', {drawTime})}
          />
          <TextRow
            id="raffle.drawMethod"
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
            id="raffle.permitReference"
            help={_(
              msg`Reference for an authorization, if applicable to your raffle.`,
            )}
            label={_(msg`Raffle permit number (optional)`)}
            value={draft.raffle.permitReference}
            onChange={permitReference => set('raffle', {permitReference})}
          />
        </Section>
      ) : null}

      {draft.kind === ECONOMIC_ACTIVITY_FUNDRAISER ? (
        <Section
          title={_(msg`Fundraiser`)}
          subtitle={_(
            msg`Explain the purpose, who benefits, and how people can contribute.`,
          )}>
          <TextRow
            id="plan.fundingGoal"
            label={_(msg`Fundraising goal (optional)`)}
            value={fundingGoal}
            onChange={onFundingGoal}
            keyboardType="decimal-pad"
          />
          <TextRow
            id="fundraiser.purpose"
            label={_(msg`What the money is for`)}
            value={draft.fundraiser.purpose}
            onChange={purpose => set('fundraiser', {purpose})}
            multiline
            maxLength={1000}
          />
          <TextRow
            id="fundraiser.beneficiary"
            label={_(msg`Beneficiary (optional)`)}
            value={draft.fundraiser.beneficiary}
            onChange={beneficiary => set('fundraiser', {beneficiary})}
          />
          <TextRow
            id="fundraiser.suggestedDonation"
            label={_(msg`Suggested donation (${currency}, optional)`)}
            value={draft.fundraiser.suggestedDonation}
            onChange={suggestedDonation =>
              set('fundraiser', {suggestedDonation})
            }
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <TextRow
            id="fundraiser.donationChannels"
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
