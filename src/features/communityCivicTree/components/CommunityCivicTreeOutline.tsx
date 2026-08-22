import {useCallback, useMemo, useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  COMMUNITY_CIVIC_TREE_CARD_TYPES,
  COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES,
} from '#/state/queries/community-civic-tree'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {type GraphData, type GraphNode} from '#/features/civicTree/types'

/*
 * A reading view for the community civic tree.
 *
 * The force graph answers "how is this connected"; it is poor at "what is
 * being argued". This view answers the second, and derives its shape from the
 * edge vocabulary rather than inventing a folder hierarchy — `GraphNode` has
 * no parent field, so any literal tree would be made up:
 *
 *   question  ←addresses—  claim  ←supports/opposes—  evidence
 *
 * Anything not reachable from a question is listed separately rather than
 * hidden, because an unanswered fragment is itself worth seeing.
 */

const REL_META = Object.fromEntries(
  COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.map(r => [r.value, r]),
) as Record<string, (typeof COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES)[number]>

const CARD_META = Object.fromEntries(
  COMMUNITY_CIVIC_TREE_CARD_TYPES.map(c => [c.value, c]),
) as Record<string, (typeof COMMUNITY_CIVIC_TREE_CARD_TYPES)[number]>

/** Edges that read as "this answers that". */
const ANSWERS = new Set(['addresses'])
/** Edges that read as "this argues about that". */
const ARGUES = new Set(['supports', 'opposes'])

type Branch = {
  node: GraphNode
  /** Claims answering a question, or evidence arguing a claim. */
  children: Branch[]
  /** The relationship that attached this node to its parent. */
  viaRel?: string
}

