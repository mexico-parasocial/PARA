import {useMemo, useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {CivicTreeCardInspector} from './CivicTreeCardInspector'

export type TreeCard = {
  id: string
  title: string
  type: string
  color: string
  summary?: string | null
}

export type TreeCardGroup = {
  id: string
  title: string
  color: string
  cards: TreeCard[]
}

export type TreeCardLink = {
  id: string
  source: string
  target: string
  label: string
  color: string
  directed?: boolean
}

/** Grouping is authored collection membership or existing topic connections. */
export function CivicTreeCards({
  groups,
  links,
  onOpenDetails,
}: {
  groups: TreeCardGroup[]
  links: TreeCardLink[]
  onOpenDetails: (id: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [{width, height}, setSize] = useState({width: 0, height: 0})
  const [focusId, setFocusId] = useState<string>()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const byId = useMemo(
    () =>
      new Map(
        groups.flatMap(group =>
          group.cards.map(card => [card.id, card] as const),
        ),
      ),
    [groups],
  )
  const visibleLinks = useMemo(
    () => links.filter(link => byId.has(link.source) && byId.has(link.target)),
    [links, byId],
  )
  const adjacency = useMemo(() => {
    const result = new Map<string, TreeCardLink[]>()
    for (const link of visibleLinks) {
      for (const id of new Set([link.source, link.target])) {
        const connections = result.get(id) ?? []
        connections.push(link)
        result.set(id, connections)
      }
    }
    return result
  }, [visibleLinks])
  const focused = focusId ? byId.get(focusId) : undefined
  const connected = focused ? (adjacency.get(focused.id) ?? []) : []
  const neighbourhood = new Set(
    connected.flatMap(link => [link.source, link.target]),
  )
  const wide = width >= 900

  const connections = focused
    ? connected.map(link => ({
        link,
        outgoing: link.source === focused.id,
        other: byId.get(
          link.source === focused.id ? link.target : link.source,
        )!,
      }))
    : []
  const inspector = (
    <CivicTreeCardInspector
      card={focused}
      connections={connections}
      wide={wide}
      maxHeight={height * 0.6}
      onClear={() => setFocusId(undefined)}
      onOpenDetails={onOpenDetails}
      onSelect={setFocusId}
    />
  )

  if (!byId.size) {
    return (
      <View
        style={[a.flex_1, a.p_xl, a.align_center, a.justify_center, a.gap_sm]}>
        <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
          <Trans>No cards match these filters</Trans>
        </Text>
        <Text style={[a.text_xs, a.text_center, t.atoms.text_contrast_medium]}>
          <Trans>Try another search or clear the collection filters.</Trans>
        </Text>
      </View>
    )
  }

  return (
    <View
      style={[a.flex_1, {minHeight: 0}]}
      onLayout={event => setSize(event.nativeEvent.layout)}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.px_md,
          a.py_sm,
          a.border_b,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {plural(byId.size, {one: '# card', other: '# cards'})} ·{' '}
          {plural(visibleLinks.length, {
            one: '# connection',
            other: '# connections',
          })}
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>Select to explore</Trans>
        </Text>
      </View>
      <View style={[a.flex_1, wide && a.flex_row, {minHeight: 0}]}>
        <ScrollView
          horizontal
          style={[a.flex_1, {minHeight: 0}, t.atoms.bg_contrast_25]}
          contentContainerStyle={[a.p_md, a.gap_sm]}>
          {groups.map(group => {
            const isCollapsed = collapsed.has(group.id)
            return (
              <View
                key={group.id}
                style={[{width: wide ? 216 : 200, minHeight: 0}, a.gap_sm]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={group.title}
                  accessibilityState={{expanded: !isCollapsed}}
                  accessibilityHint={
                    isCollapsed
                      ? l`Shows this group's cards`
                      : l`Hides this group's cards`
                  }
                  onPress={() =>
                    setCollapsed(previous => {
                      const next = new Set(previous)
                      if (next.has(group.id)) next.delete(group.id)
                      else next.add(group.id)
                      return next
                    })
                  }
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.gap_sm,
                    a.py_sm,
                    a.border_b,
                    {borderBottomColor: group.color},
                  ]}>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {isCollapsed ? '▸' : '▾'}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[a.flex_1, a.text_xs, a.font_bold, t.atoms.text]}>
                    {group.title}
                  </Text>
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {group.cards.length}
                  </Text>
                </TouchableOpacity>
                {!isCollapsed ? (
                  <ScrollView
                    style={[a.flex_1, {minHeight: 0}]}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[a.gap_xs, {paddingBottom: 16}]}>
                    {group.cards.map(card => {
                      const selected = focused?.id === card.id
                      const related = neighbourhood.has(card.id)
                      const degree = adjacency.get(card.id)?.length ?? 0
                      return (
                        <TouchableOpacity
                          key={card.id}
                          accessibilityRole="button"
                          accessibilityLabel={card.title}
                          accessibilityState={{selected}}
                          accessibilityHint={l`Shows this card and its connections`}
                          onPress={() =>
                            setFocusId(selected ? undefined : card.id)
                          }
                          style={[
                            a.rounded_md,
                            a.overflow_hidden,
                            selected ? t.atoms.bg_contrast_25 : t.atoms.bg,
                            {
                              minHeight: 72,
                              borderWidth: selected ? 2 : 1,
                              borderColor: selected
                                ? t.palette.primary_500
                                : related
                                  ? card.color
                                  : t.palette.contrast_100,
                              opacity:
                                focused && !selected && !related ? 0.45 : 1,
                            },
                          ]}>
                          <View
                            style={[
                              a.absolute,
                              {
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: 5,
                                backgroundColor: card.color,
                              },
                            ]}
                          />
                          <View
                            style={[
                              a.gap_xs,
                              a.py_sm,
                              {paddingLeft: 14, paddingRight: 10},
                            ]}>
                            <Text
                              numberOfLines={3}
                              style={[
                                a.text_sm,
                                a.font_bold,
                                a.leading_snug,
                                t.atoms.text,
                              ]}>
                              {card.title}
                            </Text>
                            <View
                              style={[a.flex_row, a.align_center, a.gap_xs]}>
                              <Text
                                numberOfLines={1}
                                style={[
                                  a.flex_1,
                                  a.text_xs,
                                  t.atoms.text_contrast_medium,
                                ]}>
                                {card.type}
                              </Text>
                              {degree > 0 ? (
                                <View
                                  style={[
                                    a.rounded_full,
                                    a.px_sm,
                                    {paddingVertical: 1},
                                    t.atoms.bg_contrast_25,
                                  ]}>
                                  <Text
                                    style={[
                                      a.text_xs,
                                      a.font_bold,
                                      t.atoms.text_contrast_medium,
                                    ]}>
                                    ↗ {degree}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                    {group.cards.length === 0 ? (
                      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                        <Trans>No cards in this group.</Trans>
                      </Text>
                    ) : null}
                  </ScrollView>
                ) : null}
              </View>
            )
          })}
        </ScrollView>
        {wide || focused ? (
          <View
            style={[
              wide ? a.border_l : a.border_t,
              // On phones the lanes above flex to whatever the panel leaves.
              wide ? {minHeight: 0, flexShrink: 0} : {flexShrink: 0},
              t.atoms.border_contrast_low,
            ]}>
            {inspector}
          </View>
        ) : null}
      </View>
    </View>
  )
}
