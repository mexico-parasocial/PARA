import {type CabildeoKind} from '#/lib/api/para-lexicons'

/**
 * What each kind of cabildeo needs when it is created. Persuasion needs a
 * policy to be about and has no creation flow yet, so it is not offered.
 */
export const CREATABLE_KINDS: readonly CabildeoKind[] = ['activity', 'forum']

/** An activity is decided by voting on its options; a forum has none. */
export function kindNeedsOptions(kind: CabildeoKind): boolean {
  return kind === 'activity'
}

/** A forum is a conversation for a place, so it must name one. */
export function kindNeedsPlace(kind: CabildeoKind): boolean {
  return kind === 'forum'
}

export type KindProblem = 'options' | 'place' | null

/**
 * The first thing missing from a draft of this kind, or null. `filledOptions`
 * counts options that have a label.
 */
export function kindProblem(
  kind: CabildeoKind,
  draft: {filledOptions: number; hasPlace: boolean},
): KindProblem {
  if (kindNeedsOptions(kind) && draft.filledOptions < 2) return 'options'
  if (kindNeedsPlace(kind) && !draft.hasPlace) return 'place'
  return null
}
