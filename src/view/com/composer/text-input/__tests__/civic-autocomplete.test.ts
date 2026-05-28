import {getOpenQuestionSearchQuery, POST_FLAIRS, POST_TYPES} from '#/lib/tags'
import {
  applyCivicAutocompleteItem,
  getCivicAutocompleteItems,
  getComposerAutocompleteContext,
  isOpenQuestionTextCompatible,
  syncComposerSpecialPostTypeText,
} from '../civic-autocomplete'

describe('civic autocomplete', () => {
  it('detects hashtag and command contexts', () => {
    expect(getComposerAutocompleteContext('Need #transp', 12)).toEqual({
      type: 'hashtag',
      query: 'transp',
      start: 5,
      end: 12,
      raw: '#transp',
    })
    expect(getComposerAutocompleteContext('/open-q', 7)).toEqual({
      type: 'command',
      query: 'open-q',
      start: 0,
      end: 7,
      raw: '/open-q',
    })
  })

  it('finds civic flair suggestions from local registries', () => {
    const context = getComposerAutocompleteContext('#transporte', 11)
    expect(context?.type).toBe('hashtag')
    const items = getCivicAutocompleteItems(
      context as Extract<typeof context, {type: 'hashtag'}>,
    )

    expect(
      items.some(
        item =>
          item.type === 'policyFlair' &&
          item.key === POST_FLAIRS.transporte_publico_pol.id,
      ),
    ).toBe(true)
    expect(
      items.some(
        item =>
          item.type === 'matterFlair' &&
          item.key === POST_FLAIRS.transporte_publico_matter.id,
      ),
    ).toBe(true)
  })

  it('replaces only the active policy flair and preserves matter flair', () => {
    const context = getComposerAutocompleteContext('Texto #limite', 13)
    const item = getCivicAutocompleteItems(
      context as Extract<typeof context, {type: 'hashtag'}>,
    ).find(candidate => candidate.key === POST_FLAIRS.limite_mandatos.id)

    const result = applyCivicAutocompleteItem({
      item: item!,
      text: 'Texto #limite',
      context: context as Extract<typeof context, {type: 'hashtag'}>,
      selectedFlairs: [
        POST_FLAIRS.transporte_publico_pol,
        POST_FLAIRS.transporte_publico_matter,
      ],
      postType: null,
    })

    expect(result.nextSelectedFlairs).toEqual([
      POST_FLAIRS.limite_mandatos,
      POST_FLAIRS.transporte_publico_matter,
    ])
    expect(result.nextText).toBe('Texto ')
  })

  it('replaces only the active matter flair and preserves policy flair', () => {
    const context = getComposerAutocompleteContext('Texto #sanidad', 14)
    const item = getCivicAutocompleteItems(
      context as Extract<typeof context, {type: 'hashtag'}>,
    ).find(candidate => candidate.key === POST_FLAIRS.sanidad.id)

    const result = applyCivicAutocompleteItem({
      item: item!,
      text: 'Texto #sanidad',
      context: context as Extract<typeof context, {type: 'hashtag'}>,
      selectedFlairs: [
        POST_FLAIRS.transporte_publico_pol,
        POST_FLAIRS.transporte_publico_matter,
      ],
      postType: null,
    })

    expect(result.nextSelectedFlairs).toEqual([
      POST_FLAIRS.transporte_publico_pol,
      POST_FLAIRS.sanidad,
    ])
  })

  it('applies the RAQ command exactly once', () => {
    const context = getComposerAutocompleteContext('Pregunta /raq', 13)
    const item = getCivicAutocompleteItems(
      context as Extract<typeof context, {type: 'command'}>,
    ).find(
      candidate =>
        candidate.type === 'composerCommand' && candidate.command === 'raq',
    )

    const once = applyCivicAutocompleteItem({
      item: item!,
      text: 'Pregunta /raq',
      context: context as Extract<typeof context, {type: 'command'}>,
      selectedFlairs: [],
      postType: null,
    })
    const twice = syncComposerSpecialPostTypeText(once.nextText, POST_TYPES.RAQ)

    expect(once.nextPostType).toBe(POST_TYPES.RAQ)
    expect(once.nextText).toBe(`Pregunta ${POST_TYPES.RAQ.tag}`)
    expect(twice).toBe(`Pregunta ${POST_TYPES.RAQ.tag}`)
  })

  it('applies the open-question command exactly once and stays query-compatible', () => {
    const context = getComposerAutocompleteContext(
      'Pregunta /open-question',
      23,
    )
    const item = getCivicAutocompleteItems(
      context as Extract<typeof context, {type: 'command'}>,
    ).find(
      candidate =>
        candidate.type === 'composerCommand' &&
        candidate.command === 'open-question',
    )

    const result = applyCivicAutocompleteItem({
      item: item!,
      text: 'Pregunta /open-question',
      context: context as Extract<typeof context, {type: 'command'}>,
      selectedFlairs: [],
      postType: null,
    })

    expect(result.nextPostType).toBe(POST_TYPES.OPEN_QUESTION)
    expect(result.nextText).toBe(`Pregunta ${POST_TYPES.OPEN_QUESTION.tag}`)
    expect(isOpenQuestionTextCompatible(result.nextText)).toBe(true)
    expect(getOpenQuestionSearchQuery()).toBe(POST_TYPES.OPEN_QUESTION.tag)
  })

  it('removes special tags when switching away from special post types', () => {
    expect(
      syncComposerSpecialPostTypeText(
        `Hola ${POST_TYPES.RAQ.tag} ${POST_TYPES.OPEN_QUESTION.tag}`,
        null,
      ),
    ).toBe('Hola')
  })
})
