import {StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {BirthdayCake_Stroke2_Corner2_Rounded as BirthdayCake} from '#/components/icons/BirthdayCake'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/CircleX'
import {type Props as IconProps} from '#/components/icons/common'
import {Megaphone_Stroke2_Corner0_Rounded as Megaphone} from '#/components/icons/Megaphone'
import {PinLocation_Stroke2_Corner0_Rounded as PinLocation} from '#/components/icons/PinLocation'
import {ThumbUp_Stroke2_Corner0_Rounded as ThumbUp} from '#/components/icons/Thumb'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {Text} from '#/components/Typography'
import {type CivicCapability} from '../types'

const ICON_MAP: Record<string, React.ComponentType<IconProps>> = {
  vote: ThumbUp,
  propose: Megaphone,
  verify: VerifiedCheck,
  age: BirthdayCake,
  district: PinLocation,
  default: ThumbUp,
}

export function CivicCapabilitiesPanel({
  capabilities,
}: {
  capabilities: CivicCapability[]
}) {
  const t = useTheme()

  return (
    <View
      style={[
        styles.container,
        t.atoms.bg_contrast_25,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Civic capabilities</Trans>
      </Text>
      <View style={styles.grid}>
        {capabilities.map(capability => {
          const Icon =
            ICON_MAP[capability.icon ?? 'default'] ?? ICON_MAP.default
          return (
            <View
              key={capability.id}
              style={[
                styles.item,
                {
                  opacity: capability.enabled ? 1 : 0.5,
                  backgroundColor: capability.enabled
                    ? t.palette.positive_500 + '10'
                    : 'transparent',
                },
              ]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                <Icon
                  size="sm"
                  fill={
                    capability.enabled
                      ? t.palette.positive_500
                      : t.atoms.text_contrast_low.color
                  }
                  style={{
                    color: capability.enabled
                      ? t.palette.positive_500
                      : t.atoms.text_contrast_low.color,
                  }}
                />
                <Text
                  style={[
                    styles.itemLabel,
                    capability.enabled
                      ? t.atoms.text
                      : t.atoms.text_contrast_medium,
                  ]}>
                  {capability.label}
                </Text>
                {capability.enabled ? (
                  <Check
                    size="xs"
                    fill={t.palette.positive_500}
                    style={{color: t.palette.positive_500}}
                  />
                ) : (
                  <CircleX
                    size="xs"
                    fill={t.atoms.text_contrast_low.color}
                    style={{color: t.atoms.text_contrast_low.color}}
                  />
                )}
              </View>
              <Text style={[styles.itemDetail, t.atoms.text_contrast_low]}>
                {capability.detail}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  grid: {
    gap: 8,
  },
  item: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  itemDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
})
