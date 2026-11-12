import {type CabildeoKind} from '#/lib/api/para-lexicons'

/** Mirrors the lexicon: 1500 graphemes of text and ten cited positions. */
export const MAX_TEXT = 1500
export const MAX_CITED = 10

/**
 * Only a forum or persuasion cabildeo can have a conclusion. An activity ends
 * in a vote, and a draft has not started. A cabildeo whose kind the AppView
 * did not send is treated as an activity, as the record format says.
 */
export function canHaveConclusion(
  kind: CabildeoKind | undefined,
  phase: string,
): boolean {
  return (kind === 'forum' || kind === 'persuasion') && phase !== 'draft'
}
