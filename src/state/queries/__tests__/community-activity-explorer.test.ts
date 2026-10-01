import {
  PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION,
  PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION,
} from '#/lib/api/para-lexicons'
import {fetchCommunityActivities} from '../community-activities'

jest.mock('#/state/session', () => ({
  useAgent: jest.fn(),
  useSession: jest.fn(),
}))
jest.mock('#/state/queries/community-governance', () => ({
  useCommunityGovernanceQuery: jest.fn(),
}))
jest.mock('#/logger', () => ({logger: {warn: jest.fn()}}))

const communityUri = 'at://did:plc:board/com.para.community.board/one'
const otherCommunityUri = 'at://did:plc:board/com.para.community.board/two'

describe('community activity explorer records', () => {
  it('merges social and financial activities for one community', async () => {
    const call = jest
      .fn()
      .mockImplementation((_method: unknown, input: {collection: string}) => {
        if (input.collection === PARA_COMMUNITY_SOCIAL_ACTIVITY_COLLECTION) {
          return Promise.resolve({
            records: [
              {
                uri: 'at://did:plc:organizer/com.para.community.socialActivity/one',
                cid: 'social-cid',
                value: {communityUri, startsAt: '2026-10-02T12:00:00Z'},
              },
              {
                uri: 'at://did:plc:organizer/com.para.community.socialActivity/other',
                cid: 'other-cid',
                value: {
                  communityUri: otherCommunityUri,
                  startsAt: '2026-10-01T12:00:00Z',
                },
              },
            ],
          })
        }
        if (input.collection === PARA_COMMUNITY_ECONOMIC_ACTIVITY_COLLECTION) {
          return Promise.resolve({
            records: [
              {
                uri: 'at://did:plc:organizer/com.para.community.economicActivity/one',
                cid: 'financial-cid',
                value: {communityUri, startsAt: '2026-10-01T12:00:00Z'},
              },
            ],
          })
        }
        throw new Error(`Unexpected collection: ${input.collection}`)
      })
    const agent = {pdsClient: {call}} as unknown as Parameters<
      typeof fetchCommunityActivities
    >[0]['agent']

    const activities = await fetchCommunityActivities({
      agent,
      communityUri,
      organizerDids: ['did:plc:organizer'],
    })

    expect(
      activities.map(activity => [activity.category, activity.uri]),
    ).toEqual([
      [
        'economic',
        'at://did:plc:organizer/com.para.community.economicActivity/one',
      ],
      [
        'social',
        'at://did:plc:organizer/com.para.community.socialActivity/one',
      ],
    ])
    expect(call).toHaveBeenCalledTimes(2)
  })
})
