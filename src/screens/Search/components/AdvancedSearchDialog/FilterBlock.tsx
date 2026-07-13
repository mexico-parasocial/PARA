import {type ReactNode, useMemo, useState} from 'react'
import {Pressable, ScrollView, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {COMPASS_GRID_ROWS} from '#/lib/compass/compassColors'
import {type CivicCategoryKey, useCivicCategories} from '#/lib/interests'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {atoms as a, platform, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon,
  ChevronTopBottom_Stroke2_Corner0_Rounded as ChevronUpDownIcon,
} from '#/components/icons/Chevron'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import * as Menu from '#/components/Menu'
import {Text} from '#/components/Typography'
import {AutocompleteInput} from './AutocompleteInput'
import {ClearableInput} from './ClearableInput'
import {useFilterFieldLabels} from './hooks'
import {
  type AdvancedFilter,
  FILTER_FIELDS,
  HANDLE_FIELDS,
  PARA_ENTITY_FIELDS,
} from './utils'

export function FilterBlock({
  filter,
  onChange,
  onRemove,
  onSubmitEditing,
}: {
  filter: AdvancedFilter
  onChange: (patch: Partial<AdvancedFilter>) => void
  onRemove: () => void
  onSubmitEditing?: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const labels = useFilterFieldLabels()
  const isParaEntity = PARA_ENTITY_FIELDS.has(filter.field)

  return (
    <View
      style={[
        a.gap_sm,
        a.p_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
      ]}>
      <View style={[a.flex_row, a.gap_sm, a.align_center]}>
        <Menu.Root>
          <Menu.Trigger
            label={l`Include or exclude matching posts (currently: ${
              filter.mode === 'exclude'
                ? l({message: 'Exclude', comment: 'Advanced search filter'})
                : l({message: 'Include', comment: 'Advanced search filter'})
            })`}>
            {({props}) => (
              <Button
                {...props}
                label={props.accessibilityLabel}
                size="small"
                color="secondary">
                <ButtonText>
                  {filter.mode === 'exclude'
                    ? l({message: 'Exclude', comment: 'Advanced search filter'})
                    : l({
                        message: 'Include',
                        comment: 'Advanced search filter',
                      })}
                </ButtonText>
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
            <Menu.Group>
              <Menu.Item
                label={l({
                  message: 'Include',
                  comment: 'Advanced search filter',
                })}
                onPress={() => onChange({mode: 'include'})}>
                <Menu.ItemText>
                  <Trans>Include</Trans>
                </Menu.ItemText>
                <Menu.ItemRadio selected={filter.mode === 'include'} />
              </Menu.Item>
              {/* PARA entity fields do not have exclude variants yet. */}
              {!isParaEntity && (
                <Menu.Item
                  label={l({
                    message: 'Exclude',
                    comment: 'Advanced search filter',
                  })}
                  onPress={() => onChange({mode: 'exclude'})}>
                  <Menu.ItemText>
                    <Trans>Exclude</Trans>
                  </Menu.ItemText>
                  <Menu.ItemRadio selected={filter.mode === 'exclude'} />
                </Menu.Item>
              )}
            </Menu.Group>
          </Menu.Outer>
        </Menu.Root>

        <Menu.Root>
          <Menu.Trigger
            label={l`Select filter type (currently: ${labels[filter.field].title})`}>
            {({props}) => (
              <Button
                {...props}
                label={props.accessibilityLabel}
                size="small"
                color="secondary">
                <ButtonText>{labels[filter.field].title}</ButtonText>
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
            <Menu.Group>
              {FILTER_FIELDS.map(field => (
                <Menu.Item
                  key={field}
                  label={labels[field].title}
                  /*
                   * Switching the field type clears any text entered for the
                   * previous type, since values rarely carry over meaningfully
                   * (e.g. a handle is not a domain). Changing include/exclude
                   * mode leaves the text intact - it's the same field.
                   */
                  onPress={() => onChange({field, value: ''})}>
                  <Menu.ItemText>{labels[field].title}</Menu.ItemText>
                  <Menu.ItemRadio selected={filter.field === field} />
                </Menu.Item>
              ))}
            </Menu.Group>
          </Menu.Outer>
        </Menu.Root>

        <View style={[a.flex_1]} />

        <Button
          label={l({
            message: 'Remove filter',
            comment: 'Advanced search filter',
          })}
          size="small"
          color="secondary"
          shape="round"
          onPress={onRemove}>
          <ButtonIcon icon={XIcon} />
        </Button>
      </View>

      {isParaEntity ? (
        <ParaEntityPicker
          /*
           * Remount on field-type change so the picker resets to the cleared
           * value; mode changes keep the same field and so preserve selections.
           */
          key={filter.field}
          field={
            filter.field as
              'communities' | 'cabildeos' | 'compassPositions' | 'policyAreas'
          }
          value={filter.value}
          onChange={next => onChange({value: next})}
        />
      ) : HANDLE_FIELDS.has(filter.field) ? (
        <AutocompleteInput
          /*
           * Remount on field-type change so the input resets to the cleared
           * value; mode changes keep the same field and so preserve the text.
           */
          key={filter.field}
          label={labels[filter.field].label}
          value={filter.value}
          onChangeText={text => onChange({value: text})}
          onSubmitEditing={onSubmitEditing}
        />
      ) : (
        <ClearableInput
          /*
           * The input is uncontrolled (defaultValue), so remount on field-type
           * change to reset it; mode changes keep the same field and text.
           */
          key={filter.field}
          label={labels[filter.field].label}
          defaultValue={filter.value}
          onChangeText={text => onChange({value: text})}
          onSubmitEditing={onSubmitEditing}
        />
      )}
    </View>
  )
}

function ParaEntityPicker({
  field,
  value,
  onChange,
}: {
  field: 'communities' | 'cabildeos' | 'compassPositions' | 'policyAreas'
  value: string
  onChange: (value: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [query, setQuery] = useState('')
  const selected = useMemo(
    () =>
      value
        .split(',')
        .map(v => v.trim())
        .filter(Boolean),
    [value],
  )

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter(v => v !== id)
      : [...selected, id]
    onChange(next.join(','))
  }

  if (field === 'communities') {
    return (
      <EntityPickerShell
        query={query}
        onChangeQuery={setQuery}
        placeholder={l`Search communities...`}>
        <CommunityOptions query={query} selected={selected} onToggle={toggle} />
      </EntityPickerShell>
    )
  }

  if (field === 'cabildeos') {
    return (
      <EntityPickerShell
        query={query}
        onChangeQuery={setQuery}
        placeholder={l`Search cabildeos...`}>
        <CabildeoOptions query={query} selected={selected} onToggle={toggle} />
      </EntityPickerShell>
    )
  }

  if (field === 'compassPositions') {
    return (
      <View style={[a.gap_xs]}>
        {COMPASS_GRID_ROWS.map((row, ri) => (
          <View
            key={ri}
            style={[a.flex_row, a.gap_xs, a.align_center, a.justify_start]}>
            {row.map(id => {
              const isSelected = selected.includes(id)
              return (
                <Pressable
                  key={id}
                  onPress={() => toggle(id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: isSelected}}
                  style={[
                    a.px_sm,
                    a.py_xs,
                    a.rounded_md,
                    a.border,
                    isSelected
                      ? [
                          {backgroundColor: t.palette.primary_50},
                          {borderColor: t.palette.primary_500},
                        ]
                      : [t.atoms.bg, t.atoms.border_contrast_low],
                  ]}>
                  <Text
                    style={[
                      a.text_xs,
                      a.font_medium,
                      t.atoms.text_contrast_high,
                    ]}>
                    {id}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ))}
      </View>
    )
  }

  // field === 'policyAreas'
  return <PolicyAreaOptions selected={selected} onToggle={toggle} />
}

function EntityPickerShell({
  children,
  query,
  onChangeQuery,
  placeholder,
}: {
  children: ReactNode
  query: string
  onChangeQuery: (value: string) => void
  placeholder: string
}) {
  const t = useTheme()
  return (
    <View style={[a.gap_sm]}>
      <SearchInput
        value={query}
        onChangeText={onChangeQuery}
        placeholder={placeholder}
        autoFocus={false}
      />
      <View
        style={[
          a.border,
          a.rounded_md,
          t.atoms.border_contrast_low,
          {maxHeight: 240},
        ]}>
        <ScrollView contentContainerStyle={[a.p_xs]}>{children}</ScrollView>
      </View>
    </View>
  )
}

function CommunityOptions({
  query,
  selected,
  onToggle,
}: {
  query: string
  selected: string[]
  onToggle: (uri: string) => void
}) {
  const t = useTheme()
  const {data, isLoading} = useCommunityBoardsQuery({
    query: query || undefined,
    limit: 50,
  })
  const boards = data?.boards ?? []

  if (isLoading) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
        <Trans>Loading communities...</Trans>
      </Text>
    )
  }
  if (boards.length === 0) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
        <Trans>No communities found.</Trans>
      </Text>
    )
  }
  return boards.map(board => {
    const isSelected = selected.includes(board.uri)
    return (
      <SelectableRow
        key={board.uri}
        label={board.name}
        selected={isSelected}
        onPress={() => onToggle(board.uri)}
      />
    )
  })
}

function CabildeoOptions({
  query,
  selected,
  onToggle,
}: {
  query: string
  selected: string[]
  onToggle: (uri: string) => void
}) {
  const t = useTheme()
  const {data, isLoading} = useCabildeosQuery()
  const all = data ?? []
  const filtered = query
    ? all.filter(c => c.title?.toLowerCase().includes(query.toLowerCase()))
    : all

  if (isLoading) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
        <Trans>Loading cabildeos...</Trans>
      </Text>
    )
  }
  if (filtered.length === 0) {
    return (
      <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.p_md]}>
        <Trans>No cabildeos found.</Trans>
      </Text>
    )
  }
  return filtered.map(cab => {
    const isSelected = selected.includes(cab.uri)
    return (
      <SelectableRow
        key={cab.uri}
        label={cab.title}
        selected={isSelected}
        onPress={() => onToggle(cab.uri)}
      />
    )
  })
}

function PolicyAreaOptions({
  selected,
  onToggle,
}: {
  selected: string[]
  onToggle: (tag: string) => void
}) {
  const t = useTheme()
  const categories = useCivicCategories()

  return (
    <View style={[a.gap_md]}>
      {(Object.keys(categories) as CivicCategoryKey[]).map(key => {
        const cat = categories[key]
        return (
          <View key={key} style={[a.gap_xs]}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text_contrast_high]}>
              {cat.emoji} {cat.label}
            </Text>
            <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
              {cat.interests.map(tag => {
                const isSelected = selected.includes(tag)
                return (
                  <Pressable
                    key={tag}
                    onPress={() => onToggle(tag)}
                    accessibilityRole="checkbox"
                    accessibilityState={{checked: isSelected}}
                    style={[
                      a.px_sm,
                      a.py_xs,
                      a.rounded_md,
                      a.border,
                      isSelected
                        ? [
                            {backgroundColor: t.palette.primary_50},
                            {borderColor: t.palette.primary_500},
                          ]
                        : [t.atoms.bg, t.atoms.border_contrast_low],
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        a.font_medium,
                        t.atoms.text_contrast_high,
                      ]}>
                      {cat.interestLabels[tag] ?? tag}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
        )
      })}
    </View>
  )
}

function SelectableRow({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{checked: selected}}
      style={[
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.p_sm,
        a.rounded_md,
        selected ? {backgroundColor: t.palette.primary_50} : t.atoms.bg,
      ]}>
      <View
        style={[
          a.rounded_xs,
          a.border,
          {
            width: 18,
            height: 18,
            backgroundColor: selected
              ? t.palette.primary_500
              : t.atoms.bg.backgroundColor,
            borderColor: selected
              ? t.palette.primary_500
              : t.atoms.border_contrast_low.borderColor,
          },
        ]}
      />
      <Text style={[a.text_sm, t.atoms.text_contrast_high]}>{label}</Text>
    </Pressable>
  )
}
