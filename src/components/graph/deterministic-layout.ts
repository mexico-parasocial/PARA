/**
 * Deterministic pseudo-random number generator from a string seed.
 * Same seed → same sequence. Used for consistent graph layouts.
 */
export function seededRandom(seed: string): () => number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }

  return () => {
    hash = (hash * 16807) % 2147483647
    return (hash - 1) / 2147483646
  }
}

/**
 * Generate deterministic initial positions for nodes.
 * Nodes are arranged in a spiral pattern seeded by their IDs,
 * ensuring the same graph always starts with the same layout.
 */
export function generateDeterministicPositions(
  nodeIds: string[],
  width: number,
  height: number,
): Array<{x: number; y: number}> {
  const cx = width / 2
  const cy = height / 2
  const rng = seededRandom(nodeIds.join('|'))
  const maxRadius = Math.min(width, height) * 0.35

  return nodeIds.map((id, index) => {
    // Golden angle spiral for natural distribution
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const angle = index * goldenAngle + rng() * 0.5
    const radius = Math.sqrt(index / Math.max(nodeIds.length, 1)) * maxRadius * (0.7 + rng() * 0.3)

    return {
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    }
  })
}

/**
 * Detect which nodes are new (present in current but not in previous IDs).
 */
export function findNewNodes(
  currentIds: string[],
  previousIds: string[],
): Set<string> {
  const prevSet = new Set(previousIds)
  return new Set(currentIds.filter(id => !prevSet.has(id)))
}

/**
 * Entrance animation positions: new nodes start from the edge
 * of the viewport and spiral inward to their final positions.
 */
export function generateEntrancePositions(
  newNodeIds: string[],
  finalPositions: Map<string, {x: number; y: number}>,
  width: number,
  height: number,
): Map<string, {x: number; y: number}> {
  const cx = width / 2
  const cy = height / 2
  const edgeRadius = Math.max(width, height) * 0.6
  const rng = seededRandom(newNodeIds.join('-entrance-'))
  const result = new Map<string, {x: number; y: number}>()

  for (let i = 0; i < newNodeIds.length; i++) {
    const id = newNodeIds[i]
    const angle = rng() * Math.PI * 2
    const r = edgeRadius * (0.8 + rng() * 0.2)
    result.set(id, {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    })
  }

  return result
}
