export type Stance = 'pro' | 'con' | 'neutral'

export interface GraphNode {
  id: string
  title: string
  card_type: string
  author_did: string
  community_uri: string
  influence?: number
  vote_count?: number
  stance?: Stance
  compass_quadrant?: string
  /** Optional — carried for suggestion scoring, not used by graph rendering */
  content?: string | null
  /** Optional — carried for suggestion scoring */
  source_url?: string | null
  /** Optional — carried for suggestion scoring */
  metadata?: string | null
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  relationship_type: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}
