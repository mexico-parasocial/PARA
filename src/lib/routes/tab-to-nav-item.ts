import {type Events} from '#/analytics/metrics/types'

export type SharedNavTab =
  | 'Home'
  | 'Search'
  | 'Data'
  | 'Messages'
  | 'Notifications'
  | 'MyProfile'

export const TAB_TO_NAV_ITEM: Record<
  SharedNavTab,
  Events['nav:click']['item']
> = {
  Home: 'home',
  Search: 'search',
  Data: 'data',
  Messages: 'chat',
  Notifications: 'notifications',
  MyProfile: 'profile',
}
