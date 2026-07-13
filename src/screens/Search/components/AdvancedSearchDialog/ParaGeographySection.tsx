import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {useRegionConfig} from '#/lib/hooks/useRegionConfig'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Text} from '#/components/Typography'
import {MenuSelect} from './MenuSelect'

const CABILDEO_PHASES = ['draft', 'open', 'deliberating', 'voting', 'resolved']

export function ParaGeographySection({
  state,
  onChangeState,
  districtKey,
  onChangeDistrictKey,
  cabildeoPhase,
  onChangeCabildeoPhase,
  onSubmitEditing,
}: {
  state?: string
  onChangeState: (value?: string) => void
  districtKey?: string
  onChangeDistrictKey: (value?: string) => void
  cabildeoPhase?: string
  onChangeCabildeoPhase: (value?: string) => void
  onSubmitEditing?: () => void
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  const region = useRegionConfig()

  return (
    <View>
      <Text
        style={[
          a.text_sm,
          a.font_medium,
          t.atoms.text_contrast_medium,
          a.mb_sm,
        ]}>
        <Trans>Geography and cabildeo</Trans>
      </Text>
      <View style={[a.gap_md]}>
        <MenuSelect
          value={state ?? ''}
          options={[
            {value: '', label: l`Any state`},
            ...region.regions.map(r => ({
              value: r.value,
              label: r.label,
            })),
          ]}
          onChange={value => onChangeState(value || undefined)}
          label={l`Select state`}
        />
        <TextField.Root>
          <Dialog.Input
            label={l`District key`}
            defaultValue={districtKey ?? ''}
            placeholder={l`e.g. iztapalapa-1`}
            onChangeText={value =>
              onChangeDistrictKey(value.trim() || undefined)
            }
            onSubmitEditing={onSubmitEditing}
          />
        </TextField.Root>
        <Toggle.Group
          type="radio"
          values={cabildeoPhase ? [cabildeoPhase] : []}
          onChange={values => onChangeCabildeoPhase(values[0] || undefined)}
          label={l`Cabildeo phase`}>
          <Toggle.Item name="" label={l`Any phase`} style={[a.py_sm]}>
            <Text>
              <Trans>Any</Trans>
            </Text>
          </Toggle.Item>
          {CABILDEO_PHASES.map(phase => (
            <Toggle.Item
              key={phase}
              name={phase}
              label={phase}
              style={[a.py_sm]}>
              <Text>{phase}</Text>
            </Toggle.Item>
          ))}
        </Toggle.Group>
      </View>
    </View>
  )
}
