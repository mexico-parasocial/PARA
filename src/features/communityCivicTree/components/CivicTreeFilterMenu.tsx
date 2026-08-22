import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, platform, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronTopBottom_Stroke2_Corner0_Rounded as ChevronUpDownIcon,
} from '#/components/icons/Chevron'
import * as Menu from '#/components/Menu'

/*
 * The tree filters used to be three horizontally scrolling rows of toggle
 * chips - around fifteen controls competing with the graph for space, most of
 * them off screen. These dropdowns follow the pattern already used by advanced
 * search: one control per facet, reading "All <facet>" until it is narrowed.
 *
 * Selection is single-value rather than multi, because Menu.Item closes the
 * menu on press and a multi-select would mean reopening it for every toggle.
 * The value is still carried as a Set so the graph and outline views keep the
 * filtering logic they already have: empty means unfiltered.
 */

export type CivicTreeFilterOption = {
  value: string
  label: string
  /** Rendered as a leading dot when present, matching the graph's edge colors. */
  color?: string
  /** Single-character glyph used by card types. */
  icon?: string
}

export function CivicTreeFilterMenu({
  allLabel,
  groupLabel,
  options,
  selected,
  onChange,
}: {
  /** Shown on the trigger when nothing is selected, e.g. "All types". */
  allLabel: string
  /** Heading inside the menu. */
  groupLabel: string
  options: readonly CivicTreeFilterOption[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  const current = options.find(option => selected.has(option.value))
  const isFiltered = !!current

  return (
    <Menu.Root>
      <Menu.Trigger
        label={l`${groupLabel} filter (currently: ${current?.label ?? allLabel})`}>
        {({props}) => (
          <Button
            {...props}
            label={props.accessibilityLabel}
            size="small"
            color={isFiltered ? 'primary_subtle' : 'secondary'}>
            {current?.color ? (
              <View
                style={[
                  a.rounded_full,
                  {width: 8, height: 8, backgroundColor: current.color},
                ]}
              />
            ) : null}
            <ButtonText>{current?.label ?? allLabel}</ButtonText>
            <ButtonIcon
              icon={platform({
                native: ChevronUpDownIcon,
                default: ChevronDownIcon,
              })}
            />
          </Button>
        )}
      </Menu.Trigger>
      <Menu.Outer>
        <Menu.LabelText>{groupLabel}</Menu.LabelText>
        <Menu.Group>
          <Menu.Item label={allLabel} onPress={() => onChange(new Set())}>
            <Menu.ItemText>{allLabel}</Menu.ItemText>
            <Menu.ItemRadio selected={!isFiltered} />
          </Menu.Item>
          {options.map(option => (
            <Menu.Item
              key={option.value}
              label={option.label}
              onPress={() => onChange(new Set([option.value]))}>
              {option.color ? (
                <View
                  style={[
                    a.rounded_full,
                    {width: 10, height: 10, backgroundColor: option.color},
                  ]}
                />
              ) : option.icon ? (
                <Menu.ItemText
                  style={[a.font_bold, t.atoms.text_contrast_medium]}>
                  {option.icon}
                </Menu.ItemText>
              ) : null}
              <Menu.ItemText>{option.label}</Menu.ItemText>
              <Menu.ItemRadio selected={selected.has(option.value)} />
            </Menu.Item>
          ))}
        </Menu.Group>
      </Menu.Outer>
    </Menu.Root>
  )
}

/**
 * Row of the three tree filter dropdowns, with a Clear affordance that only
 * appears once something is actually filtered.
 */
export function CivicTreeFilterRow({
  children,
  onClear,
  showClear,
}: {
  children: React.ReactNode
  onClear: () => void
  showClear: boolean
}) {
  const {t: l} = useLingui()

  return (
    <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_wrap]}>
      {children}
      {showClear ? (
        <Button
          label={l`Clear all filters`}
          size="small"
          color="secondary"
          variant="ghost"
          onPress={onClear}>
          <ButtonText>
            <Trans>Clear</Trans>
          </ButtonText>
        </Button>
      ) : null}
    </View>
  )
}
