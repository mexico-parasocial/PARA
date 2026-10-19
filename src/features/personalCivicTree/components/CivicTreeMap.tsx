import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Pattern,
  Polygon,
  Rect,
} from 'react-native-svg'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CivicTreeCollection} from '#/state/queries/collections'
import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'
import {PERSONAL_RELATION_DIRECTED} from '#/features/civicTree/colors'
import {MapViewport} from '#/features/civicTree/components/MapViewport'
import {
  arrowFor,
  cameraToShow,
  clusterTitleBox,
  MAP_GROUPINGS,
  type MapCamera,
  type MapGrouping,
  type MapVisibleRect,
  screenRadius,
  zoomMapCamera,
} from '#/features/civicTree/map'
import {placeMapLabels} from '#/features/civicTree/mapLabels'
import {type PersonalTreeGraph} from '../graph'
import {buildCivicMapLayout} from '../map'
import {ConnectTreeItemsDialog} from './ConnectTreeItemsDialog'
import {PersonalTreeNodeSheet} from './PersonalTreeNodeSheet'

/** Width of the details column docked beside the map on wide screens. */
const PANEL_WIDTH = 340
/** Below this map width the details open as a bottom sheet instead. */
const DOCK_MIN_WIDTH = 720
const GLIDE_MS = 260

