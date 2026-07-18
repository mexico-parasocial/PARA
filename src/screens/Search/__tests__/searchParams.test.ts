import {describe, expect, it} from '@jest/globals'

import {
  countActiveFilters,
  definedFilterParams,
  filtersToApiParams,
  hasPostOnlyFilters,
  paraFiltersToSearchFilters,
  parseHistoryEntry,
  readSearchFilters,
  searchFiltersToParaFilters,
  serializeHistoryEntry,
  withoutFilterParams,
} from '#/screens/Search/searchParams'

describe(`searchParams`, () => {
  describe(`readSearchFilters`, () => {
    it(`reads present string filters`, () => {
      expect(
        readSearchFilters({q: 'cats', author: 'alice', domain: 'bsky.app'}),
      ).toEqual({author: 'alice', domain: 'bsky.app'})
    })

    it(`ignores the literal string "undefined"`, () => {
      expect(
        readSearchFilters({
          q: 'cats',
          author: 'alice',
          mentions: 'undefined',
          domain: 'undefined',
        }),
      ).toEqual({author: 'alice'})
    })

    it(`ignores empty and non-string values`, () => {
      expect(readSearchFilters({author: '', tag: undefined})).toEqual({})
    })

    it(`reads PARA geographic filters`, () => {
      expect(
        readSearchFilters({
          state: 'Jalisco',
          districtKey: 'guadalajara-1',
          cabildeoPhase: 'voting',
        }),
      ).toEqual({
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      })
    })

    it(`reads all PARA filter keys`, () => {
      expect(
        readSearchFilters({
          postType: 'policy',
          flairs: '||#ChequesEscolares,||#SalarioMinimo',
          party: 'Morena',
          verifiedPublicFigure: 'true',
          communityUris: 'at://did:plc:alice/com.para.community/1',
          cabildeoUris: 'at://did:plc:alice/com.para.cabildeo/1',
          politicalCompassPositions: 'auth-left,lib-left',
        }),
      ).toEqual({
        postType: 'policy',
        flairs: '||#ChequesEscolares,||#SalarioMinimo',
        party: 'Morena',
        verifiedPublicFigure: 'true',
        communityUris: 'at://did:plc:alice/com.para.community/1',
        cabildeoUris: 'at://did:plc:alice/com.para.cabildeo/1',
        politicalCompassPositions: 'auth-left,lib-left',
      })
    })
  })

  describe(`hasPostOnlyFilters`, () => {
    it(`returns false for a lang-only filter (people/feeds tabs stay)`, () => {
      expect(hasPostOnlyFilters({lang: 'en'})).toBe(false)
    })

    it(`returns false for no filters`, () => {
      expect(hasPostOnlyFilters({})).toBe(false)
    })

    it(`returns true for a post-restricting filter`, () => {
      expect(hasPostOnlyFilters({author: 'alice'})).toBe(true)
      expect(hasPostOnlyFilters({media: 'true'})).toBe(true)
      expect(hasPostOnlyFilters({excludeTag: 'spam'})).toBe(true)
    })

    it(`returns true when lang is combined with a post-only filter`, () => {
      expect(hasPostOnlyFilters({lang: 'en', author: 'alice'})).toBe(true)
    })

    it(`returns true for PARA geographic and cabildeo filters`, () => {
      expect(hasPostOnlyFilters({state: 'Jalisco'})).toBe(true)
      expect(hasPostOnlyFilters({districtKey: 'guadalajara-1'})).toBe(true)
      expect(hasPostOnlyFilters({cabildeoPhase: 'voting'})).toBe(true)
    })
  })

  describe(`countActiveFilters`, () => {
    it(`counts each set key once`, () => {
      expect(
        countActiveFilters({
          author: 'alice bob',
          lang: 'en',
          media: 'true',
        }),
      ).toBe(3)
    })

    it(`returns 0 for empty filters`, () => {
      expect(countActiveFilters({})).toBe(0)
    })

    it(`counts PARA filters`, () => {
      expect(
        countActiveFilters({
          state: 'Jalisco',
          districtKey: 'guadalajara-1',
          cabildeoPhase: 'voting',
        }),
      ).toBe(3)
    })

    it(`counts all PARA filter keys`, () => {
      expect(
        countActiveFilters({
          postType: 'policy',
          flairs: '||#ChequesEscolares',
          party: 'Morena',
          verifiedPublicFigure: 'true',
          communityUris: 'at://did:plc:alice/com.para.community/1',
          cabildeoUris: 'at://did:plc:alice/com.para.cabildeo/1',
          politicalCompassPositions: 'auth-left',
        }),
      ).toBe(7)
    })
  })

  describe(`serializeHistoryEntry / parseHistoryEntry`, () => {
    it(`serializes term-only searches as plain strings`, () => {
      expect(serializeHistoryEntry('cats', {})).toBe('cats')
    })

    it(`serializes filtered searches as JSON`, () => {
      const entry = serializeHistoryEntry('cats', {author: 'alice'})
      expect(JSON.parse(entry)).toEqual({
        q: 'cats',
        filters: {author: 'alice'},
      })
    })

    it(`round-trips a filtered entry`, () => {
      const filters = {author: 'alice', lang: 'en'}
      const entry = serializeHistoryEntry('cats', filters)
      expect(parseHistoryEntry(entry)).toEqual({q: 'cats', filters})
    })

    it(`round-trips PARA filters in history`, () => {
      const filters = {
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      }
      const entry = serializeHistoryEntry('cats', filters)
      expect(parseHistoryEntry(entry)).toEqual({q: 'cats', filters})
    })

    it(`treats legacy plain strings as term-only`, () => {
      expect(parseHistoryEntry('cats')).toEqual({q: 'cats', filters: {}})
    })

    it(`treats malformed JSON as a plain query`, () => {
      expect(parseHistoryEntry('{not json')).toEqual({
        q: '{not json',
        filters: {},
      })
    })
  })

  describe(`definedFilterParams`, () => {
    it(`only includes set filters`, () => {
      expect(
        definedFilterParams({author: 'alice', lang: 'en', domain: ''}),
      ).toEqual({author: 'alice', lang: 'en'})
    })

    it(`includes PARA filters when set`, () => {
      expect(
        definedFilterParams({
          state: 'Jalisco',
          districtKey: 'guadalajara-1',
          cabildeoPhase: 'voting',
        }),
      ).toEqual({
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      })
    })
  })

  describe(`withoutFilterParams`, () => {
    it(`strips filter keys and preserves q/tab`, () => {
      expect(
        withoutFilterParams({
          q: 'cats',
          tab: 'latest',
          author: 'alice',
          lang: 'en',
        }),
      ).toEqual({q: 'cats', tab: 'latest'})
    })

    it(`strips PARA filter keys`, () => {
      expect(
        withoutFilterParams({
          q: 'cats',
          state: 'Jalisco',
          districtKey: 'guadalajara-1',
          cabildeoPhase: 'voting',
        }),
      ).toEqual({q: 'cats'})
    })

    it(`strips all PARA filter keys`, () => {
      expect(
        withoutFilterParams({
          q: 'cats',
          postType: 'policy',
          flairs: '||#ChequesEscolares',
          party: 'Morena',
          verifiedPublicFigure: 'true',
          communityUris: 'at://did:plc:alice/com.para.community/1',
          cabildeoUris: 'at://did:plc:alice/com.para.cabildeo/1',
          politicalCompassPositions: 'auth-left',
        }),
      ).toEqual({q: 'cats'})
    })
  })

  describe(`filtersToApiParams`, () => {
    it(`splits multi-value keys into arrays`, () => {
      expect(
        filtersToApiParams({
          author: 'alice bob',
          tag: 'cats dogs',
        }),
      ).toEqual({
        authors: ['alice', 'bob'],
        hashtags: ['cats', 'dogs'],
      })
    })

    it(`maps exclude filters`, () => {
      expect(
        filtersToApiParams({
          excludeAuthor: 'alice',
          excludeTag: 'spam',
        }),
      ).toEqual({
        excludeAuthors: ['alice'],
        excludeHashtags: ['spam'],
      })
    })

    it(`passes scalar filters through`, () => {
      expect(
        filtersToApiParams({
          lang: 'en',
          since: '2024-01-01',
          until: '2024-12-31',
        }),
      ).toEqual({
        language: 'en',
        since: '2024-01-01',
        until: '2024-12-31',
      })
    })

    it(`converts boolean flags`, () => {
      expect(
        filtersToApiParams({
          media: 'true',
          video: 'true',
          following: 'true',
          replies: 'none',
        }),
      ).toEqual({
        hasMedia: true,
        hasVideo: true,
        following: true,
        excludeReplies: true,
      })
    })

    it(`converts replies: 'only'`, () => {
      expect(filtersToApiParams({replies: 'only'})).toEqual({
        repliesOnly: true,
      })
    })
  })

  describe(`searchFiltersToParaFilters`, () => {
    it(`splits list fields correctly`, () => {
      expect(
        searchFiltersToParaFilters({
          tag: 'cats dogs',
          flairs: '||#ChequesEscolares,||#SalarioMinimo',
          communityUris:
            'at://did:plc:alice/com.para.community/1,at://did:plc:bob/com.para.community/2',
          cabildeoUris:
            'at://did:plc:alice/com.para.cabildeo/1,at://did:plc:bob/com.para.cabildeo/2',
          politicalCompassPositions: 'auth-left,lib-left',
        }),
      ).toEqual({
        tag: ['cats', 'dogs'],
        flairs: ['||#ChequesEscolares', '||#SalarioMinimo'],
        communityUris: [
          'at://did:plc:alice/com.para.community/1',
          'at://did:plc:bob/com.para.community/2',
        ],
        cabildeoUris: [
          'at://did:plc:alice/com.para.cabildeo/1',
          'at://did:plc:bob/com.para.cabildeo/2',
        ],
        politicalCompassPositions: ['auth-left', 'lib-left'],
      })
    })

    it(`converts scalar PARA filters`, () => {
      expect(
        searchFiltersToParaFilters({
          postType: 'policy',
          party: 'Morena',
          verifiedPublicFigure: 'true',
          state: 'Jalisco',
          districtKey: 'guadalajara-1',
          cabildeoPhase: 'voting',
        }),
      ).toEqual({
        postType: 'policy',
        party: 'Morena',
        verifiedPublicFigure: true,
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      })
    })

    it(`ignores verifiedPublicFigure when not 'true'`, () => {
      expect(
        searchFiltersToParaFilters({verifiedPublicFigure: 'false'}),
      ).toEqual({})
    })
  })

  describe(`paraFiltersToSearchFilters`, () => {
    it(`round-trips structured PARA filters`, () => {
      const para = {
        tag: ['cats', 'dogs'],
        flairs: ['||#ChequesEscolares', '||#SalarioMinimo'],
        communityUris: [
          'at://did:plc:alice/com.para.community/1',
          'at://did:plc:bob/com.para.community/2',
        ],
        cabildeoUris: [
          'at://did:plc:alice/com.para.cabildeo/1',
          'at://did:plc:bob/com.para.cabildeo/2',
        ],
        politicalCompassPositions: ['auth-left', 'lib-left'],
        postType: 'policy',
        party: 'Morena',
        verifiedPublicFigure: true,
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      }
      expect(paraFiltersToSearchFilters(para)).toEqual({
        tag: 'cats dogs',
        flairs: '||#ChequesEscolares,||#SalarioMinimo',
        communityUris:
          'at://did:plc:alice/com.para.community/1,at://did:plc:bob/com.para.community/2',
        cabildeoUris:
          'at://did:plc:alice/com.para.cabildeo/1,at://did:plc:bob/com.para.cabildeo/2',
        politicalCompassPositions: 'auth-left,lib-left',
        postType: 'policy',
        party: 'Morena',
        verifiedPublicFigure: 'true',
        state: 'Jalisco',
        districtKey: 'guadalajara-1',
        cabildeoPhase: 'voting',
      })
    })

    it(`drops verifiedPublicFigure when false`, () => {
      expect(paraFiltersToSearchFilters({verifiedPublicFigure: false})).toEqual(
        {},
      )
    })
  })
})
