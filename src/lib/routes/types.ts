import {type NavigationState, type PartialState} from '@react-navigation/native'
import {type NativeStackNavigationProp} from '@react-navigation/native-stack'

import {type AxisResult} from '#/screens/RAQ/logic/scoring'
import {type VideoFeedSourceContext} from '#/screens/VideoFeed/types'

export type {NativeStackScreenProps} from '@react-navigation/native-stack'

export type MapRouteParams =
  | {
      state?: string
      layer?: 'states' | 'districts' | 'cities' | 'civic'
      districtId?: number | string
      city?: string
    }
  | undefined

export type HighlightsRouteParams =
  | {
      scope?: 'signals' | 'map' | 'saved' | 'mine'
      community?: string
      state?: string
      subject?: string
      creator?: string
    }
  | undefined

export type CommunityCivicTreeRouteParams =
  | {
      communityUri?: string
      communityName?: string
      pendingContributionId?: string
      highlightCardId?: string
      entryPoint?: 'contribution_submitted' | 'contribution_approved'
    }
  | undefined

export type CommonNavigatorParams = {
  NotFound: undefined
  Lists: undefined
  Moderation: undefined
  ModerationModlists: undefined
  ModerationMutedAccounts: undefined
  ModerationBlockedAccounts: undefined
  ModerationInteractionSettings: undefined
  ModerationVerificationSettings: undefined
  Settings: undefined
  Profile: {name: string; hideBackButton?: boolean}
  ProfileFollowers: {name: string}
  ProfileFollows: {name: string}
  ProfileKnownFollowers: {name: string}
  ProfileSearch: {name: string; q?: string}
  ProfileList: {name: string; rkey: string}
  PostThread: {name: string; rkey: string; collection?: string}
  PostLikedBy: {name: string; rkey: string}
  PostRepostedBy: {name: string; rkey: string}
  PostHighlights: {name: string; rkey: string}
  PostQuotes: {name: string; rkey: string}
  ProfileFeed: {
    name: string
    rkey: string
    feedCacheKey?: 'discover' | 'explore' | undefined
  }
  CommunitiesActiveIn: {name: string}
  ProfileFeedLikedBy: {name: string; rkey: string}
  ProfileLabelerLikedBy: {name: string}
  Debug: undefined
  DebugMod: undefined
  SharedPreferencesTester: undefined
  Log: undefined
  Support: undefined
  PrivacyPolicy: undefined
  TermsOfService: undefined
  CommunityGuidelines: undefined
  CopyrightPolicy: undefined
  LanguageSettings: undefined
  AppPasswords: undefined
  SavedFeeds: undefined
  PreferencesFollowingFeed: undefined
  PreferencesThreads: undefined
  PreferencesExternalEmbeds: undefined
  AccessibilitySettings: undefined
  AppearanceSettings: undefined
  AccountSettings: undefined
  ProfileVisibility: undefined
  PoliticalAffiliation: undefined
  SeeVotes: {did?: string}
  SeeInfluence: {did?: string}
  SeePosts: {did?: string}
  PrivacyAndSecuritySettings: undefined
  ActivityPrivacySettings: undefined
  ContentAndMediaSettings: undefined
  NotificationSettings: undefined
  ReplyNotificationSettings: undefined
  MentionNotificationSettings: undefined
  QuoteNotificationSettings: undefined
  LikeNotificationSettings: undefined
  RepostNotificationSettings: undefined
  NewFollowerNotificationSettings: undefined
  LikesOnRepostsNotificationSettings: undefined
  RepostsOnRepostsNotificationSettings: undefined
  ActivityNotificationSettings: undefined
  MiscellaneousNotificationSettings: undefined
  InterestsSettings: undefined
  FollowedElementsSettings: {selectedId?: string} | undefined
  AboutSettings: undefined
  AppIconSettings: undefined
  FindContactsSettings: undefined
  Search: {q?: string; tab?: 'user' | 'profile' | 'feed'}
  Hashtag: {tag: string; author?: string}
  FlairFeed: {
    flairId: string
    flairTag: string
    flairLabel: string
    kind: 'matter' | 'policy'
    color: string
    isOfficial?: boolean
  }
  Topic: {topic: string}
  MessagesConversation: {conversation: string; embed?: string; accept?: true}
  MessagesConversationSettings: {conversation: string}
  MessagesJoinRequests: {conversation: string}
  MessagesSettings: undefined
  MessagesInbox: undefined
  Messages: {pushToConversation?: string; animation?: 'push' | 'pop'}
  Communities: undefined
  MyCommunities: undefined
  CreateCommunity: undefined
  PoliciesDashboard: {
    filter?: 'Communities' | 'Parties' | 'Both'
    mode?: 'Policies' | 'Matters'
  }
  PolicyDetails: {item?: Record<string, unknown>; cabildeoUri?: string}
  Representatives: {category?: string; q?: string}
  NotificationsActivityList: {posts: string}
  LegacyNotificationSettings: undefined
  Feeds: undefined
  PartyFeed: {partyId: string}
  Start: {name: string; rkey: string}
  StarterPack: {name: string; rkey: string; new?: boolean}
  StarterPackShort: {code: string}
  StarterPackWizard: {
    fromDialog?: boolean
    targetDid?: string
    onSuccess?: () => void
  }
  StarterPackEdit: {rkey?: string}
  VideoFeed: VideoFeedSourceContext
  Bookmarks: undefined
  FindContactsFlow: undefined
  Memes: {view?: 'board' | 'deck'}
  Documents: {category?: string}
  DiscourseAnalysis: undefined
  VSScreenV2: {entities?: string[]; matter?: string}
  AgentChat: {agentId: string}
  CommunityAgentProfile: {agentId: string; communityName?: string}
  RAQ: undefined
  MyRAQ: undefined
  RAQAssessment: undefined
  ProposedRAQList: undefined
  OpenQuestionsList: undefined
  AxesDiscoveryList: {initialTab?: 'official' | 'unofficial'}
  AxisDetail: {axisId: string}
  RAQResults: {results: AxisResult[]}
  OpenQuestionThread: {id: string}
  CommunityRAQ: {communityId: string; communityName: string}
  CommunityVoters: {communityId: string; communityName: string}
  CommunityRoles: {communityId: string; communityName: string}
  Highlights: HighlightsRouteParams
  SeeHighlightDetails: {highlightId: string}
  Map: MapRouteParams
  Compass:
    | {
        initialZoom?: '9ths' | '25ths' | '69ths'
        highlightNinth?: string
        mode?: 'explore' | 'affiliate'
      }
    | undefined
  CabildeoList: {communityId?: string; communityName?: string} | undefined
  CabildeoDetail: {cabildeoUri: string}
  Agora: undefined
  CommunityDirectory: undefined
  ProposalDetail: {proposalUri: string}
  DelegateVote: {cabildeoUri: string}
  CreateCabildeo: undefined
  CreatePosition: {cabildeoUri: string; optionIndex?: number}
  DistrictProfile: {districtId: number; initialTab?: 'overview' | 'activity'}
  CommunityCivicTree: CommunityCivicTreeRouteParams
  CivicTree: undefined
  CollectionDetail: {collectionId: string}
}

