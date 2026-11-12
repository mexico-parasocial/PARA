import {canHaveConclusion} from '../conclusion'

describe('canHaveConclusion', () => {
  it('allows forum and persuasion once they have left draft', () => {
    for (const kind of ['forum', 'persuasion'] as const) {
      expect(canHaveConclusion(kind, 'open')).toBe(true)
      expect(canHaveConclusion(kind, 'resolved')).toBe(true)
      expect(canHaveConclusion(kind, 'draft')).toBe(false)
    }
  })

  it('never allows an activity, which ends in a vote', () => {
    expect(canHaveConclusion('activity', 'resolved')).toBe(false)
  })

  it('treats a cabildeo of unknown kind as an activity', () => {
    expect(canHaveConclusion(undefined, 'open')).toBe(false)
  })
})
