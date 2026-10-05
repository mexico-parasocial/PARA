import {type StyleProp, View, type ViewStyle} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {Earth_Stroke2_Corner0_Rounded as EarthIcon} from '#/components/icons/Globe'
import {Leaf_Stroke2_Corner0_Rounded as LeafIcon} from '#/components/icons/Leaf'

export type CivicTreeViewMode = 'list' | 'graph' | 'map'

/** The Collections / Tree / Interactive Map switch both civic trees offer. */
export function CivicTreeViewSwitch({
  value,
  onChange,
  style,
}: {
  value: CivicTreeViewMode
  onChange: (mode: CivicTreeViewMode) => void
  style?: StyleProp<ViewStyle>
}) {
  const {_} = useLingui()
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const modes = [
    {id: 'list', label: _(msg`Collections`), icon: ListIcon},
    {id: 'graph', label: _(msg`Tree`), icon: LeafIcon},
    {id: 'map', label: _(msg`Interactive Map`), icon: EarthIcon},
  ] as const

  return (
    <View
      style={[
        a.flex_row,
        a.flex_wrap,
        a.gap_xs,
        a.p_xs,
        a.rounded_md,
        a.self_start,
        t.atoms.bg_contrast_25,
        style,
      ]}>
      {modes.map(mode => (
        <Button
          key={mode.id}
          label={mode.label}
          variant={value === mode.id ? 'solid' : 'ghost'}
          color={value === mode.id ? 'primary' : 'secondary'}
          size="small"
          accessibilityState={{selected: value === mode.id}}
          onPress={() => onChange(mode.id)}>
          <ButtonIcon icon={mode.icon} />
          <ButtonText style={!gtMobile && a.text_xs}>{mode.label}</ButtonText>
        </Button>
      ))}
    </View>
  )
}
