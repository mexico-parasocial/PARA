/*
 * Structural input rather than a concrete graph type: the community screen has
 * two shapes for the same graph (the query's CommunityCivicTreeCard and the
 * renderer's GraphNode) and this module needs the same five fields from both.
 */
export type TopicGraphNode = {
  id: string
  title: string
  card_type: string
  author_did: string
}

/*
 * Both edge shapes are live in this codebase: the query returns
 * `source_card_id`/`target_card_id` straight from the appview, and the renderer
 * maps them to `source`/`target`. Accept either rather than forcing every caller
 * to map first.
 */
export type TopicGraphEdge =
  | {source: string; target: string}
  | {source_card_id: string; target_card_id: string}

function edgeEnds(edge: TopicGraphEdge): [string, string] {
  return 'source' in edge
    ? [edge.source, edge.target]
    : [edge.source_card_id, edge.target_card_id]
}

export type TopicGraphData = {
  nodes: readonly TopicGraphNode[]
  edges: readonly TopicGraphEdge[]
}

/*
 * Topic convergence for a community civic tree.
 *
 * The personal tree asks "what do I think this is about". The community tree
 * asks a different question, and it is the collaborative one: *is anyone else
 * working on this*. A vote count cannot answer that - twenty votes from one
 * person's followers is not collaboration. Distinct contributors can.
 *
 * So a topic here is ranked by how many different members have attached
 * something to it, not by how much is attached. A topic three people have each
 * added one card to is a shared concern; a topic one person has added ten cards
 * to is a monologue, and should not outrank it.
 */

export type TopicCluster = {
  topic: TopicGraphNode
  /** Cards attached to this topic by any edge, in either direction. */
  attached: TopicGraphNode[]
  /** Distinct members who authored the topic or anything attached to it. */
  contributorDids: string[]
  contributorCount: number
  /** True when only the topic's own author has touched it. */
  isMonologue: boolean
  /**
   * Present when the topic came from PARA's shared flair vocabulary. The same
   * id keys the same topic in every member's personal tree, which is what makes
   * the two trees comparable.
   */
  flairId?: string
}

/** Reads `flair:<id>` out of a node id, if the topic is flair-backed. */
export function flairIdOf(node: TopicGraphNode): string | undefined {
  const match = /(?:^|::)flair:([A-Za-z0-9_-]+)$/.exec(node.id)
  return match?.[1]
}

export function buildTopicClusters(data: TopicGraphData): TopicCluster[] {
  const topics = data.nodes.filter(n => n.card_type === 'topic')
  if (topics.length === 0) return []

  const byId = new Map(data.nodes.map(n => [n.id, n]))

  /* Adjacency in both directions - a topic is a hub, not a source or target. */
  const neighbours = new Map<string, Set<string>>()
  for (const edge of data.edges) {
    const [source, target] = edgeEnds(edge)
    if (!byId.has(source) || !byId.has(target)) continue
    if (!neighbours.has(source)) neighbours.set(source, new Set())
    if (!neighbours.has(target)) neighbours.set(target, new Set())
    neighbours.get(source)!.add(target)
    neighbours.get(target)!.add(source)
  }

  const clusters = topics.map(topic => {
    const attached = Array.from(neighbours.get(topic.id) ?? [])
      .map(id => byId.get(id))
      .filter((n): n is TopicGraphNode => n !== undefined)

    const dids = new Set<string>()
    if (topic.author_did) dids.add(topic.author_did)
    for (const node of attached) {
      if (node.author_did) dids.add(node.author_did)
    }

    const contributorDids = Array.from(dids)

    return {
      topic,
      attached,
      contributorDids,
      contributorCount: contributorDids.length,
      isMonologue: contributorDids.length <= 1,
      flairId: flairIdOf(topic),
    }
  })

  /*
   * Contributors first, then volume as a tiebreak, then title for a stable
   * order so the list does not shuffle between renders on equal counts.
   */
  return clusters.sort((a, b) => {
    if (b.contributorCount !== a.contributorCount) {
      return b.contributorCount - a.contributorCount
    }
    if (b.attached.length !== a.attached.length) {
      return b.attached.length - a.attached.length
    }
    return a.topic.title.localeCompare(b.topic.title)
  })
}

/** Cards that belong to no topic - the community's unsorted pile. */
export function untopicedNodes(data: TopicGraphData): TopicGraphNode[] {
  const topicIds = new Set(
    data.nodes.filter(n => n.card_type === 'topic').map(n => n.id),
  )
  if (topicIds.size === 0) return []

  const touchesTopic = new Set<string>()
  for (const edge of data.edges) {
    const [source, target] = edgeEnds(edge)
    if (topicIds.has(source)) touchesTopic.add(target)
    if (topicIds.has(target)) touchesTopic.add(source)
  }

  return data.nodes.filter(n => !topicIds.has(n.id) && !touchesTopic.has(n.id))
}