export type BottomTabNavigatorParams = CommonNavigatorParams & {
  HomeTab: undefined
  SearchTab: undefined
  NotificationsTab: {screen?: string; params?: object} | undefined
  MyProfileTab: undefined
  DataTab: undefined
}

export type HomeTabNavigatorParams = CommonNavigatorParams & {
  Home: undefined
}

export type SearchTabNavigatorParams = CommonNavigatorParams & {
  Search: {q?: string; tab?: 'user' | 'profile' | 'feed'}
}

export type NotificationsTabNavigatorParams = CommonNavigatorParams & {
  Notifications: undefined
}

export type MyProfileTabNavigatorParams = CommonNavigatorParams & {
  MyProfile: {name: 'me'; hideBackButton: true}
}

export type DataTabNavigatorParams = CommonNavigatorParams & {
  Data: undefined
  MyBase: undefined
  MyAffiliations: undefined
  CommunityProfile: {communityId: string; communityName?: string}
  CommunityChat: {communityUri: string; communityName: string; roomId?: string}
  CommunityMembers: {communityUri: string; communityName: string}
  ModeratorDashboard: {communityUri: string; communityName: string}
}

export type FlatNavigatorParams = CommonNavigatorParams & {
  Agora: undefined
  ProposalDetail: {proposalUri: string}
  Home: undefined
  Search: {q?: string; tab?: 'user' | 'profile' | 'feed'}
  Feeds: undefined
  PartyFeed: {partyId: string}
  Notifications: undefined
  CommunityProfile: {communityId: string; communityName?: string}
  CommunityChat: {communityUri: string; communityName: string; roomId?: string}
  CommunityRoles: {communityId: string; communityName: string}
  CommunityMembers: {communityUri: string; communityName: string}
  ModeratorDashboard: {communityUri: string; communityName: string}
  PoliciesDashboard: {
    filter?: 'Communities' | 'Parties' | 'Both'
    mode?: 'Policies' | 'Matters'
  }
  PolicyDetails: {item?: Record<string, unknown>; cabildeoUri?: string}
  Representatives: {category?: string; q?: string}
  Data: undefined
  CreatePost: undefined
  MyBase: undefined
  MyWallet: undefined
  VerifyDashboard: undefined
  TrustedIssuers: undefined
  ConsentAudit: undefined
  IdentityHub: undefined
  INEVerification: undefined
  MyAffiliations: undefined
  Memes: {view?: 'board' | 'deck'}
  Documents: {category?: string}
  RAQ: undefined
  ProposedRAQList: undefined
  OpenQuestionsList: undefined
  AxesDiscoveryList: {initialTab?: 'official' | 'unofficial'}
  AxisDetail: {axisId: string}
  RAQResults: {results: AxisResult[]}
  OpenQuestionThread: {id: string}
}

