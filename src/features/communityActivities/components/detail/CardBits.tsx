import {View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function Card({
  title,
  subtitle,
  children,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.gap_md,
        a.p_lg,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg,
      ]}>
      {title ? (
        <View style={[a.gap_xs]}>
          <Text style={[a.text_lg, a.font_bold]}>{title}</Text>
          {subtitle ? (
            <Text
              style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  )
}

/** A label/value line; renders nothing when the value is absent. */
export function Row({
  label,
  value,
  emphasis,
}: {
  label: string
  value: string | undefined
  emphasis?: boolean
}) {
  const t = useTheme()
  if (!value) return null
  return (
    <View style={[a.flex_row, a.justify_between, a.gap_md]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.flex_1]}>
        {label}
      </Text>
      <Text
        style={[
          a.text_sm,
          emphasis ? a.font_bold : a.font_medium,
          {flexShrink: 1, textAlign: 'right'},
        ]}>
        {value}
      </Text>
    </View>
  )
}

export function BulletList({title, items}: {title: string; items?: string[]}) {
  const t = useTheme()
  if (!items?.length) return null
  return (
    <View style={[a.gap_xs]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>{title}</Text>
      {items.map((item, index) => (
        <Text key={index} style={[a.text_sm]}>
          • {item}
        </Text>
      ))}
    </View>
  )
}

export function ProgressBar({bps}: {bps: number}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.rounded_full,
        a.overflow_hidden,
        {height: 8},
        t.atoms.bg_contrast_100,
      ]}>
      <View
        style={[
          a.h_full,
          {
            width: `${Math.min(100, Math.max(0, bps / 100))}%`,
            backgroundColor: t.palette.primary_500,
          },
        ]}
      />
    </View>
  )
}

export function Warning({children}: {children: string}) {
  const t = useTheme()
  return (
    <View
      style={[a.p_md, a.rounded_sm, {backgroundColor: t.palette.negative_25}]}>
      <Text style={[a.text_sm, {color: t.palette.negative_700}]}>
        ⚠️ {children}
      </Text>
    </View>
  )
}
