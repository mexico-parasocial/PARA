import {useEffect, useMemo} from 'react'
import {View} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated'
import Svg, {Circle, G, Line} from 'react-native-svg'

import {generateDeterministicPositions} from './deterministic-layout'

// ─── Types ───────────────────────────────────────────────────────────────────

interface MiniForceGraphProps {
  nodeCount: number
  edgeCount: number
  color: string
  width?: number
  height?: number
  seed?: string
  animate?: boolean
}

// ─── Deterministic pseudo-random from seed ───────────────────────────────────

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i)
    h |= 0
  }
  return h >>> 0
}

// ─── Generate deterministic mock graph ───────────────────────────────────────

function generateGraph(
  nodeCount: number,
  edgeCount: number,
  seedStr: string,
) {
  const rng = mulberry32(hashString(seedStr))
  const nodes = Array.from({length: Math.min(nodeCount, 12)}, (_, i) => ({
    id: `n-${i}`,
    radius: 3 + rng() * 3,
    mass: 1,
  }))

  const maxEdges = (nodes.length * (nodes.length - 1)) / 2
  const targetEdges = Math.min(edgeCount, maxEdges)
  const edges: {source: string; target: string}[] = []
  const edgeSet = new Set<string>()

  // Ensure connected graph: chain all nodes
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = nodes[i].id
    const b = nodes[i + 1].id
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    edgeSet.add(key)
    edges.push({source: a, target: b})
  }

  // Add random edges up to target
  while (edges.length < targetEdges) {
    const aIdx = Math.floor(rng() * nodes.length)
    const bIdx = Math.floor(rng() * nodes.length)
    if (aIdx === bIdx) continue
    const a = nodes[aIdx].id
    const b = nodes[bIdx].id
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (edgeSet.has(key)) continue
    edgeSet.add(key)
    edges.push({source: a, target: b})
  }

  return {nodes, edges}
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MiniForceGraph({
  nodeCount,
  edgeCount,
  color,
  width = 100,
  height = 70,
  seed = color,
  animate = true,
}: MiniForceGraphProps) {
  const {nodes, edges} = useMemo(
    () => generateGraph(nodeCount, edgeCount, seed),
    [nodeCount, edgeCount, seed],
  )

  // Use lightweight deterministic layout for small graphs;
  // skip expensive physics simulation to preserve performance
  // when many MiniForceGraph instances render simultaneously.
  const deterministicPositions = useMemo(() => {
    return generateDeterministicPositions(
      nodes.map(n => n.id),
      width,
      height,
    )
  }, [nodes, width, height])

  const nodePositions = useMemo(() => {
    const map = new Map<string, {x: number; y: number}>()
    for (let i = 0; i < nodes.length; i++) {
      map.set(nodes[i].id, deterministicPositions[i])
    }
    return map
  }, [nodes, deterministicPositions])

  const nodeRadius = useMemo(() => {
    const map = new Map<string, number>()
    for (const n of nodes) {
      map.set(n.id, n.radius)
    }
    return map
  }, [nodes])

  // Entrance animation
  const progress = useSharedValue(animate ? 0 : 1)

  useEffect(() => {
    if (!animate) return
    progress.set(() =>
      withDelay(
        150,
        withTiming(1, {
          duration: 700,
          easing: Easing.out(Easing.cubic),
        }),
      ),
    )
  }, [animate, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{scale: 0.85 + progress.get() * 0.15}],
  }))

  if (nodes.length === 0) {
    return <View style={{width, height}} />
  }

  return (
    <Animated.View style={[{width, height}, animatedStyle]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G>
        {/* Edges */}
        {edges.map(edge => {
          const sp = nodePositions.get(edge.source)
          const tp = nodePositions.get(edge.target)
          if (!sp || !tp) return null
          return (
            <Line
              key={`${edge.source}-${edge.target}`}
              x1={sp.x}
              y1={sp.y}
              x2={tp.x}
              y2={tp.y}
              stroke={color}
              strokeWidth={1.2}
              strokeOpacity={0.35}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = nodePositions.get(node.id)
          if (!pos) return null
          const r = nodeRadius.get(node.id) ?? 3.5
          return (
            <Circle
              key={node.id}
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={color}
              opacity={0.9}
            />
          )
        })}
      </G>
      </Svg>
    </Animated.View>
  )
}
