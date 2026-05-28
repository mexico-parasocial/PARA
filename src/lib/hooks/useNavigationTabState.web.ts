import {useNavigationState} from '@react-navigation/native'

import {getCurrentRoute} from '#/lib/routes/helpers'

let lastActiveTab: 'Home' | 'Search' | 'Notifications' | 'MyProfile' | 'Data' =
  'Home'

export function useNavigationTabState() {
  return useNavigationState(state => {
    let currentRoute = state ? getCurrentRoute(state).name : 'Home'

    const activeNow = ((): typeof lastActiveTab | undefined => {
      if (currentRoute === 'Home') return 'Home'
      if (currentRoute === 'Search') return 'Search'
      if (currentRoute === 'Notifications') return 'Notifications'
      if (currentRoute === 'MyProfile') return 'MyProfile'
      if (currentRoute === 'Data') return 'Data'
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
      isAtNotifications: currentRoute === 'Notifications',
      isAtMyProfile: currentRoute === 'MyProfile',
      isAtData: currentRoute === 'Data',
    }
  })
}
