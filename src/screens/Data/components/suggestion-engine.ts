/**
 * Civic-Aware Connection Suggestion Engine
 * ==========================================
 * Multi-signal scoring algorithm that leverages the full PARA civic architecture
 * to suggest meaningful node connections on the deliberation map.
 *
 * Unlike a naive keyword-match approach, this engine understands:
 *  - Graph topology (shared neighbors = structural affinity)
 *  - Deliberative polarity (opposing stances are high-value connections)
 *  - Political compass proximity (ideological alignment/tension)
 *  - Source provenance (same-domain = same evidence basis)
 *  - Content semantics (TF-IDF–inspired keyword overlap)
 *  - Influence dynamics (high-influence nodes are more connectable)
 *  - Relationship gap analysis (what types of edges are missing?)
 */

import {type Stance} from '../deliberation-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoringNode {
  id: string
  title: string
  content: string | null
  card_type: string
  author_did: string
  source_url: string | null
  stance?: Stance
  compass_quadrant?: string
  influence?: number
  vote_count?: number
  metadata?: string | null
}

export interface ScoringEdge {
  id: string
  source: string
  target: string
  relationship_type: string
}

export interface SuggestedTarget {
  node: ScoringNode
  score: number
  /** Primary human-readable reason for this suggestion */
  reason: string
  /** Secondary detail label */
  reasonDetail: string
  /** Machine-readable reason category for UI styling */
  reasonType:
    | 'dialectical_tension'
    | 'structural_bridge'
    | 'same_source'
    | 'compass_proximity'
    | 'topic_overlap'
    | 'same_type'
    | 'influence_gravity'
}

// ---------------------------------------------------------------------------
// Stopwords — stripped from keyword extraction (Spanish + English)
// ---------------------------------------------------------------------------

const STOPWORDS = new Set([
  // English
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'shall', 'this', 'that',
  'these', 'those', 'it', 'its', 'not', 'no', 'nor', 'so', 'if', 'then',
  'than', 'too', 'very', 'just', 'about', 'up', 'out', 'into', 'over',
  'after', 'before', 'between', 'under', 'above', 'below', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
  'own', 'same', 'as', 'also', 'how', 'what', 'when', 'where', 'who',
  'which', 'why',
  // Spanish
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del',
  'al', 'en', 'con', 'por', 'para', 'se', 'su', 'sus', 'es', 'son',
  'está', 'están', 'ser', 'hay', 'como', 'más', 'pero', 'ya', 'que',
  'qué', 'si', 'no', 'lo', 'le', 'les', 'nos', 'me', 'te', 'mi',
  'tu', 'yo', 'él', 'ella', 'eso', 'esto', 'ese', 'esta', 'este',
  'aquí', 'ahí', 'allí', 'muy', 'bien', 'mal', 'todo', 'todos', 'toda',
  'todas', 'otro', 'otra', 'otros', 'otras', 'uno', 'dos', 'entre',
  'sobre', 'sin', 'hasta', 'desde', 'donde', 'cuando', 'porque',
  'también', 'después', 'antes', 'durante', 'puede', 'debe', 'tiene',
  'han', 'fue', 'era', 'sido',
])

// ---------------------------------------------------------------------------
// 3×3 compass grid coordinates for distance calculation
// ---------------------------------------------------------------------------

const COMPASS_COORDS: Record<string, [number, number]> = {
  'auth-left': [0, 0],
  'auth-center': [1, 0],
  'auth-right': [2, 0],
  'center-left': [0, 1],
  'center': [1, 1],
  'center-right': [2, 1],
  'lib-left': [0, 2],
  'lib-center': [1, 2],
  'lib-right': [2, 2],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract meaningful keywords from a string, filtering stopwords */
function extractKeywords(text: string | null | undefined): Set<string> {
  if (!text) return new Set()
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-záéíóúüñ\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w)),
  )
}

/** Extract domain from a URL, or null */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Chebyshev distance on the compass grid (0-2) */
function compassDistance(a: string | undefined, b: string | undefined): number | null {
  if (!a || !b) return null
  const ca = COMPASS_COORDS[a]
  const cb = COMPASS_COORDS[b]
  if (!ca || !cb) return null
  return Math.max(Math.abs(ca[0] - cb[0]), Math.abs(ca[1] - cb[1]))
}

/** Set intersection size */
function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0
  for (const item of a) {
    if (b.has(item)) count++
  }
  return count
}

/** Jaccard similarity: |A∩B| / |A∪B| */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = intersectionSize(a, b)
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ---------------------------------------------------------------------------
// Graph topology helpers
// ---------------------------------------------------------------------------

