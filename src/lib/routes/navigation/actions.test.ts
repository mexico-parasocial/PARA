import * as native from './native'
import * as web from './web'

describe('platform navigation actions', () => {
  it('selects the Data tab on native and the Data screen on web', () => {
    expect(native.getTabNavigationAction('Data')).toMatchObject({
      type: 'NAVIGATE',
      payload: {name: 'DataTab'},
    })
    expect(web.getTabNavigationAction('Data')).toMatchObject({
      type: 'NAVIGATE',
      payload: {name: 'Data'},
    })
  })

  it('uses native MessagesTab when Messages is not in the current stack', () => {
    expect(
      native.getMessagesNavigationAction({pushToConversation: '123'}),
    ).toMatchObject({
      type: 'NAVIGATE',
      payload: {
        name: 'MessagesTab',
        params: {screen: 'Messages', params: {pushToConversation: '123'}},
      },
    })
  })

  it('routes a community chat to the native Messages stack or flat web route', () => {
    const params = {
      communityUri: 'at://did:plc:alice/com.para.community.board/test',
      communityName: 'PARA',
      roomId: '!room',
    }
    expect(native.getCommunityChatNavigationAction(params)).toMatchObject({
      payload: {name: 'MessagesTab', params: {screen: 'CommunityChat', params}},
    })
    expect(web.getCommunityChatNavigationAction(params)).toMatchObject({
      payload: {name: 'CommunityChat', params},
    })
  })

  it('removes native animation hints from web message routes', () => {
    expect(
      web.getMessagesNavigationAction({
        pushToConversation: '123',
        animation: 'push',
      }),
    ).toMatchObject({
      payload: {name: 'Messages', params: {pushToConversation: '123'}},
    })
    expect(
      web.getMessagesNavigationAction({animation: 'push'}),
    ).not.toMatchObject({
      payload: {params: {animation: expect.anything()}},
    })
  })
})
