import {useCallback, useEffect, useMemo, useRef, useState} from 'react'

import {
  findNewNodes,
  generateDeterministicPositions,
  generateEntrancePositions,
} from './deterministic-layout'

export interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  mass: number
  isNew?: boolean
  stance?: string
}

export interface SimEdge {
  source: string
  target: string
  idealLength: number
  strength: number
}

interface SimulationConfig {
  repulsionStrength?: number
  springStrength?: number
  springLength?: number
  centerStrength?: number
  damping?: number
  maxTicks?: number
  ideologicalGravity?: number
}

function initNodes(
  nodeIds: string[],
  prevNodes: SimNode[],
  width: number,
  height: number,
  stanceMap?: Map<string, string>,
): SimNode[] {
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))
  const positions = generateDeterministicPositions(nodeIds, width, height)
  const newNodeIds = findNewNodes(nodeIds, prevNodes.map(n => n.id))

  // New nodes get entrance positions from the edge
  const entrancePositions =
    newNodeIds.size > 0 && prevNodes.length > 0
      ? generateEntrancePositions(
          Array.from(newNodeIds),
          width,
          height,
        )
      : new Map()

  return nodeIds.map((id, i) => {
    const prev = prevMap.get(id)
    const pos = positions[i]
    const isNew = newNodeIds.has(id)
    const stance = stanceMap?.get(id)

    if (prev) {
      // Existing node: keep its settled position, update stance
      return {
        ...prev,
        vx: 0,
        vy: 0,
        isNew: false,
        stance,
      }
    }

    // New node: start from entrance position or deterministic position
    const entrance = entrancePositions.get(id)
    return {
      id,
      x: entrance?.x ?? pos.x,
      y: entrance?.y ?? pos.y,
      vx: 0,
      vy: 0,
      radius: 8 + Math.min(id.length * 0.15, 12),
      mass: 1,
      isNew: isNew && prevNodes.length > 0,
      stance,
    }
  })
}

function tick(
  nodes: SimNode[],
  edges: SimEdge[],
  width: number,
  height: number,
  config: Required<SimulationConfig>,
): void {
  const {repulsionStrength, springStrength, springLength, centerStrength, damping, ideologicalGravity} = config
  const cx = width / 2
  const cy = height / 2

  // Repulsion (Coulomb-like)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      let dx = b.x - a.x
      let dy = b.y - a.y
      let distSq = dx * dx + dy * dy
      if (distSq < 1) distSq = 1
      const dist = Math.sqrt(distSq)
      const force = repulsionStrength / distSq
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      a.vx -= fx / a.mass
      a.vy -= fy / a.mass
      b.vx += fx / b.mass
      b.vy += fy / b.mass
    }
  }

  // Build index for O(1) edge lookups instead of O(N) .find() per edge
  const nodeIndex = new Map<string, SimNode>()
  for (const n of nodes) {
    nodeIndex.set(n.id, n)
  }

  // Spring attraction (Hooke-like) — now O(E) instead of O(E×N)
  for (const edge of edges) {
    const source = nodeIndex.get(edge.source)
    const target = nodeIndex.get(edge.target)
    if (!source || !target) continue
    let dx = target.x - source.x
    let dy = target.y - source.y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const displacement = dist - (edge.idealLength || springLength)
    const force = springStrength * displacement * edge.strength
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    source.vx += fx / source.mass
    source.vy += fy / source.mass
    target.vx -= fx / target.mass
    target.vy -= fy / target.mass
  }

  // Ideological gravity: same stance attracts, opposite repels
  if (ideologicalGravity > 0) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        if (!a.stance || !b.stance) continue
        if (a.stance === 'neutral' || b.stance === 'neutral') continue

        let dx = b.x - a.x
        let dy = b.y - a.y
        const distSq = Math.max(dx * dx + dy * dy, 1)
        const dist = Math.sqrt(distSq)

        let force: number
        if (a.stance === b.stance) {
          // Same stance: gentle attraction (pull together)
          force = ideologicalGravity * 0.5 / dist
        } else {
          // Opposite stance: repulsion (push apart)
          force = -ideologicalGravity * 1.2 / dist
        }

        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx += fx / a.mass
        a.vy += fy / a.mass
        b.vx -= fx / b.mass
        b.vy -= fy / b.mass
      }
    }
  }

  // Center gravity
  for (const node of nodes) {
    node.vx += (cx - node.x) * centerStrength
    node.vy += (cy - node.y) * centerStrength
  }

  // Collision (soft repulsion when overlapping)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const minDist = a.radius + b.radius + 6
      if (dist < minDist) {
        const overlap = minDist - dist
        const force = overlap * 0.3
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }
  }

  // Apply velocity with damping
  for (const node of nodes) {
    node.vx *= damping
    node.vy *= damping
    node.x += node.vx
    node.y += node.vy

    // Keep within bounds (soft)
    const margin = node.radius + 10
    if (node.x < margin) {
      node.x = margin
      node.vx *= -0.5
    }
    if (node.x > width - margin) {
      node.x = width - margin
      node.vx *= -0.5
    }
    if (node.y < margin) {
      node.y = margin
      node.vy *= -0.5
    }
    if (node.y > height - margin) {
      node.y = height - margin
      node.vy *= -0.5
    }
  }
}