export function CommunityCivicTreeOutline({
  data,
  searchQuery,
  activeCardTypes,
  activeStances,
  onNodePress,
  selectedNodeId,
}: {
  data: GraphData
  searchQuery: string
  activeCardTypes: Set<string>
  activeStances: Set<string>
  onNodePress: (nodeId: string) => void
  selectedNodeId?: string
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  /*
   * Filtering mirrors CommunityCivicTreeGraph.isNodeVisible exactly, so
   * switching views never silently changes what is on screen.
   */
  const query = searchQuery.toLowerCase().trim()
  const hasFilters =
    query.length > 0 || activeCardTypes.size > 0 || activeStances.size > 0

  const isVisible = useCallback(
    (node: GraphNode) => {
      if (!hasFilters) return true
      const matchesQuery = !query || node.title.toLowerCase().includes(query)
      const matchesType =
        activeCardTypes.size === 0 || activeCardTypes.has(node.card_type)
      const matchesStance =
        activeStances.size === 0 ||
        (node.stance != null && activeStances.has(node.stance))
      return matchesQuery && matchesType && matchesStance
    },
    [hasFilters, query, activeCardTypes, activeStances],
  )

  const {roots, loose} = useMemo(() => {
    const byId = new Map(data.nodes.map(n => [n.id, n]))
    const visible = new Set(data.nodes.filter(isVisible).map(n => n.id))

    // Child -> parent, following the direction each relationship reads in.
    const attachedTo = new Map<string, {parent: string; rel: string}>()
    const childrenOf = new Map<string, {id: string; rel: string}[]>()

    for (const edge of data.edges) {
      const rel = edge.relationship_type
      if (!ANSWERS.has(rel) && !ARGUES.has(rel)) continue
      if (!visible.has(edge.source) || !visible.has(edge.target)) continue
      // `source addresses/supports/opposes target` — the target is the parent.
      if (attachedTo.has(edge.source)) continue // first attachment wins; graphs may cycle
      attachedTo.set(edge.source, {parent: edge.target, rel})
      const list = childrenOf.get(edge.target) ?? []
      list.push({id: edge.source, rel})
      childrenOf.set(edge.target, list)
    }

    const build = (id: string, seen: Set<string>, viaRel?: string): Branch | null => {
      if (seen.has(id)) return null // cycle guard
      const node = byId.get(id)
      if (!node) return null
      const nextSeen = new Set(seen).add(id)
      const children = (childrenOf.get(id) ?? [])
        .map(c => build(c.id, nextSeen, c.rel))
        .filter((b): b is Branch => b !== null)
      return {node, children, viaRel}
    }

    // Roots: anything visible that never attached to a parent. Questions first —
    // they are what the rest of the tree is answering.
    const rootIds = data.nodes
      .filter(n => visible.has(n.id) && !attachedTo.has(n.id))
      .map(n => n.id)

    const built = rootIds
      .map(id => build(id, new Set()))
      .filter((b): b is Branch => b !== null)

    const rank = (b: Branch) =>
      b.node.card_type === 'question' ? 0 : b.children.length > 0 ? 1 : 2

    built.sort((x, y) => {
      const d = rank(x) - rank(y)
      if (d !== 0) return d
      return y.children.length - x.children.length
    })

    return {
      roots: built.filter(b => rank(b) < 2),
      loose: built.filter(b => rank(b) === 2),
    }
  }, [data, isVisible])

  if (roots.length === 0 && loose.length === 0) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center, a.p_2xl]}>
        <Text style={[a.text_center, t.atoms.text_contrast_medium]}>
          {hasFilters ? (
            <Trans>No cards match these filters.</Trans>
          ) : (
            <Trans>This tree has no cards yet.</Trans>
          )}
        </Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={a.flex_1}
      contentContainerStyle={[a.px_md, a.py_md, {paddingBottom: 96}]}>
      {roots.map(branch => (
        <OutlineBranch
          key={branch.node.id}
          branch={branch}
          depth={0}
          collapsed={collapsed}
          onToggle={toggle}
          onNodePress={onNodePress}
          selectedNodeId={selectedNodeId}
        />
      ))}

      {loose.length > 0 ? (
        <View style={[a.mt_lg, a.pt_md, {borderTopWidth: 1, borderTopColor: t.palette.contrast_100}]}>
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              a.mb_sm,
              t.atoms.text_contrast_medium,
            ]}
            accessibilityLabel={l`Unconnected cards`}>
            <Trans>Not yet connected</Trans>
          </Text>
          {loose.map(branch => (
            <OutlineBranch
              key={branch.node.id}
              branch={branch}
              depth={0}
              collapsed={collapsed}
              onToggle={toggle}
              onNodePress={onNodePress}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  )
}

function OutlineBranch({
  branch,
  depth,
  collapsed,
  onToggle,
  onNodePress,
  selectedNodeId,
}: {
  branch: Branch
  depth: number
  collapsed: Set<string>
  onToggle: (id: string) => void
  onNodePress: (nodeId: string) => void
  selectedNodeId?: string
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {node, children, viaRel} = branch
  const isCollapsed = collapsed.has(node.id)
  const isSelected = selectedNodeId === node.id
  const card = CARD_META[node.card_type]
  const rel = viaRel ? REL_META[viaRel] : undefined

  const support = children.filter(c => c.viaRel === 'supports').length
  const oppose = children.filter(c => c.viaRel === 'opposes').length

  return (
    <View>
      <View style={[a.flex_row, a.align_start, {paddingLeft: depth * 16}]}>
        {children.length > 0 ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isCollapsed ? l`Expand` : l`Collapse`}
            onPress={() => onToggle(node.id)}
            hitSlop={8}
            style={[a.pt_sm, {width: 20}]}>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {isCollapsed ? '▸' : '▾'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{width: 20}} />
        )}

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={node.title}
          onPress={() => onNodePress(node.id)}
          style={[
            a.flex_1,
            a.py_sm,
            a.px_sm,
            a.rounded_sm,
            isSelected && {backgroundColor: t.palette.primary_25},
          ]}>
          <View style={[a.flex_row, a.align_center, a.gap_xs, a.flex_wrap]}>
            {rel ? (
              <View
                style={[
                  a.rounded_full,
                  {width: 6, height: 6, backgroundColor: rel.color},
                ]}
              />
            ) : null}
            {card ? (
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                {card.icon}
              </Text>
            ) : null}
            <Text
              style={[
                a.text_sm,
                node.card_type === 'question' ? a.font_bold : a.font_normal,
                t.atoms.text,
                a.flex_1,
              ]}
              numberOfLines={2}>
              {node.title}
            </Text>
          </View>

          {support > 0 || oppose > 0 ? (
            <View style={[a.flex_row, a.gap_sm, a.mt_2xs, {paddingLeft: 10}]}>
              {support > 0 ? (
                <Text style={[a.text_xs, {color: REL_META.supports?.color}]}>
                  {plural(support, {one: '# supporting', other: '# supporting'})}
                </Text>
              ) : null}
              {oppose > 0 ? (
                <Text style={[a.text_xs, {color: REL_META.opposes?.color}]}>
                  {plural(oppose, {one: '# opposing', other: '# opposing'})}
                </Text>
              ) : null}
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {!isCollapsed
        ? children.map(child => (
            <OutlineBranch
              key={child.node.id}
              branch={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
              onNodePress={onNodePress}
              selectedNodeId={selectedNodeId}
            />
          ))
        : null}
    </View>
  )
}
