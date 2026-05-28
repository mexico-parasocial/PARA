import {useCallback, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type SortitionEligibilityFilter} from '#/state/queries/matrix'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Divider} from '#/components/Divider'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Group3_Stroke2_Corner0_Rounded as Group} from '#/components/icons/Group'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {IS_WEB} from '#/env'

export type SortitionConfigDialogProps = {
  control: Dialog.DialogControlProps
  communityUri: string
  onConfirm: (config: {
    size: number
    filter: SortitionEligibilityFilter
    roundOffset: number
  }) => void
  isSubmitting?: boolean
}

const SIZE_OPTIONS = [
  {label: '50 Ciudadanos', value: 50},
  {label: '100 Ciudadanos', value: 100},
  {label: '500 Ciudadanos', value: 500},
]

const FILTER_OPTIONS = [
  {label: 'Todos los miembros', value: 'all' as const},
  {label: 'Solo verificados (Persona Real)', value: 'verified' as const},
  {label: 'Antigüedad > 1 año', value: 'senior' as const},
] satisfies Array<{label: string; value: SortitionEligibilityFilter}>

const ROUND_OPTIONS = [
  {label: 'Round Inmediato (~30s)', value: 1},
  {label: 'Próximo Round (~1m)', value: 2},
  {label: 'En 5 minutos', value: 10},
]

export function SortitionConfigDialog({
  control,
  communityUri,
  onConfirm,
  isSubmitting = false,
}: SortitionConfigDialogProps) {
  const {_} = useLingui()
  const t = useTheme()

  const [selectedSize, setSelectedSize] = useState(100)
  const [selectedFilter, setSelectedFilter] =
    useState<SortitionEligibilityFilter>('all')
  const [selectedRound, setSelectedRound] = useState(1)

  const handleConfirm = useCallback(() => {
    onConfirm({
      size: selectedSize,
      filter: selectedFilter,
      roundOffset: selectedRound,
    })
    control.close()
  }, [control, onConfirm, selectedSize, selectedFilter, selectedRound])

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.ScrollableInner
        label={_(msg`Configurar Asamblea Aleatoria`)}
        style={[{minHeight: 400}, IS_WEB ? a.px_md : a.px_2xl]}>
        <View
          style={[
            {justifyContent: 'space-between', flexDirection: 'row'},
            a.my_lg,
            a.align_center,
          ]}>
          <View style={[a.flex_row, a.align_center, a.gap_sm]}>
            <Group fill={t.palette.primary_500} width={24} />
            <Text style={[a.text_lg, a.font_semi_bold]}>
              <Trans>Configurar Asamblea Aleatoria</Trans>
            </Text>
          </View>
          <Button
            label={_(msg`Cerrar`)}
            onPress={() => control.close()}
            variant="ghost"
            color="secondary"
            size="small"
            shape="round">
            <ButtonIcon icon={XIcon} />
          </Button>
        </View>

        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_xl]}>
          <Trans>
            Este proceso utilizará un faro de aleatoriedad pública (Drand) para
            seleccionar de forma insobornable a los miembros que participarán en
            esta deliberación. La configuración será visible para la comunidad.
          </Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mb_md]}>
          {communityUri}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Tamaño */}
          <Text style={[a.font_bold, a.mb_sm]}>
            <Trans>Tamaño de la Asamblea</Trans>
          </Text>
          <View style={[a.gap_sm, a.mb_lg]}>
            {SIZE_OPTIONS.map(opt => (
              <OptionItem
                key={opt.value}
                label={opt.label}
                isSelected={selectedSize === opt.value}
                onSelect={() => setSelectedSize(opt.value)}
              />
            ))}
          </View>

          <Divider style={[a.mb_lg]} />

          {/* Filtro */}
          <Text style={[a.font_bold, a.mb_sm]}>
            <Trans>Filtro de Ciudadanía</Trans>
          </Text>
          <View style={[a.gap_sm, a.mb_lg]}>
            {FILTER_OPTIONS.map(opt => (
              <OptionItem
                key={opt.value}
                label={opt.label}
                isSelected={selectedFilter === opt.value}
                onSelect={() => setSelectedFilter(opt.value)}
              />
            ))}
          </View>

          <Divider style={[a.mb_lg]} />

          {/* Round Drand */}
          <Text style={[a.font_bold, a.mb_sm]}>
            <Trans>Ejecución del Sorteo</Trans>
          </Text>
          <View style={[a.gap_sm, a.mb_xl]}>
            {ROUND_OPTIONS.map(opt => (
              <OptionItem
                key={opt.value}
                label={opt.label}
                isSelected={selectedRound === opt.value}
                onSelect={() => setSelectedRound(opt.value)}
              />
            ))}
          </View>
        </ScrollView>

        <View style={[a.pb_2xl]}>
          <Button
            label={_(msg`Iniciar Sorteo Criptográfico`)}
            size="large"
            color="primary"
            variant="solid"
            disabled={isSubmitting}
            onPress={handleConfirm}>
            <ButtonText>
              {isSubmitting ? (
                <Trans>Programando...</Trans>
              ) : (
                <Trans>Iniciar Sorteo Criptográfico</Trans>
              )}
            </ButtonText>
            <ButtonIcon icon={CheckIcon} />
          </Button>
        </View>
      </Dialog.ScrollableInner>
    </Dialog.Outer>
  )
}

function OptionItem({
  label,
  isSelected,
  onSelect,
}: {
  label: string
  isSelected: boolean
  onSelect: () => void
}) {
  const t = useTheme()
  return (
    <Button
      label={label}
      onPress={onSelect}
      variant={isSelected ? 'solid' : 'ghost'}
      color={isSelected ? 'primary' : 'secondary'}
      size="small"
      style={[
        a.flex_row,
        a.justify_between,
        a.px_md,
        !isSelected && {backgroundColor: t.palette.contrast_50},
      ]}>
      <ButtonText>{label}</ButtonText>
      {isSelected && <ButtonIcon icon={CheckIcon} />}
    </Button>
  )
}