/** Build an adjacency set map from edges */
function buildAdjacency(edges: ScoringEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  for (const e of edges) {
    if (!adj.has(e.source)) adj.set(e.source, new Set())
    if (!adj.has(e.target)) adj.set(e.target, new Set())
    adj.get(e.source)!.add(e.target)
    adj.get(e.target)!.add(e.source)
  }
  return adj
}

/** Count how many relationship types already connect to a node */
function existingRelTypes(
  nodeId: string,
  edges: ScoringEdge[],
): Set<string> {
  const types = new Set<string>()
  for (const e of edges) {
    if (e.source === nodeId || e.target === nodeId) {
      types.add(e.relationship_type)
    }
  }
  return types
}

/** Check if two nodes are already directly connected */
function areDirectlyConnected(
  a: string,
  b: string,
  adj: Map<string, Set<string>>,
): boolean {
  return adj.get(a)?.has(b) ?? false
}

// ---------------------------------------------------------------------------
// Main scoring engine
// ---------------------------------------------------------------------------

export function computeSuggestedConnections(
  sourceNode: ScoringNode,
  allNodes: ScoringNode[],
  edges: ScoringEdge[],
  maxResults: number = 3,
): SuggestedTarget[] {
  const adj = buildAdjacency(edges)
  const sourceKeywords = extractKeywords(
    (sourceNode.title || '') + ' ' + (sourceNode.content || ''),
  )
  const sourceDomain = extractDomain(sourceNode.source_url)
  const sourceNeighbors = adj.get(sourceNode.id) ?? new Set<string>()
  const sourceRelTypes = existingRelTypes(sourceNode.id, edges)

  const candidates: SuggestedTarget[] = []

  for (const candidate of allNodes) {
    // Skip self
    if (candidate.id === sourceNode.id) continue

    // ─── Signal scores (each normalized to roughly 0-10 range) ───

    let totalScore = 0
    const signals: Array<{
      score: number
      reason: string
      reasonDetail: string
      reasonType: SuggestedTarget['reasonType']
    }> = []

    // ── 1. DIALECTICAL TENSION (opposing stances → high deliberative value)
    // In a civic deliberation context, connecting claims that oppose each
    // other is the MOST valuable action because it surfaces disagreement.
    if (
      sourceNode.stance &&
      candidate.stance &&
      sourceNode.stance !== 'neutral' &&
      candidate.stance !== 'neutral'
    ) {
      if (sourceNode.stance !== candidate.stance) {
        // Opposing stances: highest-value connection
        const tensionScore = 8
        totalScore += tensionScore
        signals.push({
          score: tensionScore,
          reason: 'Postura opuesta',
          reasonDetail: `${sourceNode.stance} ↔ ${candidate.stance}`,
          reasonType: 'dialectical_tension',
        })
      }
    }

    // ── 2. STRUCTURAL BRIDGE (shared neighbors → potential missing link)
    // If two nodes share neighbors but aren't connected, creating an
    // edge would close a "structural hole" in the argument graph.
    if (!areDirectlyConnected(sourceNode.id, candidate.id, adj)) {
      const candidateNeighbors = adj.get(candidate.id) ?? new Set<string>()
      const sharedNeighborCount = intersectionSize(
        sourceNeighbors,
        candidateNeighbors,
      )
      if (sharedNeighborCount > 0) {
        // Score scales with shared neighbors but diminishes after 3
        const bridgeScore = Math.min(sharedNeighborCount * 2.5, 7)
        totalScore += bridgeScore
        signals.push({
          score: bridgeScore,
          reason: 'Puente estructural',
          reasonDetail: `${sharedNeighborCount} vecino${sharedNeighborCount > 1 ? 's' : ''} en común`,
          reasonType: 'structural_bridge',
        })
      }
    } else {
      // Already connected — this candidate is much less interesting
      totalScore -= 15
    }

    // ── 3. SOURCE PROVENANCE (same domain → same evidence basis)
    const candidateDomain = extractDomain(candidate.source_url)
    if (sourceDomain && candidateDomain && sourceDomain === candidateDomain) {
      const sourceScore = 5
      totalScore += sourceScore
      signals.push({
        score: sourceScore,
        reason: 'Misma fuente',
        reasonDetail: sourceDomain,
        reasonType: 'same_source',
      })
    }

    // ── 4. POLITICAL COMPASS PROXIMITY/TENSION
    const cDist = compassDistance(
      sourceNode.compass_quadrant,
      candidate.compass_quadrant,
    )
    if (cDist !== null) {
      if (cDist === 0) {
        // Same quadrant → moderate affinity
        totalScore += 3
        signals.push({
          score: 3,
          reason: 'Mismo cuadrante',
          reasonDetail: candidate.compass_quadrant || '',
          reasonType: 'compass_proximity',
        })
      } else if (cDist === 2) {
        // Diametrically opposed → high deliberative value (like dialectical tension)
        totalScore += 4
        signals.push({
          score: 4,
          reason: 'Cuadrante opuesto',
          reasonDetail: `${sourceNode.compass_quadrant} ↔ ${candidate.compass_quadrant}`,
          reasonType: 'compass_proximity',
        })
      } else {
        // Adjacent quadrant → mild affinity
        totalScore += 1
        signals.push({
          score: 1,
          reason: 'Cuadrante adyacente',
          reasonDetail: candidate.compass_quadrant || '',
          reasonType: 'compass_proximity',
        })
      }
    }

    // ── 5. SEMANTIC OVERLAP (TF-IDF–inspired keyword similarity)
    const candidateKeywords = extractKeywords(
      (candidate.title || '') + ' ' + (candidate.content || ''),
    )
    const jaccard = jaccardSimilarity(sourceKeywords, candidateKeywords)
    if (jaccard > 0) {
      // Scale Jaccard (0..1) into a 0..6 score range
      const semanticScore = Math.min(jaccard * 12, 6)
      if (semanticScore >= 0.5) {
        totalScore += semanticScore
        const sharedCount = intersectionSize(sourceKeywords, candidateKeywords)
        signals.push({
          score: semanticScore,
          reason: 'Tema similar',
          reasonDetail: `${sharedCount} término${sharedCount > 1 ? 's' : ''} compartido${sharedCount > 1 ? 's' : ''}`,
          reasonType: 'topic_overlap',
        })
      }
    }

    // ── 6. CARD TYPE COMPLEMENTARITY
    // Same type = mild boost. But complementary pairs are stronger:
    //   claim ↔ research (evidence for claims)
    //   question ↔ article (answers to questions)
    const COMPLEMENTARY_PAIRS: Record<string, string[]> = {
      claim: ['research', 'article', 'link'],
      question: ['article', 'research', 'claim', 'explainer'],
      research: ['claim', 'question'],
      article: ['question', 'claim'],
      event: ['article', 'social', 'claim'],
      video: ['article', 'claim'],
      audio: ['article', 'claim'],
      social: ['claim', 'article'],
    }

    if (sourceNode.card_type === candidate.card_type) {
      totalScore += 2
      signals.push({
        score: 2,
        reason: 'Mismo tipo',
        reasonDetail: candidate.card_type,
        reasonType: 'same_type',
      })
    } else if (
      COMPLEMENTARY_PAIRS[sourceNode.card_type]?.includes(candidate.card_type)
    ) {
      totalScore += 3
      signals.push({
        score: 3,
        reason: 'Tipo complementario',
        reasonDetail: `${sourceNode.card_type} ↔ ${candidate.card_type}`,
        reasonType: 'same_type',
      })
    }

    // ── 7. INFLUENCE GRAVITY
    // High-influence nodes attract connections — they're the discourse hubs.
    // This provides a gentle nudge toward connecting to important nodes.
    const candidateInfluence = Math.abs(candidate.influence ?? 0)
    if (candidateInfluence >= 3) {
      const gravityScore = Math.min(candidateInfluence * 0.3, 3)
      totalScore += gravityScore
      signals.push({
        score: gravityScore,
        reason: 'Alta influencia',
        reasonDetail: `${candidate.influence! > 0 ? '+' : ''}${candidate.influence}`,
        reasonType: 'influence_gravity',
      })
    }

    // ── 8. RELATIONSHIP GAP BONUS
    // If this candidate's card_type hasn't been connected to the source yet
    // via any relationship, the connection would add diversity to the graph.
    if (!sourceRelTypes.has(candidate.card_type)) {
      totalScore += 1
    }

    // ── FILTER: Only include if score is meaningfully positive
    if (totalScore <= 0 || signals.length === 0) continue

    // Pick the highest-scoring signal as the display reason
    const bestSignal = signals.reduce((a, b) => (a.score >= b.score ? a : b))

    candidates.push({
      node: candidate,
      score: totalScore,
      reason: bestSignal.reason,
      reasonDetail: bestSignal.reasonDetail,
      reasonType: bestSignal.reasonType,
    })
  }

  // Sort by score descending, then alphabetically by title for stability
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.node.title.localeCompare(b.node.title)
  })

  return candidates.slice(0, maxResults)
}
