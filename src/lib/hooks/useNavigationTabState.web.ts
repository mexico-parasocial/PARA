import {useNavigationState} from '@react-navigation/native'

import {getCurrentRoute} from '#/lib/routes/helpers'

let lastActiveTab:
  | 'Home'
  | 'Search'
  | 'Feeds'
  | 'Bookmarks'
  | 'Notifications'
  | 'MyProfile'
  | 'Data'
  | 'Messages'
  | 'Communities' = 'Home'

export function useNavigationTabState() {
  return useNavigationState(state => {
    let currentRoute = state ? getCurrentRoute(state).name : 'Home'

    const activeNow = ((): typeof lastActiveTab | undefined => {
      if (currentRoute === 'Home') return 'Home'
      if (currentRoute === 'Search') return 'Search'
      if (currentRoute === 'Feeds') return 'Feeds'
      if (currentRoute === 'Bookmarks') return 'Bookmarks'
      if (currentRoute === 'Notifications') return 'Notifications'
      if (currentRoute === 'MyProfile') return 'MyProfile'
      if (currentRoute === 'Data') return 'Data'
      if (currentRoute === 'Messages') return 'Messages'
      if (currentRoute === 'Communities') return 'Communities'
      return undefined
    })()

    if (activeNow) {
      lastActiveTab = activeNow
    } else {
      currentRoute = lastActiveTab
    }

    return {
      isAtHome: currentRoute === 'Home',
      isAtSearch: currentRoute === 'Search',
      isAtFeeds: currentRoute === 'Feeds',
      isAtBookmarks: currentRoute === 'Bookmarks',
      isAtNotifications: currentRoute === 'Notifications',
      isAtMyProfile: currentRoute === 'MyProfile',
      isAtData: currentRoute === 'Data',
      isAtMessages: currentRoute === 'Messages',
      isAtCommunities: currentRoute === 'Communities',
    }
  })
}
