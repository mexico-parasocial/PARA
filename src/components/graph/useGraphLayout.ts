import {useCallback, useEffect, useRef, useState} from 'react'

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
  group?: string
}

export interface SimEdge {
  source: string
  target: string
  idealLength: number
  strength: number
}

export interface GraphViewport {
  panX: number
  panY: number
  scale: number
}

export interface SimulationConfig {
  repulsionStrength?: number
  springStrength?: number
  springLength?: number
  centerStrength?: number
  damping?: number
  maxTicks?: number
  groupGravity?: number
}

function initNodes(
  nodeIds: string[],
  prevNodes: SimNode[],
  width: number,
  height: number,
  groupMap?: Map<string, string>,
): SimNode[] {
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))
  const positions = generateDeterministicPositions(nodeIds, width, height)
  const newNodeIds = findNewNodes(nodeIds, prevNodes.map(n => n.id))

  const positionMap = new Map(positions.map((p, i) => [nodeIds[i], p]))
  const entrancePositions =
    newNodeIds.size > 0 && prevNodes.length > 0
      ? generateEntrancePositions(
          Array.from(newNodeIds),
          positionMap,
          width,
          height,
        )
      : new Map()

  return nodeIds.map((id, i) => {
    const prev = prevMap.get(id)
    const pos = positions[i]
    const isNew = newNodeIds.has(id)
    const group = groupMap?.get(id)

    if (prev) {
      return {
        ...prev,
        vx: 0,
        vy: 0,
        isNew: false,
        group,
      }
    }

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
      group,
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
  const {
    repulsionStrength,
    springStrength,
    springLength,
    centerStrength,
    damping,
    groupGravity,
  } = config
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

  // Spring attraction (Hooke-like)
  for (const edge of edges) {
    const source = nodes.find(n => n.id === edge.source)
    const target = nodes.find(n => n.id === edge.target)
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

  // Group gravity: same group attracts, different groups repel gently
  if (groupGravity > 0) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        if (!a.group || !b.group) continue

        let dx = b.x - a.x
        let dy = b.y - a.y
        const distSq = Math.max(dx * dx + dy * dy, 1)
        const dist = Math.sqrt(distSq)

        let force: number
        if (a.group === b.group) {
          force = groupGravity * 0.5 / dist
        } else {
          force = -groupGravity * 0.3 / dist
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

export function useGraphLayout(
  nodeIds: string[],
  edges: SimEdge[],
  width: number,
  height: number,
  config: SimulationConfig,
  groupMap?: Map<string, string>,
) {
  const [nodes, setNodes] = useState<SimNode[]>([])
  const [isSettled, setIsSettled] = useState(false)
  const animRef = useRef<number | null>(null)
  const tickCount = useRef(0)
  const settledRef = useRef(false)
  const prevNodeIdsRef = useRef<string[]>([])
  const groupMapRef = useRef(groupMap)
  groupMapRef.current = groupMap

  const fullConfig: Required<SimulationConfig> = {
    repulsionStrength: 800,
    springStrength: 0.03,
    springLength: 120,
    centerStrength: 0.008,
    damping: 0.85,
    maxTicks: 300,
    groupGravity: 400,
    ...config,
  }

  // Initialize or update nodes when node IDs change
  useEffect(() => {
    const idKey = nodeIds.join(',')
    const prevKey = prevNodeIdsRef.current.join(',')
    if (idKey === prevKey && nodes.length > 0) return

    prevNodeIdsRef.current = [...nodeIds]
    setNodes(prev => initNodes(nodeIds, prev, width, height, groupMapRef.current))
    tickCount.current = 0
    settledRef.current = false
    setIsSettled(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeIds.join(','), width, height])

  // Run simulation
  useEffect(() => {
    if (nodes.length === 0) return
    if (settledRef.current) return

    const step = () => {
      tickCount.current++
      setNodes(prev => {
        const next = prev.map(n => ({...n}))
        tick(next, edges, width, height, fullConfig)
        return next
      })

      if (tickCount.current < fullConfig.maxTicks) {
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
  }, [nodes.length, edges, fullConfig.maxTicks]) // eslint-disable-line react-hooks/exhaustive-deps

  const restart = useCallback(() => {
    prevNodeIdsRef.current = []
    setNodes(initNodes(nodeIds, [], width, height, groupMapRef.current))
    tickCount.current = 0
    settledRef.current = false
    setIsSettled(false)
  }, [nodeIds, width, height])

  return {nodes, isSettled, restart}
}
