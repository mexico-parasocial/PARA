jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '16.0',
  select: jest.fn((obj: Record<string, unknown>) => obj.ios),
}))

jest.mock('#/state/session', () => ({
  useAgent: jest.fn(() => ({call: jest.fn()})),
}))

import {normalizeRelationView} from './community-shared-content'

describe('normalizeRelationView', () => {
  it('normalizes a complete parent-child relation', () => {
    const result = normalizeRelationView({
      uri: 'at://did:plc:parent/com.para.community.relation/rkey1',
      cid: 'bafy-relation',
      parentCommunityUri: 'at://did:plc:parent/com.para.community.board/parent',
      childCommunityUri: 'at://did:plc:child/com.para.community.board/child',
      relation: 'parentChild',
      createdAt: '2026-05-11T10:00:00.000Z',
      createdBy: 'did:plc:creator',
    })

    expect(result).toEqual({
      uri: 'at://did:plc:parent/com.para.community.relation/rkey1',
      cid: 'bafy-relation',
      parentCommunityUri: 'at://did:plc:parent/com.para.community.board/parent',
      childCommunityUri: 'at://did:plc:child/com.para.community.board/child',
      relation: 'parentChild',
      createdAt: '2026-05-11T10:00:00.000Z',
      createdBy: 'did:plc:creator',
    })
  })

  it('falls back to empty strings for missing fields', () => {
    const result = normalizeRelationView({})

    expect(result).toEqual({
      uri: '',
      cid: '',
      parentCommunityUri: '',
      childCommunityUri: '',
      relation: 'parentChild',
      createdAt: '',
      createdBy: '',
    })
  })

  it('ignores extra fields', () => {
    const result = normalizeRelationView({
      parentCommunityUri: 'at://parent',
      childCommunityUri: 'at://child',
      extraField: 'should be ignored',
    })

    expect(result.parentCommunityUri).toBe('at://parent')
    expect(result.childCommunityUri).toBe('at://child')
    expect((result as Record<string, unknown>).extraField).toBeUndefined()
  })

  it('defaults relation to parentChild even if input says something else', () => {
    const result = normalizeRelationView({
      relation: 'sibling',
      parentCommunityUri: 'at://parent',
      childCommunityUri: 'at://child',
    })

    expect(result.relation).toBe('parentChild')
  })
})
