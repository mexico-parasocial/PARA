import {useLingui} from '@lingui/react/macro'

import {COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES} from '#/state/queries/community-civic-tree'
import {CARD_TYPE_COLORS} from '#/features/civicTree/colors'
import {CivicTreeCards} from '#/features/civicTree/components/CivicTreeCards'
import {type GraphData} from '#/features/civicTree/types'
import {buildCommunityCollections, communityEdgeColor} from '../workspace'

export function CommunityCivicTreeCards({
  data,
  context,
  onOpenDetails,
}: {
  data: GraphData
  context: GraphData
  onOpenDetails: (id: string) => void
}) {
  const {i18n} = useLingui()
  const groups = buildCommunityCollections(
    data,
    i18n._.bind(i18n),
    context,
  ).map(group => ({
    id: group.id,
    title: group.title,
    color: group.color,
    cards: group.nodes.map(node => ({
      id: node.id,
      title: node.title,
      type: node.card_type,
      color: CARD_TYPE_COLORS[node.card_type] ?? CARD_TYPE_COLORS.article,
      summary: node.content,
    })),
  }))
  const links = data.edges.map(edge => ({
    ...edge,
    color: communityEdgeColor(edge.relationship_type),
    label:
      COMMUNITY_CIVIC_TREE_RELATIONSHIP_TYPES.find(
        type => type.value === edge.relationship_type,
      )?.label ?? edge.relationship_type,
  }))
  return (
    <CivicTreeCards
      groups={groups}
      links={links}
      onOpenDetails={onOpenDetails}
    />
  )
}
