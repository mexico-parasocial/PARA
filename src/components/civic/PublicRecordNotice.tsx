import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Eye_Stroke2_Corner0_Rounded as EyeIcon} from '#/components/icons/Eye'
import {Text} from '#/components/Typography'

type Disclosure = {
  title: string
  subtitle: string
  rows: {label: string; value: string}[]
  notPublished: string
  acknowledgement: string
  confirmLabel: string
}

/**
 * Shown before an action that publishes a civic record in the actor's own repo.
 *
 * The record is signed by their DID and sequenced to the firehose, so it is
 * attributable to them permanently and cannot be unpublished. For a cabildeo
 * ballot that was accepted, on the condition that the product says so rather
 * than leaving it to a lexicon description — see OD-7 §5d in the WatZappa repo.
 *
 * The "not published" half is not filler: a ballot never names who delegated to
 * the voter, and the PDS refuses one that tries.
 */
function PublicRecordNotice({
  control,
  onConfirm,
  disclosure,
}: {
  control: Dialog.DialogControlProps
  onConfirm: () => void
  disclosure: Disclosure
}) {
  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={disclosure.title}
        style={web({maxWidth: 420})}>
        <Inner
          control={control}
          onConfirm={onConfirm}
          disclosure={disclosure}
        />
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

export function PublicBallotNotice({
  control,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  onConfirm: () => void
}) {
  const {_} = useLingui()
  return (
    <PublicRecordNotice
      control={control}
      onConfirm={onConfirm}
      disclosure={{
        title: _(msg`Tu voto será público`),
        subtitle: _(msg`Y no se puede despublicar. Léelo antes de emitirlo.`),
        rows: [
          {label: _(msg`Quién`), value: _(msg`tu identidad pública`)},
          {label: _(msg`Qué`), value: _(msg`la opción que elegiste`)},
          {label: _(msg`Cuándo`), value: _(msg`la fecha y hora`)},
          {label: _(msg`Quién lo ve`), value: _(msg`cualquiera, para siempre`)},
        ],
        notPublished: _(
          msg`Quién te cedió su voto. Tu papeleta nunca nombra a tus cedentes.`,
        ),
        acknowledgement: _(
          msg`Entiendo que este voto queda publicado a mi nombre.`,
        ),
        confirmLabel: _(msg`Emitir voto público`),
      }}
    />
  )
}

export function PublicDelegationNotice({
  control,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  onConfirm: () => void
}) {
  const {_} = useLingui()
  return (
    <PublicRecordNotice
      control={control}
      onConfirm={onConfirm}
      disclosure={{
        title: _(msg`Ceder es un acto público`),
        subtitle: _(
          msg`Queda un registro a tu nombre, y tampoco se puede despublicar.`,
        ),
        rows: [
          {label: _(msg`Quién`), value: _(msg`tu identidad pública`)},
          {label: _(msg`A quién`), value: _(msg`la voz que recibe tu voto`)},
          {label: _(msg`Para qué`), value: _(msg`el alcance y el partido`)},
          {label: _(msg`Quién lo ve`), value: _(msg`cualquiera, para siempre`)},
        ],
        notPublished: _(
          msg`Las papeletas que esa voz emita no te nombran a ti.`,
        ),
        acknowledgement: _(
          msg`Entiendo que esta cesión queda publicada a mi nombre.`,
        ),
        confirmLabel: _(msg`Ceder mi voto`),
      }}
    />
  )
}

function Inner({
  control,
  onConfirm,
  disclosure,
}: {
  control: Dialog.DialogControlProps
  onConfirm: () => void
  disclosure: Disclosure
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [understood, setUnderstood] = useState(false)

  return (
    <View style={[a.gap_lg]}>
      <View style={[a.flex_row, a.gap_md, a.align_start]}>
        <EyeIcon size="lg" fill={t.palette.negative_500} style={[a.mt_2xs]} />
        <View style={[a.flex_1, a.gap_2xs]}>
          <Text style={[a.text_xl, a.font_bold, a.leading_tight]}>
            {disclosure.title}
          </Text>
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            {disclosure.subtitle}
          </Text>
        </View>
      </View>

      <View
        style={[
          a.gap_sm,
          a.p_md,
          a.rounded_md,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg_contrast_25,
        ]}>
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            t.atoms.text_contrast_medium,
            {letterSpacing: 0.4},
          ]}>
          <Trans>SE PUBLICA EN TU REPOSITORIO</Trans>
        </Text>
        {disclosure.rows.map(row => (
          <PublishedRow key={row.label} label={row.label} value={row.value} />
        ))}
      </View>

      <View style={[a.gap_xs]}>
        <Text
          style={[
            a.text_xs,
            a.font_bold,
            {color: t.palette.positive_600, letterSpacing: 0.4},
          ]}>
          <Trans>NO SE PUBLICA</Trans>
        </Text>
        <View style={[a.flex_row, a.gap_sm, a.align_start]}>
          <CheckIcon
            size="sm"
            fill={t.palette.positive_600}
            style={[a.mt_2xs]}
          />
          <Text style={[a.flex_1, a.text_sm, a.leading_snug, t.atoms.text]}>
            {disclosure.notPublished}
          </Text>
        </View>
      </View>

      <Toggle.Item
        name="understood"
        label={disclosure.acknowledgement}
        value={understood}
        onChange={setUnderstood}
        style={[a.flex_row, a.gap_sm, a.align_center, a.py_xs]}>
        <Toggle.Checkbox />
        <Toggle.LabelText
          style={[a.flex_1, t.atoms.text, a.font_normal, a.text_sm]}>
          {disclosure.acknowledgement}
        </Toggle.LabelText>
      </Toggle.Item>

      <View style={[a.gap_sm]}>
        <Button
          label={disclosure.confirmLabel}
          size="large"
          variant="solid"
          color="primary"
          disabled={!understood}
          onPress={() => {
            control.close(() => onConfirm())
          }}>
          <ButtonText>{disclosure.confirmLabel}</ButtonText>
        </Button>
        <Button
          label={_(msg`Cancelar`)}
          size="large"
          variant="ghost"
          color="secondary"
          onPress={() => control.close()}>
          <ButtonText>
            <Trans>Cancelar</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

function PublishedRow({label, value}: {label: string; value: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.gap_sm, a.align_start]}>
      <Text
        style={[
          a.text_sm,
          t.atoms.text_contrast_medium,
          {width: 92, flexShrink: 0},
        ]}>
        {label}
      </Text>
      <Text style={[a.flex_1, a.text_sm, a.font_semi_bold, t.atoms.text]}>
        {value}
      </Text>
    </View>
  )
}