/** How often to flush simulation state to React (every N frames) */
const RENDER_INTERVAL = 4

export function useForceSimulation(
  nodeIds: string[],
  edges: SimEdge[],
  width: number,
  height: number,
  config: SimulationConfig,
  stanceMap?: Map<string, string>,
) {
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [isSettled, setIsSettled] = useState(false)
  const animRef = useRef<number | null>(null)
  const tickCount = useRef(0)
  const settledRef = useRef(false)
  const stanceMapRef = useRef(stanceMap)
  stanceMapRef.current = stanceMap

  // Simulation state lives in a ref — mutated in-place, flushed to React
  // every RENDER_INTERVAL frames instead of every single frame
  const simNodesRef = useRef<SimNode[]>([])

  const fullConfig: Required<SimulationConfig> = useMemo(
    () => ({
      repulsionStrength: 800,
      springStrength: 0.03,
      springLength: 120,
      centerStrength: 0.008,
      damping: 0.85,
      maxTicks: 300,
      ideologicalGravity: 400,
      ...config,
    }),
    // Config is an object literal {} from the call site, so we track its values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      config.repulsionStrength,
      config.springStrength,
      config.springLength,
      config.centerStrength,
      config.damping,
      config.maxTicks,
      config.ideologicalGravity,
    ],
  )

  // Stable key for nodeIds — avoids .join() inside useEffect dependency array
  const nodeIdKey = useMemo(() => nodeIds.join(','), [nodeIds])

  // Initialize or update nodes when node IDs change
  useEffect(() => {
    const initialized = initNodes(
      nodeIds,
      simNodesRef.current,
      width,
      height,
      stanceMapRef.current,
    )
    simNodesRef.current = initialized
    setNodes(initialized)
    tickCount.current = 0
    settledRef.current = false
    setIsSettled(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIdKey, width, height])

  // Store edges in a ref so the animation loop always reads the latest
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const configRef = useRef(fullConfig)
  configRef.current = fullConfig

  // Run simulation — uses refs for hot-path data, flushes to state periodically
  useEffect(() => {
    if (simNodesRef.current.length === 0) return
    if (settledRef.current) return

    const step = () => {
      tickCount.current++

      // Mutate in-place — no cloning, no React overhead
      tick(
        simNodesRef.current,
        edgesRef.current,
        width,
        height,
        configRef.current,
      )

      // Flush to React every N frames (snapshot copies for immutability)
      if (
        tickCount.current % RENDER_INTERVAL === 0 ||
        tickCount.current >= configRef.current.maxTicks
      ) {
        setNodes(simNodesRef.current.map(n => ({...n})))
      }

      if (tickCount.current < configRef.current.maxTicks) {
        animRef.current = requestAnimationFrame(step)
      } else {
        settledRef.current = true
        setIsSettled(true)
      }
    }

    animRef.current = requestAnimationFrame(step)

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [nodeIdKey, width, height]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = useCallback(() => {
    const initialized = initNodes(
      nodeIds,
      [],
      width,
      height,
      stanceMapRef.current,
    )
    simNodesRef.current = initialized
    setNodes(initialized)
    tickCount.current = 0
    settledRef.current = false
    setIsSettled(false)
  }, [nodeIds, width, height])

  return {nodes, isSettled, restart}
}
