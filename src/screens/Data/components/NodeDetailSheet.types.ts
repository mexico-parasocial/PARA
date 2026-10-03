import {type GraphEdge, type GraphNode} from '#/features/civicTree/types'

export interface NodeDetail {
  id: string
  title: string
  content: string | null
  card_type: string
  author_did: string
  source_url: string | null
  metadata?: string | null
  influence?: number
}

export interface NodeDetailSheetProps {
  node: NodeDetail | null
  availableNodes?: GraphNode[]
  availableEdges?: GraphEdge[]
  visible: boolean
  onClose: () => void
  onSelectNode?: (id: string) => void
  voterDid?: string
  userVote?: number
  onVote?: (cardId: string, influence: number) => void
  isVoting?: boolean
  voteError?: string | null
  onCreateRelationship?: (
    sourceCardId: string,
    targetCardId: string,
    relationshipType: string,
  ) => void
  isCreatingRelationship?: boolean
  relationshipError?: string | null
}
