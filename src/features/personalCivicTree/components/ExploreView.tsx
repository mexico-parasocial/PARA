import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
  type LayoutChangeEvent,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import Svg, {Circle, G, Line, Polygon, Text as SvgText} from 'react-native-svg'
import {Trans, useLingui} from '@lingui/react/macro'

import {type CivicTreeCollection} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {PERSONAL_RELATION_LABELS} from '#/features/civicTree/colors'
import {ConnectTreeItemsDialog} from '#/features/personalCivicTree/components/ConnectTreeItemsDialog'
import {PersonalTreeNodeSheet} from '#/features/personalCivicTree/components/PersonalTreeNodeSheet'
import {
  buildExploreLayout,
  type ExploreEdge,
  type ExploreNode,
} from '#/features/personalCivicTree/explore'
import {type PersonalTreeGraph} from '#/features/personalCivicTree/graph'

const TWEEN_MS = 340

type Point = {x: number; y: number}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3)

/**
 * Glides every node from wherever it currently is to its new position, so a
 * refocus reads as the tree turning to face the item rather than a redraw.
 * Nodes that did not exist before start at their destination.
 */
function useTweenedPositions(nodes: ExploreNode[]) {
  const [positions, setPositions] = useState<Map<string, Point>>(
    () => new Map(nodes.map(n => [n.id, {x: n.x, y: n.y}])),
  )
  const current = useRef(positions)
  current.current = positions

  useEffect(() => {
    const from = current.current
    const start = Date.now()
    let frame: ReturnType<typeof requestAnimationFrame>

    const step = () => {
      const p = Math.min((Date.now() - start) / TWEEN_MS, 1)
      const k = easeOutCubic(p)
      const next = new Map<string, Point>()
      for (const n of nodes) {
        const f = from.get(n.id) ?? {x: n.x, y: n.y}
        next.set(n.id, {x: f.x + (n.x - f.x) * k, y: f.y + (n.y - f.y) * k})
      }
      setPositions(next)
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [nodes])

  return positions
}

function truncate(label: string, max = 18) {
  return label.length > max ? label.slice(0, max - 1) + '…' : label
}

/*
 * The experimental view. Where the classic graph shows the shape of the whole
 * tree, this one is for moving through it: tap an item and it turns to face
 * you with its connections around it; tap one of those and you hop across.
 */
export function ExploreView({
  graph,
  collections,
  onOpenCollection,
  onEditItem,
  onRemoveItem,
}: {
  graph: PersonalTreeGraph
  collections: CivicTreeCollection[]
  onOpenCollection: (collectionId: string) => void
  onEditItem?: (nodeId: string) => void
  onRemoveItem?: (nodeId: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {height: windowHeight} = useWindowDimensions()
  const connectControl = Dialog.useDialogControl()

  const [canvasWidth, setCanvasWidth] = useState(0)
  const [trail, setTrail] = useState<string[]>([])
  const focusId = trail[trail.length - 1]

  const canvasHeight = Math.min(Math.max(windowHeight * 0.46, 300), 460)
  const width = canvasWidth || 320

  const layout = useMemo(
    () => buildExploreLayout(graph, focusId, {width, height: canvasHeight}),
    [graph, focusId, width, canvasHeight],
  )
  const positions = useTweenedPositions(layout.nodes)
  const pos = (id: string) => positions.get(id) ?? {x: width / 2, y: 0}

  const focusNode = graph.nodes.find(n => n.id === focusId)
  const focusCollection = focusNode
    ? collections.find(c => c.id === focusNode.metadata.collectionId)
    : undefined

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setCanvasWidth(e.nativeEvent.layout.width)
  }, [])

  /*
   * Tapping the item you are already on steps back out rather than doing
   * nothing, so the canvas is always escapable without hunting for a button.
   */
  const onPressNode = useCallback((id: string) => {
    setTrail(prev =>
      prev[prev.length - 1] === id ? prev.slice(0, -1) : [...prev, id],
    )
  }, [])

  const onBack = useCallback(() => setTrail(prev => prev.slice(0, -1)), [])
  const onOverview = useCallback(() => setTrail([]), [])

  const nodeById = new Map(layout.nodes.map(n => [n.id, n]))

  const renderEdge = (edge: ExploreEdge) => {
    const s = nodeById.get(edge.source)
    const tg = nodeById.get(edge.target)
    if (!s || !tg) return null
    const a1 = pos(edge.source)
    const b1 = pos(edge.target)
    const dx = b1.x - a1.x
    const dy = b1.y - a1.y
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    /* Stop the line at the node edge so the arrowhead is not buried. */
    const x2 = b1.x - ux * (tg.r + 2)
    const y2 = b1.y - uy * (tg.r + 2)
    const x1 = a1.x + ux * (s.r + 2)
    const y1 = a1.y + uy * (s.r + 2)
    const head =
      edge.directed && edge.emphasised
        ? `${x2},${y2} ${x2 - ux * 9 - uy * 4},${y2 - uy * 9 + ux * 4} ${
            x2 - ux * 9 + uy * 4
          },${y2 - uy * 9 - ux * 4}`
        : undefined
    return (
      <G key={edge.id} opacity={edge.emphasised ? 1 : 0.28}>
        <Line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={edge.color}
          strokeWidth={edge.emphasised ? 2 : 1.25}
        />
        {head ? <Polygon points={head} fill={edge.color} /> : null}
        {edge.emphasised ? (
          <SvgText
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 4}
            fontSize={9}
            fill={edge.color}
            textAnchor="middle">
            {PERSONAL_RELATION_LABELS[edge.kind] ?? edge.kind}
          </SvgText>
        ) : null}
      </G>
    )
  }

  return (
    <ScrollView
      style={[a.flex_1, a.w_full]}
      contentContainerStyle={{paddingBottom: 100}}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.px_md, a.py_sm]}>
        <Text style={[a.flex_1, a.text_xs, t.atoms.text_contrast_medium]}>
          {focusNode ? (
            <Trans>
              Tap a connection to hop to it. Tap the centre to step back.
            </Trans>
          ) : (
            <Trans>Tap an item to explore what it connects to.</Trans>
          )}
        </Text>
        {trail.length > 0 ? (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={l`Back`}
              accessibilityHint={l`Returns to the previous item`}
              onPress={onBack}
              hitSlop={8}>
              <Text
                style={[
                  a.text_sm,
                  a.font_bold,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>Back</Trans>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={l`Overview`}
              accessibilityHint={l`Shows every collection again`}
              onPress={onOverview}
              hitSlop={8}>
              <Text
                style={[
                  a.text_sm,
                  a.font_bold,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>Overview</Trans>
              </Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <View
        onLayout={onLayout}
        style={{
          height: canvasHeight,
          marginHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: t.palette.contrast_100,
          backgroundColor: t.palette.contrast_25,
          overflow: 'hidden',
        }}>
        <Svg width="100%" height={canvasHeight}>
          {layout.hubs.map(hub => (
            <G key={hub.id}>
              <SvgText
                x={hub.x}
                y={hub.y - 2}
                fontSize={12}
                fontWeight="700"
                fill={t.palette.contrast_600}
                textAnchor="middle">
                {truncate(hub.name, 22)}
              </SvgText>
              <SvgText
                x={hub.x}
                y={hub.y + 11}
                fontSize={9}
                fill={t.palette.contrast_400}
                textAnchor="middle">
                {hub.itemCount}
              </SvgText>
            </G>
          ))}
          {layout.edges.map(renderEdge)}
          {layout.nodes.map(node => {
            const p = pos(node.id)
            const far = node.role === 'far'
            return (
              <G
                key={node.id}
                opacity={far ? 0.35 : 1}
                onPress={() => onPressNode(node.id)}>
                <Circle cx={p.x} cy={p.y} r={node.r + 10} fill="transparent" />
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={node.r}
                  fill={node.color}
                  stroke={
                    node.role === 'focus' ? t.palette.primary_500 : 'none'
                  }
                  strokeWidth={node.role === 'focus' ? 3 : 0}
                />
                {node.showLabel ? (
                  <SvgText
                    x={p.x}
                    y={p.y + node.r + 12}
                    fontSize={node.role === 'focus' ? 12 : 10}
                    fontWeight={node.role === 'focus' ? '700' : '400'}
                    fill={t.palette.contrast_800}
                    textAnchor="middle">
                    {truncate(node.title, node.role === 'focus' ? 26 : 16)}
                  </SvgText>
                ) : null}
              </G>
            )
          })}
        </Svg>
      </View>

      {focusNode ? (
        <View style={[a.pt_md]}>
          <View style={[a.flex_row, a.gap_sm, a.px_md, a.pb_sm]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={l`Connect`}
              accessibilityHint={l`Draws a relation from this item to another in its collection`}
              onPress={() => connectControl.open()}
              style={[
                a.rounded_md,
                a.px_md,
                a.py_sm,
                {backgroundColor: t.palette.primary_500},
              ]}>
              <Text style={[a.text_sm, a.font_bold, {color: 'white'}]}>
                <Trans>Connect</Trans>
              </Text>
            </TouchableOpacity>
          </View>
          <PersonalTreeNodeSheet
            graph={graph}
            nodeId={focusNode.id}
            onClose={onOverview}
            onOpenCollection={onOpenCollection}
            onEdit={onEditItem}
            onRemove={onRemoveItem}
          />
        </View>
      ) : null}

      <ConnectTreeItemsDialog
        control={connectControl}
        collection={focusCollection}
        sourceItem={focusNode?.metadata.item}
      />
    </ScrollView>
  )
}