export type AllNavigatorParams = CommonNavigatorParams & {
  HomeTab: undefined
  Home: undefined
  PoliciesDashboard: {
    filter?: 'Communities' | 'Parties' | 'Both'
    mode?: 'Policies' | 'Matters'
  }
  PolicyDetails: {item?: Record<string, unknown>; cabildeoUri?: string}
  Representatives: {category?: string; q?: string}
  SearchTab: undefined
  Search: {q?: string; tab?: 'user' | 'profile' | 'feed'}
  Feeds: undefined
  PartyFeed: {partyId: string}
  NotificationsTab: {screen?: string; params?: object} | undefined
  Notifications: undefined
  MyProfileTab: undefined
  DataTab: undefined
  Data: undefined
  MyBase: undefined
  MyWallet: undefined
  VerifyDashboard: undefined
  TrustedIssuers: undefined
  ConsentAudit: undefined
  IdentityHub: undefined
  INEVerification: undefined
  MyAffiliations: undefined
  CreatePost: undefined
  CommunityProfile: {communityId: string; communityName?: string}
  CommunityChat: {communityUri: string; communityName: string; roomId?: string}
  CommunityMembers: {communityUri: string; communityName: string}
  ModeratorDashboard: {communityUri: string; communityName: string}
  CommunityRoles: {communityId: string; communityName: string}
  RAQ: undefined
  ProposedRAQList: undefined
  OpenQuestionsList: undefined
  AxesDiscoveryList: {initialTab?: 'official' | 'unofficial'}
  AxisDetail: {axisId: string}
  RAQResults: {results: AxisResult[]}
  OpenQuestionThread: {id: string}
  Highlights: HighlightsRouteParams
  SeeHighlightDetails: {highlightId: string}
}

export type RootStackParams = {
  Tabs: undefined
  CreatePost: undefined
}

// NOTE
// this isn't strictly correct but it should be close enough
// a TS wizard might be able to get this 100%
// -prf
export type NavigationProp = NativeStackNavigationProp<AllNavigatorParams>

export type State =
  | NavigationState
  | Omit<PartialState<NavigationState>, 'stale'>

export type RouteParams = Record<string, string>
export type MatchResult = {params: RouteParams}
export type Route = {
  match: (path: string) => MatchResult | undefined
  build: (params?: Record<string, string | number | undefined>) => string
}
