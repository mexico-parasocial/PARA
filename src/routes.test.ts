import {getActionFromState} from '@react-navigation/native'

import {buildStateObject, NATIVE_LINK_ACTION_CONFIG} from '#/lib/routes/helpers'
import {router} from '#/routes'

describe('moderation and upstream navigation routes', () => {
  it.each([
    ['ModerationInboxSettings', '/moderation/inbox/settings'],
    ['ModerationInboxNoticeDetails', '/moderation/inbox/notice/details'],
    ['InviteScanner', '/invite/scan'],
    ['AutomationLabelSettings', '/settings/automation-label'],
    ['MatterDetails', '/matter-details'],
    ['MyWallet', '/my-wallet'],
    ['TrustedIssuers', '/trusted-issuers'],
    ['ConsentAudit', '/consent-audit'],
    ['IdentityHub', '/identity-hub'],
    ['INEVerification', '/ine-verification'],
  ])('round-trips %s', (name, path) => {
    expect(router.matchName(name)?.build()).toBe(path)
    expect(router.matchPath(path)).toEqual([name, {}])
  })

  it('round-trips report identity and preserves query parameters', () => {
    const params = {
      moderationService: 'did:plc:labeler',
      id: '42',
      tab: 'reports',
    }
    const path = router.matchName('ModerationInboxReportDetails')?.build(params)

    expect(path).toBe('/moderation/inbox/report/did:plc:labeler/42?tab=reports')
    expect(router.matchPath(path!)).toEqual([
      'ModerationInboxReportDetails',
      params,
    ])
  })

  it('keeps the existing report-detail links working', () => {
    expect(router.matchPath('/moderation/inbox/report/details')).toEqual([
      'ModerationInboxReportDetails',
      {},
    ])
  })

  it.each([
    ['CustomFeed', 'ProfileFeed', '/profile/alice.test/feed/my-feed'],
    [
      'CustomFeedLikedBy',
      'ProfileFeedLikedBy',
      '/profile/alice.test/feed/my-feed/liked-by',
    ],
  ])(
    'accepts %s links while preserving the PARA inbound screen',
    (name, screen, path) => {
      expect(
        router.matchName(name)?.build({name: 'alice.test', rkey: 'my-feed'}),
      ).toBe(path)
      expect(router.matchPath(path)).toEqual([
        screen,
        {name: 'alice.test', rkey: 'my-feed'},
      ])
    },
  )

  it('pushes a moderation link above Home without resetting its stack', () => {
    const state = buildStateObject('HomeTab', 'ModerationInboxSettings', {}, [
      {name: 'Home', params: {}},
    ])
    const action = getActionFromState(state, NATIVE_LINK_ACTION_CONFIG)

    expect(action?.type).toBe('NAVIGATE')
    expect(action?.payload).toMatchObject({
      name: 'HomeTab',
      params: {screen: 'ModerationInboxSettings', initial: false},
    })
  })

  it.each([
    ['CommunityMembers', '/communities/members'],
    ['ModeratorDashboard', '/communities/moderation'],
  ])('preserves community context for %s', (name, basePath) => {
    const params = {
      communityUri: 'at://did:plc:alice/com.para.community.board/test',
      communityName: 'PARA Test',
    }
    const path = router.matchName(name)?.build(params)
    expect(path?.startsWith(`${basePath}?`)).toBe(true)
    expect(router.matchPath(path!)).toEqual([name, params])
  })

  it('round-trips the anonymous voice profile', () => {
    const path = router
      .matchName('AnonymousVoice')
      ?.build({profileId: 'profile-123'})
    expect(path).toBe('/anonymous-voice/profile-123')
    expect(router.matchPath(path!)).toEqual([
      'AnonymousVoice',
      {profileId: 'profile-123'},
    ])
  })

  it('does not resolve a repost screen', () => {
    expect(
      router.matchPath('/profile/alice.test/post/abc/reposted-by')[0],
    ).toBe('NotFound')
  })
})
