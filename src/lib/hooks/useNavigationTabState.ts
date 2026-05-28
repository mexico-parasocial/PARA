import {useNavigationState} from '@react-navigation/native'

import {getTabState, TabState} from '#/lib/routes/helpers'

let lastActiveTab:
  | 'Home'
  | 'Search'
  | 'Feeds'
  | 'Bookmarks'
  | 'Notifications'
  | 'MyProfile'
  | 'Data'
  | 'Communities' = 'Home'

export function useNavigationTabState() {
  return useNavigationState(state => {
    const res = {
      isAtHome: getTabState(state, 'Home') !== TabState.Outside,
      isAtSearch: getTabState(state, 'Search') !== TabState.Outside,
      isAtFeeds: getTabState(state, 'Feeds') !== TabState.Outside,
      isAtBookmarks: getTabState(state, 'Bookmarks') !== TabState.Outside,
      isAtNotifications:
        getTabState(state, 'Notifications') !== TabState.Outside,
      isAtMyProfile: getTabState(state, 'MyProfile') !== TabState.Outside,
      isAtData: getTabState(state, 'Data') !== TabState.Outside,
      isAtCommunities: getTabState(state, 'Communities') !== TabState.Outside,
    }

    const activeNow = ((): typeof lastActiveTab | undefined => {
      if (res.isAtHome) return 'Home'
      if (res.isAtSearch) return 'Search'
      if (res.isAtFeeds) return 'Feeds'
      if (res.isAtBookmarks) return 'Bookmarks'
      if (res.isAtNotifications) return 'Notifications'
      if (res.isAtMyProfile) return 'MyProfile'
      if (res.isAtData) return 'Data'
      if (res.isAtCommunities) return 'Communities'
      return undefined
    })()

    if (activeNow) {
      lastActiveTab = activeNow
      return res
    }

    if (
      !res.isAtHome &&
      !res.isAtSearch &&
      !res.isAtFeeds &&
      !res.isAtNotifications &&
      !res.isAtMyProfile &&
      !res.isAtData &&
      !res.isAtCommunities
    ) {
      res.isAtHome = lastActiveTab === 'Home'
      res.isAtSearch = lastActiveTab === 'Search'
      res.isAtFeeds = lastActiveTab === 'Feeds'
      res.isAtBookmarks = lastActiveTab === 'Bookmarks'
      res.isAtNotifications = lastActiveTab === 'Notifications'
      res.isAtMyProfile = lastActiveTab === 'MyProfile'
      res.isAtData = lastActiveTab === 'Data'
      res.isAtCommunities = lastActiveTab === 'Communities'
    }
    return res
  })
}
