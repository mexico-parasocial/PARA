import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {officialParties} from '#/lib/constants/communities'
import {POST_TYPES} from '#/lib/tags'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import {Text} from '#/components/Typography'
import {MenuSelect} from './MenuSelect'

const PARA_POST_TYPE_OPTIONS = Object.values(POST_TYPES).filter(
  pt => pt.id !== 'none',
)

export function ParaPostMetaSection({
  postType,
  onChangePostType,
  flairsInput,
  onChangeFlairsInput,
  party,
  onChangeParty,
  verifiedPublicFigure,
  onChangeVerifiedPublicFigure,
  onSubmitEditing,
}: {
  postType?: string
  onChangePostType: (value?: string) => void
  flairsInput: string
  onChangeFlairsInput: (value: string) => void
  party?: string
  onChangeParty: (value?: string) => void
  verifiedPublicFigure: boolean
  onChangeVerifiedPublicFigure: (value: boolean) => void
  onSubmitEditing?: () => void
}) {
  const {t: l} = useLingui()
  const t = useTheme()

  return (
    <>
      <View>
        <Text
          style={[
            a.text_sm,
            a.font_medium,
            t.atoms.text_contrast_medium,
            a.mb_sm,
          ]}>
          <Trans>Post type</Trans>
        </Text>
        <Toggle.Group
          type="radio"
          values={postType ? [postType] : []}
          onChange={values => onChangePostType(values[0] || undefined)}
          label={l`Post type`}>
          <Toggle.Item name="" label={l`Any post type`} style={[a.py_sm]}>
            <Text>
              <Trans>Any</Trans>
            </Text>
          </Toggle.Item>
          {PARA_POST_TYPE_OPTIONS.map(pt => (
            <Toggle.Item
              key={pt.id}
              name={pt.id}
              label={pt.label}
              style={[a.py_sm]}>
              <Text>{pt.label}</Text>
            </Toggle.Item>
          ))}
        </Toggle.Group>
      </View>

      <View>
        <Text
          style={[
            a.text_sm,
            a.font_medium,
            t.atoms.text_contrast_medium,
            a.mb_sm,
          ]}>
          <Trans>Flairs</Trans>
        </Text>
        <TextField.Root>
          <Dialog.Input
            label={l`Flair tags`}
            defaultValue={flairsInput}
            placeholder={l`e.g. ||#ChequesEscolares ||#SalarioMinimo`}
            onChangeText={value => onChangeFlairsInput(value)}
            onSubmitEditing={onSubmitEditing}
          />
        </TextField.Root>
      </View>

      <View>
        <Text
          style={[
            a.text_sm,
            a.font_medium,
            t.atoms.text_contrast_medium,
            a.mb_sm,
          ]}>
          <Trans>Party</Trans>
        </Text>
        <MenuSelect
          value={party ?? ''}
          options={[
            {value: '', label: l`Any party`},
            ...officialParties.map(p => ({value: p.name, label: p.name})),
          ]}
          onChange={value => onChangeParty(value || undefined)}
          label={l`Select party`}
        />
      </View>

      <View>
        <Text
          style={[
            a.text_sm,
            a.font_medium,
            t.atoms.text_contrast_medium,
            a.mb_sm,
          ]}>
          <Trans>Public figure</Trans>
        </Text>
        <Toggle.Group
          type="checkbox"
          values={verifiedPublicFigure ? ['verified'] : []}
          onChange={values =>
            onChangeVerifiedPublicFigure(values.includes('verified'))
          }
          label={l`Verified public figure`}>
          <Toggle.Item
            name="verified"
            label={l`Verified public figure`}
            style={[a.py_sm]}>
            <Text>
              <Trans>Verified public figure</Trans>
            </Text>
          </Toggle.Item>
        </Toggle.Group>
      </View>
    </>
  )
}