export function CivicTreeMap({
  graph,
  collections,
  searchQuery,
  onOpenCollection,
  onEditItem,
  onRemoveItem,
  onAddToCollection,
  onSelectCollection,
}: {
  graph: PersonalTreeGraph
  collections: CivicTreeCollection[]
  searchQuery: string
  onOpenCollection: (id: string) => void
  onEditItem: (id: string) => void
  onRemoveItem: (id: string) => void
  onAddToCollection: (id: string) => void
  onSelectCollection: (id: string | undefined) => void
}) {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const {_, i18n} = useLingui()
  const [grouping, setGrouping] = useState<MapGrouping>('collection')
  const [size, setSize] = useState({width: 600, height: 500})
  const [camera, setCamera] = useState<MapCamera>({x: 0, y: 0, scale: 1})
  const [selectedId, setSelectedId] = useState<string>()
  const [clusterId, setClusterId] = useState<string>()
  const connectControl = Dialog.useDialogControl()
  const layout = useMemo(
    () => buildCivicMapLayout(graph, grouping, searchQuery, _),
    [graph, grouping, searchQuery, _],
  )
  const fitCamera = useMemo(() => {
    const scale = Math.max(
      0.15,
      Math.min(
        1,
        (size.width - 56) / layout.width,
        (size.height - 100) / layout.height,
      ),
    )
    return {
      scale,
      x: (size.width - layout.width * scale) / 2,
      y: (size.height - layout.height * scale) / 2,
    }
  }, [layout.width, layout.height, size])
  useEffect(() => {
    setCamera(fitCamera)
  }, [fitCamera, grouping, searchQuery])
  const selectedNode = graph.nodes.find(n => n.id === selectedId)
  const selectedCollection = collections.find(c => c.id === selectedNode?.group)
  const selectedCluster = layout.clusters.find(c => c.id === clusterId)
  const targetCollectionId =
    selectedNode?.group ??
    (selectedCluster?.collectionIds.length === 1
      ? selectedCluster.collectionIds[0]
      : undefined)
  useEffect(() => {
    onSelectCollection(targetCollectionId)
  }, [targetCollectionId, onSelectCollection])
  const pointById = new Map(layout.nodes.map(n => [n.node.id, n]))

  /*
   * Moves the map makes on its own (bringing a selection into view, fitting)
   * glide; a drag, pinch or wheel takes over at once.
   */
  const cameraRef = useRef(camera)
  cameraRef.current = camera
  const frame = useRef<number | undefined>(undefined)
  const stopGlide = useCallback(() => {
    if (frame.current !== undefined) cancelAnimationFrame(frame.current)
    frame.current = undefined
  }, [])
  useEffect(() => stopGlide, [stopGlide])
  const setCameraFromUser = useCallback<Dispatch<SetStateAction<MapCamera>>>(
    update => {
      stopGlide()
      setCamera(update)
    },
    [stopGlide],
  )
  const glideTo = useCallback(
    (target: MapCamera) => {
      stopGlide()
      const from = cameraRef.current
      if (
        from.x === target.x &&
        from.y === target.y &&
        from.scale === target.scale
      ) {
        return
      }
      const start = Date.now()
      const step = () => {
        const p = Math.min(1, (Date.now() - start) / GLIDE_MS)
        const e = 1 - Math.pow(1 - p, 3)
        setCamera({
          x: from.x + (target.x - from.x) * e,
          y: from.y + (target.y - from.y) * e,
          scale: from.scale + (target.scale - from.scale) * e,
        })
        frame.current = p < 1 ? requestAnimationFrame(step) : undefined
      }
      frame.current = requestAnimationFrame(step)
    },
    [stopGlide],
  )

  /*
   * The details panel sits over the map rather than beside it, so opening it
   * never resizes the map and resets the zoom. Instead the camera works within
   * the part the panel leaves uncovered: a column on the right on wide
   * screens, a bottom sheet on narrow ones.
   */
  const docked = gtMobile && size.width >= DOCK_MIN_WIDTH
  const [sheetHeight, setSheetHeight] = useState(0)
  const panelOpen = !!(selectedNode || selectedCluster)
  const uncovered = (open: boolean): MapVisibleRect => {
    if (!open) return {x: 0, y: 0, width: size.width, height: size.height}
    if (docked) {
      return {x: 0, y: 0, width: size.width - PANEL_WIDTH, height: size.height}
    }
    const sheet = sheetHeight || size.height * 0.5
    return {
      x: 0,
      y: 0,
      width: size.width,
      height: Math.max(120, size.height - sheet),
    }
  }
  const visibleRect = uncovered(panelOpen)

  /* Tapping the selected item again lets go of it. */
  const selectNode = (id: string) => {
    if (id === selectedId) {
      setSelectedId(undefined)
      return
    }
    setSelectedId(id)
    setClusterId(undefined)
    const point = pointById.get(id)
    if (point) glideTo(cameraToShow(cameraRef.current, point, uncovered(true)))
  }

  const neighbours = useMemo(() => {
    if (!selectedId) return undefined
    const ids = new Set<string>()
    for (const edge of graph.edges) {
      if (edge.source === selectedId) ids.add(edge.target)
      if (edge.target === selectedId) ids.add(edge.source)
    }
    return ids
  }, [graph.edges, selectedId])
  const inFocus = (id: string) =>
    !neighbours || id === selectedId || neighbours.has(id)

  /*
   * Labels go to the best-connected items first and only where they fit, so
   * the map is legible at any zoom. With a selection, only the selection and
   * what it connects to compete, and every neighbour outranks the rest.
   */
  const labels = useMemo(
    () =>
      placeMapLabels(
        layout.nodes
          .filter(({node}) => inFocus(node.id))
          .map(({node, x, y}) => ({
            id: node.id,
            x: camera.x + x * camera.scale,
            y: camera.y + y * camera.scale,
            r: screenRadius(node.radius, camera.scale),
            text: node.title,
            priority: node.metadata.degree,
            force: node.id === selectedId,
          })),
        {
          viewport: visibleRect,
          obstacles: layout.clusters.map(cluster => {
            const box = clusterTitleBox(cluster, camera)
            return {
              left: box.left,
              top: box.top,
              right: box.left + box.width,
              bottom: box.top + box.height,
            }
          }),
        },
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      layout.nodes,
      layout.clusters,
      camera,
      selectedId,
      neighbours,
      visibleRect.width,
      visibleRect.height,
    ],
  )
  const zoom = (factor: number) =>
    setCamera(previous =>
      zoomMapCamera(previous, previous.scale * factor, {
        x: size.width / 2,
        y: size.height / 2,
      }),
    )
  const focusCluster = (id: string) => {
    const cluster = layout.clusters.find(c => c.id === id)
    if (!cluster) return
    setSelectedId(undefined)
    setClusterId(id)
    const area = uncovered(true)
    const scale = Math.max(
      0.15,
      Math.min(
        1.5,
        (area.width - 80) / (cluster.radius * 2 + 100),
        (area.height - 60) / (cluster.radius * 2 + 100),
      ),
    )
    glideTo({
      scale,
      x: area.x + area.width / 2 - cluster.x * scale,
      y: area.y + area.height / 2 - cluster.y * scale,
    })
  }

  return (
    <View style={[a.flex_1, a.w_full, {minHeight: 420}]}>
      <View
        style={[
          a.px_md,
          a.py_sm,
          a.border_b,
          t.atoms.border_contrast_low,
          a.gap_sm,
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[a.align_center, a.gap_xs]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.pr_sm]}>
            <Trans>Group by</Trans>
          </Text>
          {MAP_GROUPINGS.map(mode => (
            <Button
              key={mode.id}
              label={i18n._(mode.label)}
              size="small"
              variant={grouping === mode.id ? 'solid' : 'ghost'}
              color={grouping === mode.id ? 'primary' : 'secondary'}
              accessibilityState={{selected: grouping === mode.id}}
              onPress={() => {
                setGrouping(mode.id)
                setClusterId(undefined)
                setSelectedId(undefined)
              }}>
              <ButtonText>{i18n._(mode.label)}</ButtonText>
            </Button>
          ))}
        </ScrollView>
        {grouping === 'axis' ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Six civic fields. Items use their flair or a directly connected
              topic; everything else is unassigned.
            </Trans>
          </Text>
        ) : grouping === 'size' ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Largest collections first. Cluster area reflects the number of
              saved items.
            </Trans>
          </Text>
        ) : null}
      </View>
      {layout.clusters.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{flexGrow: 0}}
          contentContainerStyle={[a.px_md, a.py_sm, a.gap_sm]}>
          {layout.clusters.map(cluster => (
            <Button
              key={cluster.id}
              label={_(msg`Focus ${cluster.label}`)}
              variant="ghost"
              color="secondary"
              size="small"
              onPress={() => focusCluster(cluster.id)}
              accessibilityState={{selected: clusterId === cluster.id}}>
              <View style={[a.flex_row, a.align_center, a.gap_xs]}>
                <View
                  style={[
                    a.rounded_full,
                    {width: 7, height: 7, backgroundColor: cluster.color},
                  ]}
                />
                <Text style={[a.text_xs, t.atoms.text]}>{cluster.label}</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
                  {cluster.nodes.length}
                </Text>
              </View>
            </Button>
          ))}
        </ScrollView>
      ) : null}
      <View
        testID="civic-tree-map"
        onLayout={event => {
          const {width, height} = event.nativeEvent.layout
          if (width > 0 && height > 0) setSize({width, height})
        }}
        style={[
          a.flex_1,
          a.relative,
          a.overflow_hidden,
          t.atoms.bg_contrast_25,
        ]}>
        <MapViewport camera={camera} setCamera={setCameraFromUser}>
          <Svg width={size.width} height={size.height}>
            <Defs>
              <Pattern
                id="civic-map-grid"
                width={24}
                height={24}
                patternUnits="userSpaceOnUse">
                <Circle cx={1} cy={1} r={1} fill={t.palette.contrast_100} />
              </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#civic-map-grid)" />
            <G
              transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
              {layout.clusters.map(cluster => (
                <G key={cluster.id}>
                  <Circle
                    cx={cluster.x}
                    cy={cluster.y}
                    r={cluster.radius}
                    fill={cluster.color}
                    fillOpacity={0.055}
                    stroke={cluster.color}
                    strokeOpacity={clusterId === cluster.id ? 0.9 : 0.28}
                    strokeWidth={clusterId === cluster.id ? 2 : 1}
                    strokeDasharray={
                      cluster.nodes.length === 0 ? '6 6' : undefined
                    }
                  />
                </G>
              ))}
              {graph.edges.map(edge => {
                const source = pointById.get(edge.source)
                const target = pointById.get(edge.target)
                if (!source || !target) return null
                const active =
                  edge.source === selectedId || edge.target === selectedId
                const arrow =
                  active && PERSONAL_RELATION_DIRECTED[edge.kind]
                    ? arrowFor(
                        source,
                        target,
                        screenRadius(target.node.radius, camera.scale) /
                          camera.scale,
                        camera.scale,
                      )
                    : undefined
                const end = arrow?.end ?? target
                return (
                  <G key={`${source.node.group}:${edge.id}`}>
                    <Line
                      x1={source.x}
                      y1={source.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={edge.color}
                      strokeWidth={active ? 2.5 : 1.5}
                      strokeOpacity={active ? 1 : selectedId ? 0.06 : 0.35}
                    />
                    {arrow ? (
                      <Polygon points={arrow.points} fill={edge.color} />
                    ) : null}
                  </G>
                )
              })}
            </G>
          </Svg>
          {layout.clusters.map(cluster => {
            const title = clusterTitleBox(cluster, camera)
            return (
              <TouchableOpacity
                key={cluster.id}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Inspect cluster ${cluster.label}`)}
                accessibilityHint={_(
                  msg`Focuses this cluster and shows its collections`,
                )}
                onPress={() => focusCluster(cluster.id)}
                style={[
                  a.absolute,
                  a.align_center,
                  {left: title.left, top: title.top, width: title.width},
                ]}>
                {cluster.section ? (
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    {cluster.section}
                  </Text>
                ) : null}
                <Text
                  numberOfLines={1}
                  style={[a.text_sm, a.font_bold, t.atoms.text]}>
                  {cluster.label}
                </Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  {plural(cluster.nodes.length, {
                    one: '# item',
                    other: '# items',
                  })}
                </Text>
              </TouchableOpacity>
            )
          })}
          {layout.nodes.map(({node, x, y}) => {
            const selected = selectedId === node.id
            const radius = screenRadius(node.radius, camera.scale)
            return (
              <TouchableOpacity
                key={node.id}
                accessibilityRole="button"
                accessibilityLabel={_(msg`Inspect ${node.title}`)}
                accessibilityHint={_(msg`Shows this item and its connections`)}
                accessibilityState={{selected}}
                onPress={() => selectNode(node.id)}
                style={[
                  a.absolute,
                  a.align_center,
                  a.justify_center,
                  {
                    opacity: inFocus(node.id) ? 1 : 0.22,
                    left: camera.x + x * camera.scale - radius - 3,
                    top: camera.y + y * camera.scale - radius - 3,
                    width: radius * 2 + 6,
                    height: radius * 2 + 6,
                  },
                ]}>
                <View
                  style={[
                    a.rounded_full,
                    {
                      width: radius * 2,
                      height: radius * 2,
                      backgroundColor: node.color,
                      borderWidth: selected ? 3 : Math.min(2, camera.scale * 2),
                      borderColor: selected
                        ? t.palette.primary_500
                        : node.borderColor,
                    },
                  ]}
                />
              </TouchableOpacity>
            )
          })}
          {layout.nodes.map(({node}) => {
            const label = labels.get(node.id)
            if (!label) return null
            return (
              <View
                key={`label:${node.id}`}
                pointerEvents="none"
                style={[
                  a.absolute,
                  {left: label.left, top: label.top, width: label.width},
                ]}>
                <Text
                  numberOfLines={1}
                  style={[
                    a.text_xs,
                    label.side === 'right'
                      ? a.text_left
                      : label.side === 'left'
                        ? a.text_right
                        : a.text_center,
                    node.id === selectedId ? a.font_bold : null,
                    t.atoms.text,
                    {lineHeight: 16},
                  ]}>
                  {node.title}
                </Text>
              </View>
            )
          })}
        </MapViewport>
        {layout.clusters.length === 0 ? (
          <View
            pointerEvents="none"
            style={[
              a.absolute,
              a.inset_0,
              a.align_center,
              a.justify_center,
              a.p_xl,
            ]}>
            <View
              style={[
                a.p_xl,
                a.rounded_lg,
                a.border,
                t.atoms.bg,
                t.atoms.border_contrast_low,
                a.align_center,
                a.gap_md,
                {maxWidth: 420},
              ]}>
              <View
                style={[
                  a.rounded_full,
                  a.align_center,
                  a.justify_center,
                  {
                    width: 72,
                    height: 72,
                    backgroundColor: t.palette.primary_25,
                  },
                ]}>
                <Svg width={48} height={48}>
                  <Line
                    x1={13}
                    y1={14}
                    x2={34}
                    y2={25}
                    stroke={t.palette.primary_300}
                    strokeWidth={2}
                  />
                  <Line
                    x1={34}
                    y1={25}
                    x2={17}
                    y2={37}
                    stroke={t.palette.primary_300}
                    strokeWidth={2}
                  />
                  <Circle cx={13} cy={14} r={6} fill={t.palette.primary_500} />
                  <Circle cx={34} cy={25} r={5} fill={t.palette.primary_300} />
                  <Circle cx={17} cy={37} r={4} fill={t.palette.primary_400} />
                </Svg>
              </View>
              <Text
                style={[a.text_xl, a.font_bold, a.text_center, t.atoms.text]}>
                {searchQuery ? (
                  <Trans>No matching items</Trans>
                ) : collections.length ? (
                  <Trans>Add something worth connecting</Trans>
                ) : (
                  <Trans>A map of what matters to you</Trans>
                )}
              </Text>
              <Text
                style={[
                  a.text_sm,
                  a.text_center,
                  a.leading_relaxed,
                  t.atoms.text_contrast_medium,
                ]}>
                {searchQuery ? (
                  <Trans>
                    Try a different search to see your collections and items.
                  </Trans>
                ) : (
                  <Trans>
                    Create a collection above, then save topics, policies,
                    evidence and notes. Your collections become islands you can
                    explore and connect.
                  </Trans>
                )}
              </Text>
            </View>
          </View>
        ) : null}
        {panelOpen ? (
          <View
            onLayout={
              docked
                ? undefined
                : event => setSheetHeight(event.nativeEvent.layout.height)
            }
            style={[
              a.absolute,
              t.atoms.bg,
              t.atoms.border_contrast_low,
              docked
                ? [
                    a.border_l,
                    {top: 0, right: 0, bottom: 0, width: PANEL_WIDTH},
                  ]
                : [
                    a.border_t,
                    {
                      left: 0,
                      right: 0,
                      bottom: 0,
                      maxHeight: size.height * 0.5,
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    },
                  ],
            ]}>
            {docked ? null : (
              <View style={[a.align_center, a.pt_sm]}>
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: t.palette.contrast_200,
                  }}
                />
              </View>
            )}
            <ScrollView>
              {selectedNode ? (
                <>
                  <View style={[a.p_md]}>
                    <Button
                      label={_(msg`Connect item`)}
                      variant="solid"
                      color="primary"
                      size="small"
                      onPress={() => connectControl.open()}>
                      <ButtonText>
                        <Trans>Connect item</Trans>
                      </ButtonText>
                    </Button>
                  </View>
                  <PersonalTreeNodeSheet
                    graph={graph}
                    nodeId={selectedNode.id}
                    onClose={() => setSelectedId(undefined)}
                    onOpenCollection={onOpenCollection}
                    onSelectNode={selectNode}
                    fill={docked}
                    onEdit={onEditItem}
                    onRemove={onRemoveItem}
                  />
                </>
              ) : selectedCluster ? (
                <View style={[a.p_lg, a.gap_md]}>
                  <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                    <Text
                      style={[a.flex_1, a.text_lg, a.font_bold, t.atoms.text]}>
                      {selectedCluster.label}
                    </Text>
                    <Button
                      label={_(msg`Close cluster details`)}
                      variant="ghost"
                      color="secondary"
                      size="small"
                      onPress={() => setClusterId(undefined)}>
                      <ButtonText>×</ButtonText>
                    </Button>
                  </View>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    {plural(selectedCluster.nodes.length, {
                      one: '# saved item',
                      other: '# saved items',
                    })}
                  </Text>
                  {selectedCluster.collectionIds.map(id => (
                    <View key={id} style={[a.gap_xs]}>
                      <Button
                        label={_(
                          msg`Open collection ${collections.find(c => c.id === id)?.name ?? ''}`,
                        )}
                        variant="outline"
                        color="secondary"
                        size="small"
                        onPress={() => onOpenCollection(id)}>
                        <ButtonText>
                          {collections.find(c => c.id === id)?.name}
                        </ButtonText>
                      </Button>
                      <Button
                        label={_(msg`Add item to collection`)}
                        variant="ghost"
                        color="primary"
                        size="small"
                        onPress={() => onAddToCollection(id)}>
                        <ButtonText>
                          <Trans>Add item</Trans>
                        </ButtonText>
                      </Button>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
        {/* A bottom sheet covers the controls' corner; pinching still zooms. */}
        {panelOpen && !docked ? null : (
          <View
            style={[
              a.absolute,
              a.flex_row,
              a.align_center,
              a.gap_xs,
              a.p_xs,
              a.rounded_md,
              a.border,
              t.atoms.bg,
              t.atoms.border_contrast_low,
              // Phones keep the bottom-right corner for the screen's FABs.
              gtMobile
                ? {
                    bottom: 16,
                    right: 16 + (panelOpen && docked ? PANEL_WIDTH : 0),
                  }
                : {bottom: 16, left: 16},
            ]}>
            <Button
              label={_(msg`Zoom out`)}
              variant="ghost"
              color="secondary"
              size="small"
              onPress={() => zoom(1 / 1.25)}>
              <ButtonText>−</ButtonText>
            </Button>
            <Text
              style={[
                a.text_xs,
                a.text_center,
                t.atoms.text_contrast_medium,
                {minWidth: 40},
              ]}>
              {Math.round(camera.scale * 100)}%
            </Text>
            <Button
              label={_(msg`Zoom in`)}
              variant="ghost"
              color="secondary"
              size="small"
              onPress={() => zoom(1.25)}>
              <ButtonText>+</ButtonText>
            </Button>
            <Button
              label={_(msg`Fit map`)}
              variant="ghost"
              color="secondary"
              size="small"
              onPress={() => {
                glideTo(fitCamera)
                setSelectedId(undefined)
                setClusterId(undefined)
              }}>
              <ButtonText>
                <Trans>Fit</Trans>
              </ButtonText>
            </Button>
          </View>
        )}
      </View>
      <View
        style={[
          a.flex_row,
          a.flex_wrap,
          a.align_center,
          a.justify_between,
          a.gap_sm,
          a.px_md,
          a.py_sm,
          a.border_t,
          t.atoms.border_contrast_low,
        ]}>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          <Trans>
            Drag to pan · Scroll or pinch to zoom · Select to inspect
          </Trans>
        </Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
          {plural(layout.clusters.length, {
            one: '# cluster',
            other: '# clusters',
          })}
          {' · '}
          {plural(graph.totalRelations, {
            one: '# connection',
            other: '# connections',
          })}
        </Text>
      </View>
      <ConnectTreeItemsDialog
        control={connectControl}
        collection={selectedCollection}
        sourceItem={selectedNode?.metadata.item}
      />
    </View>
  )
}
