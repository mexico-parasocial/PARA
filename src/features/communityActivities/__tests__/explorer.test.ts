import {type SocialActivityRecord} from '#/lib/api/para-lexicons'
import {
  activityPeriod,
  type ExplorerEntry,
  filterActivityEntries,
} from '../explorer'

const now = Date.parse('2026-10-01T12:00:00Z')
const base = {
  category: 'all' as const,
  communityUri: null,
  search: '',
  time: 'upcoming' as const,
  now,
}

function entry(
  id: string,
  patch: Partial<SocialActivityRecord> = {},
): ExplorerEntry {
  return {
    board: {
      uri: 'at://did:plc:organizer/com.para.community.board/water',
      cid: 'board-cid',
      creatorDid: 'did:plc:organizer',
      communityId: 'water',
      slug: 'water',
      name: 'Gestión del Agua',
      quadrant: 'centro',
      delegatesChatId: '',
      subdelegatesChatId: '',
      memberCount: 1,
      viewerMembershipState: 'none',
      createdAt: '2026-09-01T00:00:00Z',
    },
    activity: {
      uri: `at://did:plc:organizer/com.para.community.socialActivity/${id}`,
      cid: id,
      authorDid: 'did:plc:organizer',
      category: 'social',
      record: {
        communityUri: 'at://did:plc:organizer/com.para.community.board/water',
        title: 'Asamblea de captación',
        description: 'Organizar la captación de lluvia',
        startsAt: '2026-10-05T10:00:00Z',
        location: 'Escuela Central',
        status: 'planned',
        createdBy: 'did:plc:organizer',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
        details: {
          $type: 'com.para.community.socialActivity#assembly',
          format: 'in_person',
        },
        ...patch,
      },
    },
  }
}

it('keeps ongoing events upcoming until their end and respects terminal statuses', () => {
  expect(
    activityPeriod(
      entry('ongoing', {
        startsAt: '2026-10-01T10:00:00Z',
        endsAt: '2026-10-01T14:00:00Z',
      }).activity,
      now,
    ),
  ).toBe('upcoming')
  expect(
    activityPeriod(
      entry('active', {startsAt: '2026-09-01T10:00:00Z', status: 'active'})
        .activity,
      now,
    ),
  ).toBe('upcoming')
  expect(
    activityPeriod(entry('cancelled', {status: 'cancelled'}).activity, now),
  ).toBe('past')
  expect(
    activityPeriod(entry('completed', {status: 'completed'}).activity, now),
  ).toBe('past')
  expect(
    activityPeriod(entry('undated', {startsAt: 'invalid'}).activity, now),
  ).toBe('undated')
})

it('searches accents, community names and locations while preserving exact community/category filters', () => {
  const original = entry('water')
  const twin = {
    ...original,
    board: {...original.board, uri: original.board.uri + '-other'},
  }
  expect(
    filterActivityEntries([original, twin], {
      ...base,
      search: 'gestion captacion central',
      communityUri: original.board.uri,
    }),
  ).toEqual([original])
  expect(
    filterActivityEntries([original], {...base, category: 'economic'}),
  ).toEqual([])
  expect(
    filterActivityEntries([original], {...base, search: 'missing'}),
  ).toEqual([])
})

it('orders upcoming dates forward, past dates backward, and undated records last in Any time', () => {
  const later = entry('later', {startsAt: '2026-10-10T10:00:00Z'})
  const soon = entry('soon')
  const recent = entry('recent', {startsAt: '2026-09-30T10:00:00Z'})
  const old = entry('old', {startsAt: '2026-09-01T10:00:00Z'})
  const undated = entry('undated', {startsAt: 'invalid'})
  const entries = [old, later, undated, recent, soon]
  expect(filterActivityEntries(entries, base)).toEqual([soon, later])
  expect(filterActivityEntries(entries, {...base, time: 'past'})).toEqual([
    recent,
    old,
  ])
  expect(filterActivityEntries(entries, {...base, time: 'all'})).toEqual([
    soon,
    later,
    recent,
    old,
    undated,
  ])
  expect(entries).toEqual([old, later, undated, recent, soon])
})
