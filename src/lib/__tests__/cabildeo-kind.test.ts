import {
  CREATABLE_KINDS,
  kindNeedsOptions,
  kindNeedsPlace,
  kindProblem,
} from '../cabildeo-kind'

describe('cabildeo kinds', () => {
  it('offers activity and forum, not persuasion', () => {
    expect(CREATABLE_KINDS).toEqual(['activity', 'forum'])
  })

  it('needs options only for an activity and a place only for a forum', () => {
    expect(kindNeedsOptions('activity')).toBe(true)
    expect(kindNeedsOptions('forum')).toBe(false)
    expect(kindNeedsPlace('forum')).toBe(true)
    expect(kindNeedsPlace('activity')).toBe(false)
  })

  it('asks an activity for two options', () => {
    expect(kindProblem('activity', {filledOptions: 1, hasPlace: false})).toBe(
      'options',
    )
    expect(kindProblem('activity', {filledOptions: 2, hasPlace: false})).toBe(
      null,
    )
  })

  it('asks a forum for a place and never for options', () => {
    expect(kindProblem('forum', {filledOptions: 0, hasPlace: false})).toBe(
      'place',
    )
    expect(kindProblem('forum', {filledOptions: 0, hasPlace: true})).toBe(null)
  })
})
