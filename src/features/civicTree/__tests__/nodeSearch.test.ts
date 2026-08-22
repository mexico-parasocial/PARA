import {
  type FlairOption,
  normalizeForSearch,
  type PolicyOption,
  searchCivicNodes,
} from '../nodeSearch'

const policies: PolicyOption[] = [
  {uri: 'at://did:plc:a/com.para.civic.cabildeo/1', title: 'Vivienda asequible', community: 'MX Federal'},
  {uri: 'at://did:plc:a/com.para.civic.cabildeo/2', title: 'Transporte público'},
]

const flairs: FlairOption[] = [
  {id: 'policy_educacion_laica', label: 'Educación laica', group: 'Policy topics', category: 'Servicios públicos'},
  {id: 'policy_financiacion_ciencia', label: 'Financiación de la educación', group: 'Policy topics', category: 'Servicios públicos'},
  {id: 'matter_vivienda', label: 'Vivienda', group: 'Matters', category: 'Sociedad'},
]

const search = (query: string, over = {}) =>
  searchCivicNodes({query, policies, flairs, ...over})

describe('normalizeForSearch', () => {
  it('strips diacritics and case', () => {
    expect(normalizeForSearch('Educación LAICA')).toEqual('educacion laica')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeForSearch('  vivienda  ')).toEqual('vivienda')
  })
})

describe('searchCivicNodes', () => {
  it('matches Spanish labels typed without accents', () => {
    const res = search('educacion')
    expect(res.topics.map(t => t.title)).toContain('Educación laica')
  })

  it('ranks a prefix match above a mere containment', () => {
    const res = search('educacion')
    expect(res.topics[0].title).toEqual('Educación laica')
  })

  it('searches policies and topics with one query', () => {
    const res = search('vivienda')
    expect(res.policies.map(p => p.title)).toEqual(['Vivienda asequible'])
    expect(res.topics.map(t => t.title)).toEqual(['Vivienda'])
  })

  it('types a policy result as policy and carries its uri', () => {
    const res = search('transporte')
    expect(res.policies[0].kind).toEqual('policy')
    expect(res.policies[0].uri).toEqual(policies[1].uri)
    expect(res.policies[0].flairId).toBeUndefined()
  })

  it('types a flair result as topic and carries its flair id', () => {
    const res = search('vivienda')
    expect(res.topics[0].kind).toEqual('topic')
    expect(res.topics[0].flairId).toEqual('matter_vivienda')
    expect(res.topics[0].uri).toBeUndefined()
  })

  it('keys a flair topic stably so it dedupes across collections', () => {
    expect(search('vivienda').topics[0].key).toEqual('flair:matter_vivienda')
  })

  it('offers to create only when nothing already names it', () => {
    expect(search('vivienda').canCreate).toBe(false)
    expect(search('algo que no existe').canCreate).toBe(true)
  })

  it('treats an accent difference as naming the same thing', () => {
    expect(search('educacion laica').canCreate).toBe(false)
  })

  it('does not offer to create from an empty query', () => {
    expect(search('').canCreate).toBe(false)
  })

  it('returns everything up to the limit when the query is empty', () => {
    const res = search('')
    expect(res.policies).toHaveLength(2)
    expect(res.topics).toHaveLength(3)
  })

  it('caps each section independently', () => {
    const res = search('', {limitPerSection: 1})
    expect(res.policies).toHaveLength(1)
    expect(res.topics).toHaveLength(1)
  })

  it('reports the section a result came from', () => {
    const res = search('vivienda')
    expect(res.policies[0].section).toEqual('Policies')
    expect(res.topics[0].section).toEqual('Matters')
  })

  it('returns nothing for a query that matches nothing', () => {
    const res = search('zzzz')
    expect(res.policies).toHaveLength(0)
    expect(res.topics).toHaveLength(0)
    expect(res.canCreate).toBe(true)
  })
})
