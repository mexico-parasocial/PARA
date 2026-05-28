export interface PolicyItem {
  id: string
  type: 'Policy' | 'Matter'
  category: string
  title: string
  promotedBy: 'Community' | 'Party' | 'Recommended' | 'State'
  support?: number
  mentions?: number
  match?: number
  party?: string
  community?: string
  state?: string
  color?: string
  verified?: boolean
  cabildeoUri?: string
  source?: 'cabildeo' | 'mock'
  phase?: string
  participantCount?: number
  voteCount?: number
  positionCount?: number
}
