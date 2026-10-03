import {
  PERSONAL_RELATION_DIRECTED,
  PERSONAL_RELATION_LABELS,
} from '#/features/civicTree/colors'
import {CivicTreeCards} from '#/features/civicTree/components/CivicTreeCards'
import {type PersonalTreeGraph} from '../graph'

export function PersonalCivicTreeCards({
  graph,
  activeGroups,
  onOpenDetails,
}: {
  graph: PersonalTreeGraph
  activeGroups: Set<string>
  onOpenDetails: (id: string) => void
}) {
  const groups = graph.groups
    .filter(group => !activeGroups.size || activeGroups.has(group.id))
    .map(group => ({
      id: group.id,
      title: group.name,
      color: group.color,
      cards: graph.nodes
        .filter(node => node.group === group.id)
        .map(node => ({
          id: node.id,
          title: node.title,
          type: node.metadata.kind,
          color: node.color,
          summary: node.metadata.item.description || node.metadata.item.note,
        })),
    }))
  return (
    <CivicTreeCards
      groups={groups}
      links={graph.edges.map(edge => ({
        ...edge,
        directed: PERSONAL_RELATION_DIRECTED[edge.kind] ?? false,
        label: PERSONAL_RELATION_LABELS[edge.kind] ?? edge.kind,
      }))}
      onOpenDetails={onOpenDetails}
    />
  )
}
