import * as env from '#/env'
import {getNavigationActionFromPath, LINKING} from './linking'

describe('native linking actions', () => {
  it('preserves PARA scheme support', () => {
    expect(LINKING.prefixes).toContain('para://')
  })

  it.each([
    ['/data', 'DataTab', 'Data'],
    ['/notifications', 'NotificationsTab', 'Notifications'],
    ['/messages/abc', 'MessagesTab', 'MessagesConversation'],
    ['/moderation/inbox/settings', 'HomeTab', 'ModerationInboxSettings'],
  ])('routes %s to %s', (path, tab, screen) => {
    expect(getNavigationActionFromPath(path)).toMatchObject({
      type: 'NAVIGATE',
      payload: {name: tab, params: {screen}},
    })
  })
})

describe('web linking actions', () => {
  it('opens Data and community chat directly in the flat navigator', () => {
    jest.replaceProperty(env, 'IS_NATIVE', false)
    try {
      expect(getNavigationActionFromPath('/data')).toMatchObject({
        type: 'NAVIGATE',
        payload: {name: 'Data'},
      })
      expect(
        getNavigationActionFromPath('/messages/community/example/chat'),
      ).toMatchObject({
        type: 'NAVIGATE',
        payload: {name: 'CommunityChat'},
      })
    } finally {
      jest.restoreAllMocks()
    }
  })
})
