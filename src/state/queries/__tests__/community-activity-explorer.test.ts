import {
  fetchCommunityActivities,
  getCommunityOrganizerDids,
} from '../community-activities'

jest.mock('#/state/session', () => ({
  useAgent: jest.fn(),
  useSession: jest.fn(),
}))
jest.mock('#/state/queries/community-governance', () => ({
  useCommunityGovernanceQuery: jest.fn(),
}))

const communityUri = 'at://did:plc:board/com.para.community.board/one'

const served = (category: string, rkey: string, startsAt: string) => ({
  uri: `at://did:plc:organizer/com.para.community.${category}Activity/${rkey}`,
  cid: `${rkey}-cid`,
  author: 'did:plc:organizer',
  category,
  communityUri,
  record: {communityUri, startsAt, title: rkey},
  indexedAt: startsAt,
})

describe('community activities from the AppView', () => {
  it('pages through a community and merges both categories, soonest first', async () => {
    const call = jest
      .fn()
      .mockResolvedValueOnce({
        activities: [
          served('social', 'march', '2026-10-02T12:00:00Z'),
          served('unknown', 'ignored', '2026-09-01T12:00:00Z'),
        ],
        cursor: 'next',
      })
      .mockResolvedValueOnce({
        activities: [served('economic', 'raffle', '2026-10-01T12:00:00Z')],
      })
    const agent = {appviewClient: {call}} as unknown as Parameters<
      typeof fetchCommunityActivities
    >[0]['agent']

    const activities = await fetchCommunityActivities({agent, communityUri})

    expect(
      activities.map(activity => [
        activity.category,
        activity.uri,
        activity.authorDid,
      ]),
    ).toEqual([
      [
        'economic',
        'at://did:plc:organizer/com.para.community.economicActivity/raffle',
        'did:plc:organizer',
      ],
      [
        'social',
        'at://did:plc:organizer/com.para.community.socialActivity/march',
        'did:plc:organizer',
      ],
    ])
    expect(call).toHaveBeenCalledTimes(2)
    expect(call.mock.calls[0][1]).toMatchObject({community: communityUri})
    expect(call.mock.calls[1][1]).toMatchObject({cursor: 'next'})
  })
})

describe('community organizers', () => {
  it('uses the board creator and verified owner or moderator roles only', () => {
    const governance = {
      moderators: [{did: 'did:plc:self-declared', role: 'moderator'}],
      officials: [{did: 'did:plc:published-official'}],
      roleHolders: [
        {did: 'did:plc:owner', role: 'owner'},
        {did: 'did:plc:moderator', role: 'moderator'},
        {did: 'did:plc:member', role: 'member'},
      ],
    } as unknown as Parameters<typeof getCommunityOrganizerDids>[0]['governance']

    expect(
      getCommunityOrganizerDids({governance, creatorDid: 'did:plc:creator'}),
    ).toEqual(['did:plc:creator', 'did:plc:moderator', 'did:plc:owner'])
  })
})
