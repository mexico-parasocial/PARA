import {getMatterTag, humanizeFlairTag} from '#/lib/policy-display'
import {FLAIR_GROUPS} from '#/lib/tags'

const UNOFFICIAL_COLOR = '#6B7280'

export type MatterRef = {
  /** The flair as written on posts, which is what the AppView matches. */
  tag: string
  /** Case-insensitive identity: `|#NiUnaMenos` and `|#niunamenos` are one matter. */
  key: string
  label: string
  color: string
  /** Matters in the flair catalog are official; the rest were made by people. */
  official: boolean
  groupKey?: string
}

export type MatterGroup = {
  /** The composer's own key, e.g. `1. SERVICIOS PÚBLICOS`. */
  key: string
  number: string
  title: string
  matters: MatterRef[]
}

export const matterKey = (tag: string) => tag.toLowerCase()

/** `1. SERVICIOS PÚBLICOS` → `{number: '1.', title: 'Servicios Públicos'}`. */
function splitGroupKey(key: string) {
  const match = key.match(/^(\d+\.)\s+(.+)$/)
  const text = match ? match[2] : key
  return {
    number: match ? match[1] : '',
    title: text
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
  }
}

/** The six parts the composer splits official matters into. */
export const MATTER_GROUPS: MatterGroup[] = Object.entries(
  FLAIR_GROUPS.MATTER,
).map(([key, flairs]) => ({
  key,
  ...splitGroupKey(key),
  matters: flairs.map(flair => ({
    tag: flair.tag,
    key: matterKey(flair.tag),
    label: flair.label,
    color: flair.color,
    official: true,
    groupKey: key,
  })),
}))

const CATALOG = new Map(
  MATTER_GROUPS.flatMap(group => group.matters.map(m => [m.key, m] as const)),
)

/** Looks a flair up in the catalog, or describes it as unofficial. */
export function resolveMatter(tag: string): MatterRef {
  return (
    CATALOG.get(matterKey(tag)) ?? {
      tag,
      key: matterKey(tag),
      label: humanizeFlairTag(tag),
      color: UNOFFICIAL_COLOR,
      official: false,
    }
  )
}

export type MatterCount = {matter: MatterRef; count: number}

/** How many of the given flair lists each matter appears in. */
export function countMatters(flairLists: Array<string[] | undefined>) {
  const counts = new Map<string, MatterCount>()
  for (const flairs of flairLists) {
    const tag = getMatterTag(flairs)
    if (!tag) continue
    const matter = resolveMatter(tag)
    const entry = counts.get(matter.key)
    if (entry) entry.count += 1
    else counts.set(matter.key, {matter, count: 1})
  }
  return counts
}

/** Whether an item's matter is among the selected ones; no selection matches all. */
export function matchesMatters(
  flairs: string[] | undefined,
  selected: string[],
) {
  if (selected.length === 0) return true
  const tag = getMatterTag(flairs)
  if (!tag) return false
  return selected.some(item => matterKey(item) === matterKey(tag))
}

/** Every matter in the catalog: what "official" means. */
export const OFFICIAL_TAGS = MATTER_GROUPS.flatMap(group =>
  group.matters.map(matter => matter.tag),
)

/** The flairs of the chosen groups, or every official one when none is chosen. */
export function tagsForGroups(groupKeys: string[], officialOnly = false) {
  if (groupKeys.length > 0) {
    return MATTER_GROUPS.filter(group => groupKeys.includes(group.key)).flatMap(
      group => group.matters.map(matter => matter.tag),
    )
  }
  return officialOnly ? OFFICIAL_TAGS : []
}

/** How many items sit under each group, from the per-matter counts. */
export function countByGroup(counts: Map<string, MatterCount>) {
  const byGroup = new Map<string, number>()
  for (const {matter, count} of counts.values()) {
    if (!matter.groupKey) continue
    byGroup.set(matter.groupKey, (byGroup.get(matter.groupKey) ?? 0) + count)
  }
  return byGroup
}
