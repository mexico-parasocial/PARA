import {type JSX, useCallback, useRef} from 'react'
import {Linking} from 'react-native'
import * as Notifications from 'expo-notifications'
import {i18n, type MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/core/macro'
import {
  type BottomTabBarProps,
  createBottomTabNavigator,
} from '@react-navigation/bottom-tabs'
import {
  CommonActions,
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  type LinkingOptions,
  NavigationContainer,
  StackActions,
} from '@react-navigation/native'

import {timeout} from '#/lib/async/timeout'
import {useAccountSwitcher} from '#/lib/hooks/useAccountSwitcher'
import {useColorSchemeStyle} from '#/lib/hooks/useColorSchemeStyle'
import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {
  getNotificationPayload,
  type NotificationPayload,
  notificationToURL,
  storePayloadForAccountSwitch,
} from '#/lib/hooks/useNotificationHandler'
import {useWebScrollRestoration} from '#/lib/hooks/useWebScrollRestoration'
import {useCallOnce} from '#/lib/once'
import {buildStateObject} from '#/lib/routes/helpers'
import {
  type AllNavigatorParams,
  type BottomTabNavigatorParams,
  type DataTabNavigatorParams,
  type FlatNavigatorParams,
  type HomeTabNavigatorParams,
  type MyProfileTabNavigatorParams,
  type NotificationsTabNavigatorParams,
  type RootStackParams,
  type RouteParams,
  type SearchTabNavigatorParams,
  type State,
} from '#/lib/routes/types'
import {bskyTitle} from '#/lib/strings/headings'
import {useUnreadNotifications} from '#/state/queries/notifications/unread'
import {useSession} from '#/state/session'
import {
  useLoggedOutView,
  useLoggedOutViewControls,
} from '#/state/shell/logged-out'
import {
  shouldRequestEmailConfirmation,
  snoozeEmailConfirmationPrompt,
} from '#/state/shell/reminders'
import {useCloseAllActiveElements} from '#/state/util'
import {CommunityGuidelinesScreen} from '#/view/screens/CommunityGuidelines'
import {CopyrightPolicyScreen} from '#/view/screens/CopyrightPolicy'
import {DebugModScreen} from '#/view/screens/DebugMod'
import {FeedsScreen} from '#/view/screens/Feeds'
import {HomeScreen} from '#/view/screens/Home'
import {ListsScreen} from '#/view/screens/Lists'
import {ModerationBlockedAccounts} from '#/view/screens/ModerationBlockedAccounts'
import {ModerationModlistsScreen} from '#/view/screens/ModerationModlists'
import {ModerationMutedAccounts} from '#/view/screens/ModerationMutedAccounts'
import {NotFoundScreen} from '#/view/screens/NotFound'
import {NotificationsScreen} from '#/view/screens/Notifications'
import {PostThreadScreen} from '#/view/screens/PostThread'
import {PrivacyPolicyScreen} from '#/view/screens/PrivacyPolicy'
import {ProfileScreen} from '#/view/screens/Profile'
import {ProfileFeedLikedByScreen} from '#/view/screens/ProfileFeedLikedBy'
import {StorybookScreen} from '#/view/screens/Storybook'
import {SupportScreen} from '#/view/screens/Support'
import {TermsOfServiceScreen} from '#/view/screens/TermsOfService'
import {BottomBar} from '#/view/shell/bottom-bar/BottomBar'
import {createNativeStackNavigatorWithAuth} from '#/view/shell/createNativeStackNavigatorWithAuth'
import {AgoraScreen} from '#/screens/Agora/AgoraScreen'
import {ProposalDetailScreen} from '#/screens/Agora/ProposalDetailScreen'
import {CivicTreeScreen} from '#/screens/Data/CivicTreeScreen'
import {CollectionDetailScreen} from '#/screens/Data/CollectionDetailScreen'
import {CommunityCivicTreeScreen} from '#/screens/Data/CommunityCivicTreeScreen'
import {CommunityDirectoryScreen} from '#/screens/Data/CommunityDirectoryScreen'
import {CompassScreen} from '#/screens/Data/CompassScreen'
import {CreatePostScreen} from '#/screens/Data/CreatePostScreen'
import {DataScreen} from '#/screens/Data/DataScreen'
import {MyAffiliationsScreen} from '#/screens/Data/MyAffiliationsScreen'
// Lazy loaded below
import {MyBaseScreen} from '#/screens/Data/MyBaseScreen'
import {BookmarksScreen} from '#/screens/Bookmarks'
import {CabildeoDetailScreen} from '#/screens/Communities/CabildeoDetailScreen'
import {CabildeoListScreen} from '#/screens/Communities/CabildeoListScreen'
import {CommunitiesScreen} from '#/screens/Communities/CommunitiesScreen'
import {CommunityAgentProfileScreen} from '#/screens/Communities/CommunityAgentProfileScreen'
import {CommunityChatScreen} from '#/screens/Communities/CommunityChatScreen'
import {CommunityMembersScreen} from '#/screens/Communities/CommunityMembersScreen'
import {CommunityProfileScreen} from '#/screens/Communities/CommunityProfileScreen'
import {CommunityRAQScreen} from '#/screens/Communities/CommunityRAQScreen'
import {CommunityRolesScreen} from '#/screens/Communities/CommunityRolesScreen'
import {CommunityVotersScreen} from '#/screens/Communities/CommunityVotersScreen'
import {CreateCabildeoScreen} from '#/screens/Communities/CreateCabildeoScreen'
import {CreateCommunityScreen} from '#/screens/Communities/CreateCommunityScreen'
import {CreatePositionScreen} from '#/screens/Communities/CreatePositionScreen'
import {DelegateVoteScreen} from '#/screens/Communities/DelegateVoteScreen'
import {ModeratorDashboardScreen} from '#/screens/Communities/ModeratorDashboardScreen'
import {MyCommunitiesScreen} from '#/screens/Communities/MyCommunitiesScreen'
import {DiscourseAnalysisScreen} from '#/screens/Dashboard/DiscourseAnalysis'
import {DocumentsScreen} from '#/screens/Dashboard/DocumentsScreen'
import {MemesScreen} from '#/screens/Dashboard/MemesScreen'
import {PoliciesDashboard} from '#/screens/Dashboard/PoliciesAndMatters'
import {PolicyDetailsScreen} from '#/screens/Dashboard/PolicyDetails'
import {RepresentativesScreen} from '#/screens/Dashboard/Representatives'
import {VSScreen} from '#/screens/Dashboard/VSScreenV2'
import {SharedPreferencesTesterScreen} from '#/screens/E2E/SharedPreferencesTesterScreen'
import {PartyFeedScreen} from '#/screens/Feeds/PartyFeed'
import {FindContactsFlowScreen} from '#/screens/FindContactsFlowScreen'
import FlairFeedScreen from '#/screens/FlairFeed'
import HashtagScreen from '#/screens/Hashtag'
import {HighlightsScreen} from '#/screens/Highlights/HighlightsScreen'
import {LogScreen} from '#/screens/Log'
import ConsentAuditScreen from '#/screens/m8/ConsentAuditScreen'
import IdentityHubScreen from '#/screens/m8/IdentityHubScreen'
import INEVerificationScreen from '#/screens/m8/INEVerificationScreen'
import TrustedIssuersScreen from '#/screens/m8/TrustedIssuersScreen'
import VerifyDashboardScreen from '#/screens/m8/VerifyDashboardScreen'
import WalletScreen from '#/screens/m8/WalletScreen'
import {AgentChatScreen} from '#/screens/Messages/AgentChat'
import {MessagesScreen} from '#/screens/Messages/ChatList'
import {MessagesConversationScreen} from '#/screens/Messages/Conversation'
import {MessagesConversationSettingsScreen} from '#/screens/Messages/ConversationSettings'
import {MessagesInboxScreen} from '#/screens/Messages/Inbox'
import {MessagesSettingsScreen} from '#/screens/Messages/Settings'
import {ModerationScreen} from '#/screens/Moderation'
import {Screen as ModerationVerificationSettings} from '#/screens/Moderation/VerificationSettings'
import {Screen as ModerationInteractionSettings} from '#/screens/ModerationInteractionSettings'
import {NotificationsActivityListScreen} from '#/screens/Notifications/ActivityList'
import {PostHighlightsScreen} from '#/screens/Post/PostHighlights'
import {PostLikedByScreen} from '#/screens/Post/PostLikedBy'
import {PostQuotesScreen} from '#/screens/Post/PostQuotes'
import {PostRepostedByScreen} from '#/screens/Post/PostRepostedBy'
import {CommunitiesActiveInScreen} from '#/screens/Profile/CommunitiesActiveIn'
import {ProfileKnownFollowersScreen} from '#/screens/Profile/KnownFollowers'
import {ProfileFeedScreen} from '#/screens/Profile/ProfileFeed'
import {ProfileFollowersScreen} from '#/screens/Profile/ProfileFollowers'
import {ProfileFollowsScreen} from '#/screens/Profile/ProfileFollows'
import {ProfileLabelerLikedByScreen} from '#/screens/Profile/ProfileLabelerLikedBy'
import {ProfileSearchScreen} from '#/screens/Profile/ProfileSearch'
import {ProfileListScreen} from '#/screens/ProfileList'
import AxesDiscoveryScreen from '#/screens/RAQ/AxesDiscoveryScreen'
import AxisDetailScreen from '#/screens/RAQ/AxisDetailScreen'
import {MyRAQScreen} from '#/screens/RAQ/MyRAQScreen'
import OpenQuestionsListScreen from '#/screens/RAQ/OpenQuestionsList'
import OpenQuestionThreadScreen from '#/screens/RAQ/OpenQuestionThreadScreen'
import ProposedRAQListScreen from '#/screens/RAQ/ProposedRAQList'
import RAQAssessment from '#/screens/RAQ/RAQAssessment'
import RAQMenuScreen from '#/screens/RAQ/RAQMenu'
import RAQResultsScreen from '#/screens/RAQ/Results'
import {SavedFeeds} from '#/screens/SavedFeeds'
import {SearchScreen} from '#/screens/Search'
import {AboutSettingsScreen} from '#/screens/Settings/AboutSettings'
import {AccessibilitySettingsScreen} from '#/screens/Settings/AccessibilitySettings'
import {AccountSettingsScreen} from '#/screens/Settings/AccountSettings'
import {ActivityPrivacySettingsScreen} from '#/screens/Settings/ActivityPrivacySettings'
import {AppearanceSettingsScreen} from '#/screens/Settings/AppearanceSettings'
import {AppIconSettingsScreen} from '#/screens/Settings/AppIconSettings'
import {AppPasswordsScreen} from '#/screens/Settings/AppPasswords'
import {ContentAndMediaSettingsScreen} from '#/screens/Settings/ContentAndMediaSettings'
import {ExternalMediaPreferencesScreen} from '#/screens/Settings/ExternalMediaPreferences'
import {FindContactsSettingsScreen} from '#/screens/Settings/FindContactsSettings'
import {FollowedElementsSettingsScreen} from '#/screens/Settings/FollowedElementsSettings'
import {FollowingFeedPreferencesScreen} from '#/screens/Settings/FollowingFeedPreferences'
import {InterestsSettingsScreen} from '#/screens/Settings/InterestsSettings'
import {LanguageSettingsScreen} from '#/screens/Settings/LanguageSettings'
import {LegacyNotificationSettingsScreen} from '#/screens/Settings/LegacyNotificationSettings'
import {NotificationSettingsScreen} from '#/screens/Settings/NotificationSettings'
import {ActivityNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/ActivityNotificationSettings'
import {LikeNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/LikeNotificationSettings'
import {LikesOnRepostsNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/LikesOnRepostsNotificationSettings'
import {MentionNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/MentionNotificationSettings'
import {MiscellaneousNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/MiscellaneousNotificationSettings'
import {NewFollowerNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/NewFollowerNotificationSettings'
import {QuoteNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/QuoteNotificationSettings'
import {ReplyNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/ReplyNotificationSettings'
import {RepostNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/RepostNotificationSettings'
import {RepostsOnRepostsNotificationSettingsScreen} from '#/screens/Settings/NotificationSettings/RepostsOnRepostsNotificationSettings'
import {PoliticalAffiliationScreen} from '#/screens/Settings/PoliticalAffiliation'
import {PrivacyAndSecuritySettingsScreen} from '#/screens/Settings/PrivacyAndSecuritySettings'
import {ProfileVisibilityScreen} from '#/screens/Settings/ProfileVisibility'
import {SettingsScreen} from '#/screens/Settings/Settings'
import {ThreadPreferencesScreen} from '#/screens/Settings/ThreadPreferences'
import TopicScreen from '#/screens/Topic'
import {VideoFeed} from '#/screens/VideoFeed'
import {type Theme, useTheme} from '#/alf'
import {
  EmailDialogScreenID,
  useEmailDialogControl,
} from '#/components/dialogs/EmailDialog'
import {useAnalytics} from '#/analytics'
import {setNavigationMetadata} from '#/analytics/metadata'
import {IS_LIQUID_GLASS, IS_NATIVE, IS_WEB} from '#/env'
import {router} from '#/routes'
import {Referrer} from '../modules/expo-bluesky-swiss-army'
import {renderMessagesSplitViewLayout} from './screens/Messages/components/splitView/MessagesSplitViewLayout'

const navigationRef = createNavigationContainerRef<AllNavigatorParams>()

const HomeTab = createNativeStackNavigatorWithAuth<HomeTabNavigatorParams>()
const SearchTab = createNativeStackNavigatorWithAuth<SearchTabNavigatorParams>()
const NotificationsTab =
  createNativeStackNavigatorWithAuth<NotificationsTabNavigatorParams>()
const MyProfileTab =
  createNativeStackNavigatorWithAuth<MyProfileTabNavigatorParams>()
const DataTab = createNativeStackNavigatorWithAuth<DataTabNavigatorParams>()
const Flat = createNativeStackNavigatorWithAuth<FlatNavigatorParams>()
const Tab = createBottomTabNavigator<BottomTabNavigatorParams>()
const RootStack = createNativeStackNavigatorWithAuth<RootStackParams>()

/**
 * These "common screens" are reused across stacks.
 */
function commonScreens(Stack: typeof Flat, unreadCountLabel?: string) {
  const title = (page: MessageDescriptor) =>
    bskyTitle(i18n._(page), unreadCountLabel)

  return (
    <>
      <Stack.Screen
        name="NotFound"
        getComponent={() => NotFoundScreen}
        options={{title: title(msg`Not Found`)}}
      />
      <Stack.Screen
        name="Lists"
        component={ListsScreen}
        options={{title: title(msg`Lists`), requireAuth: true}}
      />
      <Stack.Screen
        name="Moderation"
        getComponent={() => ModerationScreen}
        options={{title: title(msg`Moderation`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationModlists"
        getComponent={() => ModerationModlistsScreen}
        options={{title: title(msg`Moderation Lists`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationMutedAccounts"
        getComponent={() => ModerationMutedAccounts}
        options={{title: title(msg`Muted Accounts`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationBlockedAccounts"
        getComponent={() => ModerationBlockedAccounts}
        options={{title: title(msg`Blocked Accounts`), requireAuth: true}}
      />
      <Stack.Screen
        name="ModerationInteractionSettings"
        getComponent={() => ModerationInteractionSettings}
        options={{
          title: title(msg`Post Interaction Settings`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="ModerationVerificationSettings"
        getComponent={() => ModerationVerificationSettings}
        options={{
          title: title(msg`Verification Settings`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="Settings"
        getComponent={() => SettingsScreen}
        options={{title: title(msg`Settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="LanguageSettings"
        getComponent={() => LanguageSettingsScreen}
        options={{title: title(msg`Language Settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="Profile"
        getComponent={() => ProfileScreen}
        options={({route}) => ({
          title: bskyTitle(`@${route.params.name}`, unreadCountLabel),
        })}
      />
      <Stack.Screen
        name="ProfileFollowers"
        getComponent={() => ProfileFollowersScreen}
        options={({route}) => ({
          title: title(msg`People following @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileFollows"
        getComponent={() => ProfileFollowsScreen}
        options={({route}) => ({
          title: title(msg`People followed by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileKnownFollowers"
        getComponent={() => ProfileKnownFollowersScreen}
        options={({route}) => ({
          title: title(msg`Followers of @${route.params.name} that you know`),
        })}
      />
      <Stack.Screen
        name="CommunitiesActiveIn"
        getComponent={() => CommunitiesActiveInScreen}
        options={{
          title: title(msg`Communities active in`),
        }}
      />
      <Stack.Screen
        name="ProfileList"
        getComponent={() => ProfileListScreen}
        options={{title: title(msg`List`), requireAuth: true}}
      />
      <Stack.Screen
        name="ProfileSearch"
        getComponent={() => ProfileSearchScreen}
        options={({route}) => ({
          title: title(msg`Search @${route.params.name}'s posts`),
        })}
      />
      <Stack.Screen
        name="PostThread"
        getComponent={() => PostThreadScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostLikedBy"
        getComponent={() => PostLikedByScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostRepostedBy"
        getComponent={() => PostRepostedByScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostHighlights"
        getComponent={() => PostHighlightsScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="PostQuotes"
        getComponent={() => PostQuotesScreen}
        options={({route}) => ({
          title: title(msg`Post by @${route.params.name}`),
        })}
      />
      <Stack.Screen
        name="ProfileFeed"
        getComponent={() => ProfileFeedScreen}
        options={{title: title(msg`Feed`)}}
      />
      <Stack.Screen
        name="ProfileFeedLikedBy"
        getComponent={() => ProfileFeedLikedByScreen}
        options={{title: title(msg`Liked by`)}}
      />
      <Stack.Screen
        name="ProfileLabelerLikedBy"
        getComponent={() => ProfileLabelerLikedByScreen}
        options={{title: title(msg`Liked by`)}}
      />
      <Stack.Screen
        name="Debug"
        getComponent={() => StorybookScreen}
        options={{title: title(msg`Storybook`), requireAuth: true}}
      />
      <Stack.Screen
        name="DebugMod"
        getComponent={() => DebugModScreen}
        options={{title: title(msg`Moderation states`), requireAuth: true}}
      />
      <Stack.Screen
        name="SharedPreferencesTester"
        getComponent={() => SharedPreferencesTesterScreen}
        options={{title: title(msg`Shared Preferences Tester`)}}
      />
      <Stack.Screen
        name="Log"
        getComponent={() => LogScreen}
        options={{title: title(msg`Log`), requireAuth: true}}
      />
      <Stack.Screen
        name="Support"
        getComponent={() => SupportScreen}
        options={{title: title(msg`Support`)}}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        getComponent={() => PrivacyPolicyScreen}
        options={{title: title(msg`Privacy Policy`)}}
      />
      <Stack.Screen
        name="TermsOfService"
        getComponent={() => TermsOfServiceScreen}
        options={{title: title(msg`Terms of Service`)}}
      />
      <Stack.Screen
        name="CommunityGuidelines"
        getComponent={() => CommunityGuidelinesScreen}
        options={{title: title(msg`Community Guidelines`)}}
      />
      <Stack.Screen
        name="CopyrightPolicy"
        getComponent={() => CopyrightPolicyScreen}
        options={{title: title(msg`Copyright Policy`)}}
      />
      <Stack.Screen
        name="AppPasswords"
        getComponent={() => AppPasswordsScreen}
        options={{title: title(msg`App Passwords`), requireAuth: true}}
      />
      <Stack.Screen
        name="SavedFeeds"
        getComponent={() => SavedFeeds}
        options={{title: title(msg`Edit My Feeds`), requireAuth: true}}
      />
      <Stack.Screen
        name="PreferencesFollowingFeed"
        getComponent={() => FollowingFeedPreferencesScreen}
        options={{
          title: title(msg`Following Feed Preferences`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="PreferencesThreads"
        getComponent={() => ThreadPreferencesScreen}
        options={{title: title(msg`Threads Preferences`), requireAuth: true}}
      />
      <Stack.Screen
        name="PreferencesExternalEmbeds"
        getComponent={() => ExternalMediaPreferencesScreen}
        options={{
          title: title(msg`External Media Preferences`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AccessibilitySettings"
        getComponent={() => AccessibilitySettingsScreen}
        options={{
          title: title(msg`Accessibility Settings`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AppearanceSettings"
        getComponent={() => AppearanceSettingsScreen}
        options={{
          title: title(msg`Appearance`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AccountSettings"
        getComponent={() => AccountSettingsScreen}
        options={{
          title: title(msg`Account`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="ProfileVisibility"
        getComponent={() => ProfileVisibilityScreen}
        options={{
          title: title(msg`Profile Visibility`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="PoliticalAffiliation"
        getComponent={() => PoliticalAffiliationScreen}
        options={{
          title: title(msg`Political Affiliation`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="SeeVotes"
        getComponent={() =>
          require('#/screens/Data/SeeVotesScreen').SeeVotesScreen
        }
        options={{
          title: title(msg`Votes History`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="SeeInfluence"
        getComponent={() =>
          require('#/screens/Data/SeeInfluenceScreen').SeeInfluenceScreen
        }
        options={{
          title: title(msg`Influence Score`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="SeePosts"
        getComponent={() =>
          require('#/screens/Data/SeePostsScreen').SeePostsScreen
        }
        options={{
          title: title(msg`Posts`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="PrivacyAndSecuritySettings"
        getComponent={() => PrivacyAndSecuritySettingsScreen}
        options={{
          title: title(msg`Privacy and Security`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="ActivityPrivacySettings"
        getComponent={() => ActivityPrivacySettingsScreen}
        options={{
          title: title(msg`Privacy and Security`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="FindContactsSettings"
        getComponent={() => FindContactsSettingsScreen}
        options={{
          title: title(msg`Find Contacts`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="NotificationSettings"
        getComponent={() => NotificationSettingsScreen}
        options={{title: title(msg`Notification settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="ReplyNotificationSettings"
        getComponent={() => ReplyNotificationSettingsScreen}
        options={{
          title: title(msg`Reply notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="MentionNotificationSettings"
        getComponent={() => MentionNotificationSettingsScreen}
        options={{
          title: title(msg`Mention notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="QuoteNotificationSettings"
        getComponent={() => QuoteNotificationSettingsScreen}
        options={{
          title: title(msg`Quote notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="LikeNotificationSettings"
        getComponent={() => LikeNotificationSettingsScreen}
        options={{
          title: title(msg`Influence notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="RepostNotificationSettings"
        getComponent={() => RepostNotificationSettingsScreen}
        options={{
          title: title(msg`Repost notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="NewFollowerNotificationSettings"
        getComponent={() => NewFollowerNotificationSettingsScreen}
        options={{
          title: title(msg`New follower notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="LikesOnRepostsNotificationSettings"
        getComponent={() => LikesOnRepostsNotificationSettingsScreen}
        options={{
          title: title(msg`Votes of your quotes notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="RepostsOnRepostsNotificationSettings"
        getComponent={() => RepostsOnRepostsNotificationSettingsScreen}
        options={{
          title: title(msg`Reposts of your reposts notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="ActivityNotificationSettings"
        getComponent={() => ActivityNotificationSettingsScreen}
        options={{
          title: title(msg`Activity notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="MiscellaneousNotificationSettings"
        getComponent={() => MiscellaneousNotificationSettingsScreen}
        options={{
          title: title(msg`Miscellaneous notifications`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="ContentAndMediaSettings"
        getComponent={() => ContentAndMediaSettingsScreen}
        options={{
          title: title(msg`Content and Media`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="InterestsSettings"
        getComponent={() => InterestsSettingsScreen}
        options={{
          title: title(msg`Your interests`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="FollowedElementsSettings"
        getComponent={() => FollowedElementsSettingsScreen}
        options={{
          title: title(msg`Followed Elements`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AboutSettings"
        getComponent={() => AboutSettingsScreen}
        options={{
          title: title(msg`About`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="AppIconSettings"
        getComponent={() => AppIconSettingsScreen}
        options={{
          title: title(msg`App Icon`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="Hashtag"
        getComponent={() => HashtagScreen}
        options={{title: title(msg`Hashtag`)}}
      />
      <Stack.Screen
        name="FlairFeed"
        getComponent={() => FlairFeedScreen}
        options={{title: title(msg`Flair Feed`)}}
      />
      <Stack.Screen
        name="Topic"
        getComponent={() => TopicScreen}
        options={{title: title(msg`Topic`)}}
      />
      <Stack.Group screenLayout={renderMessagesSplitViewLayout}>
      <Stack.Screen
        name="Messages"
        getComponent={() => MessagesScreen}
        options={{title: title(msg`Messages`), requireAuth: true}}
/>
      <Stack.Screen
        name="MessagesConversation"
        getComponent={() => MessagesConversationScreen}
        options={{title: title(msg`Chat`), requireAuth: true}}
      />
      <Stack.Screen
        name="MessagesConversationSettings"
        getComponent={() => MessagesConversationSettingsScreen}
        options={{title: title(msg`Chat settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="AgentChat"
        getComponent={() => AgentChatScreen}
        options={{title: title(msg`Agent Chat`), requireAuth: true}}
      />
      <Stack.Screen
        name="CommunityAgentProfile"
        getComponent={() => CommunityAgentProfileScreen}
        options={{title: title(msg`Agent Profile`)}}
      />
      <Stack.Screen
        name="MessagesSettings"
        getComponent={() => MessagesSettingsScreen}
        options={{title: title(msg`Chat settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="MessagesInbox"
        getComponent={() => MessagesInboxScreen}
        options={{title: title(msg`Chat request inbox`), requireAuth: true}}
      />
      </Stack.Group>
      <Stack.Screen
        name="NotificationsActivityList"
        getComponent={() => NotificationsActivityListScreen}
        options={{title: title(msg`Notifications`), requireAuth: true}}
      />
      <Stack.Screen
        name="LegacyNotificationSettings"
        getComponent={() => LegacyNotificationSettingsScreen}
        options={{title: title(msg`Notification settings`), requireAuth: true}}
      />
      <Stack.Screen
        name="Feeds"
        getComponent={() => FeedsScreen}
        options={{title: title(msg`Feeds`)}}
      />
      <Stack.Screen
        name="PartyFeed"
        getComponent={() => PartyFeedScreen}
        options={{title: title(msg`Party feed`)}}
      />

      <Stack.Screen
        name="VideoFeed"
        getComponent={() => VideoFeed}
        options={{
          title: title(msg`Video Feed`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="Bookmarks"
        getComponent={() => BookmarksScreen}
        options={{
          title: title(msg`Saved Posts`),
          requireAuth: true,
        }}
      />
      <Stack.Screen
        name="FindContactsFlow"
        getComponent={() => FindContactsFlowScreen}
        options={{
          title: title(msg`Find Contacts`),
          requireAuth: true,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Memes"
        getComponent={() => MemesScreen}
        options={{title: title(msg`Memes`)}}
      />
      <Stack.Screen
        name="Documents"
        getComponent={() => DocumentsScreen}
        options={{title: title(msg`Documents`)}}
      />
      <Stack.Screen
        name="DiscourseAnalysis"
        getComponent={() => DiscourseAnalysisScreen}
        options={{title: title(msg`Discourse Analysis`)}}
      />
      <Stack.Screen
        name="VSScreenV2"
        getComponent={() => VSScreen}
        options={{title: title(msg`Comparison`)}}
      />
      <Stack.Screen
        name="RAQ"
        getComponent={() => RAQMenuScreen}
        options={{title: title(msg`RAQ Menu`)}}
      />
      <Stack.Screen
        name="RAQAssessment"
        getComponent={() => RAQAssessment}
        options={{title: title(msg`RAQ Assessment`)}}
      />
      <Stack.Screen
        name="ProposedRAQList"
        getComponent={() => ProposedRAQListScreen}
        options={{title: title(msg`Proposed RAQs`)}}
      />
      <Stack.Screen
        name="OpenQuestionsList"
        getComponent={() => OpenQuestionsListScreen}
        options={{title: title(msg`Open Questions`)}}
      />
      <Stack.Screen
        name="OpenQuestionThread"
        getComponent={() => OpenQuestionThreadScreen}
        options={{title: title(msg`Thread`)}}
      />
      <Stack.Screen
        name="AxesDiscoveryList"
        getComponent={() => AxesDiscoveryScreen}
        options={{title: title(msg`Axes Discovery`)}}
      />
      <Stack.Screen
        name="AxisDetail"
        getComponent={() => AxisDetailScreen}
        options={{title: title(msg`Axis Detail`)}}
      />
      <Stack.Screen
        name="RAQResults"
        getComponent={() => RAQResultsScreen}
        options={{title: title(msg`Results`)}}
      />
      <Stack.Screen
        name="CommunityRAQ"
        getComponent={() => CommunityRAQScreen}
        options={{title: title(msg`Community RAQ`)}}
      />
      <Stack.Screen
        name="CommunityVoters"
        getComponent={() => CommunityVotersScreen}
        options={{title: title(msg`Community Voters`)}}
      />
      <Stack.Screen
        name="CommunityRoles"
        getComponent={() => CommunityRolesScreen}
        options={{title: title(msg`Community Badges`)}}
      />
      <Stack.Screen
        name="Highlights"
        getComponent={() => HighlightsScreen}
        options={{title: title(msg`Highlights`)}}
      />
      <Stack.Screen
        name="SeeHighlightDetails"
        getComponent={() =>
          require('#/screens/Highlights/SeeHighlightDetailsScreen')
            .SeeHighlightDetailsScreen
        }
        options={{title: title(msg`Highlight Details`)}}
      />
      <Stack.Screen
        name="Map"
        getComponent={() => require('#/screens/Map/MapScreen').MapScreen}
        options={{title: title(msg`Map`)}}
      />
      <Stack.Screen
        name="DistrictProfile"
        getComponent={() =>
          require('#/screens/Map/DistrictProfileScreen').DistrictProfileScreen
        }
        options={{title: title(msg`District Profile`)}}
      />
      <Stack.Screen
        name="Compass"
        getComponent={() => CompassScreen}
        options={{title: title(msg`Political Compass`)}}
      />
      <Stack.Screen
        name="CommunityCivicTree"
        getComponent={() => CommunityCivicTreeScreen}
        options={{title: title(msg`Community Civic Tree`), requireAuth: true}}
      />
      <Stack.Screen
        name="CommunityDirectory"
        getComponent={() => CommunityDirectoryScreen}
        options={{title: title(msg`Community Directory`), requireAuth: true}}
      />
      <Stack.Screen
        name="CivicTree"
        getComponent={() => CivicTreeScreen}
        options={{title: title(msg`Personal Civic Tree`), requireAuth: true}}
      />
      <Stack.Screen
        name="CollectionDetail"
        getComponent={() => CollectionDetailScreen}
        options={{title: title(msg`Collection`), requireAuth: true}}
      />
      <Stack.Screen
        name="CabildeoList"
        getComponent={() => CabildeoListScreen}
        options={{title: title(msg`Lobbying`), requireAuth: true}}
      />
      <Stack.Screen
        name="CabildeoDetail"
        getComponent={() => CabildeoDetailScreen}
        options={{title: title(msg`Lobbying`), requireAuth: true}}
      />
      <Stack.Screen
        name="DelegateVote"
        getComponent={() => DelegateVoteScreen}
        options={{title: title(msg`Delegate Vote`), requireAuth: true}}
      />
      <Stack.Screen
        name="CreateCabildeo"
        getComponent={() => CreateCabildeoScreen}
        options={{title: title(msg`Create Lobbying`), requireAuth: true}}
      />
      <Stack.Screen
        name="CreatePosition"
        getComponent={() => CreatePositionScreen}
        options={{title: title(msg`Take Position`), requireAuth: true}}
      />
      <Stack.Screen
        name="Agora"
        getComponent={() => AgoraScreen}
        options={{title: title(msg`Agora`), requireAuth: true}}
      />
      <Stack.Screen
        name="ProposalDetail"
        getComponent={() => ProposalDetailScreen}
        options={{title: title(msg`Proposal`), requireAuth: true}}
      />
      <Stack.Screen
        name="MyWallet"
        getComponent={() => WalletScreen}
        options={{title: title(msg`My Wallet`), requireAuth: true}}
      />
      <Stack.Screen
        name="VerifyDashboard"
        getComponent={() => VerifyDashboardScreen}
        options={{title: title(msg`Verify Dashboard`), requireAuth: true}}
      />
      <Stack.Screen
        name="TrustedIssuers"
        getComponent={() => TrustedIssuersScreen}
        options={{title: title(msg`Trusted Issuers`), requireAuth: true}}
      />
      <Stack.Screen
        name="ConsentAudit"
        getComponent={() => ConsentAuditScreen}
        options={{title: title(msg`Consent Audit`), requireAuth: true}}
      />
      <Stack.Screen
        name="IdentityHub"
        getComponent={() => IdentityHubScreen}
        options={{title: title(msg`Identity & Wallet`), requireAuth: true}}
      />
      <Stack.Screen
        name="INEVerification"
        getComponent={() => INEVerificationScreen}
        options={{title: title(msg`INE Verification`), requireAuth: true}}
      />
    </>
  )
}

/**
 * The TabsNavigator is used by native mobile to represent the routes
 * in 3 distinct tab-stacks with a different root screen on each.
 */
function TabsNavigator({
  layout,
}: {
  layout?: React.ComponentProps<typeof Tab.Navigator>['layout']
}) {
  const {hasSession} = useSession()
  const {showLoggedOut} = useLoggedOutView()
  const tabBar = useCallback(
    (props: JSX.IntrinsicAttributes & BottomTabBarProps) =>
      hasSession && !showLoggedOut ? <BottomBar {...props} /> : null,
    [hasSession, showLoggedOut],
  )

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      backBehavior="initialRoute"
      screenOptions={{headerShown: false, lazy: true}}
      tabBar={tabBar}
      layout={layout}>
      <Tab.Screen name="HomeTab" getComponent={() => HomeTabNavigator} />
      <Tab.Screen name="SearchTab" getComponent={() => SearchTabNavigator} />
      <Tab.Screen name="DataTab" getComponent={() => DataTabNavigator} />
      <Tab.Screen
        name="NotificationsTab"
        getComponent={() => NotificationsTabNavigator}
      />
      <Tab.Screen
        name="MyProfileTab"
        getComponent={() => MyProfileTabNavigator}
      />
    </Tab.Navigator>
  )
}

export function RootNavigator() {
  const t = useTheme()
  return (
    <RootStack.Navigator
      screenOptions={{...screenOptions(t), headerShown: false}}
      initialRouteName="Tabs">
      <RootStack.Screen name="Tabs" component={TabsNavigator} />
      <RootStack.Screen
        name="CreatePost"
        getComponent={() => CreatePostScreen}
        options={{
          presentation: 'modal',
          title: 'Create Post',
          headerShown: false,
        }}
      />
    </RootStack.Navigator>
  )
}

function screenOptions(t: Theme) {
  return {
    fullScreenGestureEnabled: true,
    headerShown: false,
    contentStyle: t.atoms.bg,
  } as const
}

function HomeTabNavigator() {
  const t = useTheme()
  const blurredScrollEdgeEffect = IS_LIQUID_GLASS
    ? ({
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerBackVisible: false,
        scrollEdgeEffects: {
          top: 'soft',
        },
      } as const)
    : {}

  return (
    <HomeTab.Navigator screenOptions={screenOptions(t)} initialRouteName="Home">
      <HomeTab.Screen
        name="Home"
        getComponent={() => HomeScreen}
        options={blurredScrollEdgeEffect}
      />
      <HomeTab.Screen
        name="Start"
        getComponent={() => HomeScreen}
        options={blurredScrollEdgeEffect}
      />
      {commonScreens(HomeTab as typeof Flat)}
    </HomeTab.Navigator>
  )
}

function SearchTabNavigator() {
  const t = useTheme()
  return (
    <SearchTab.Navigator
      screenOptions={screenOptions(t)}
      initialRouteName="Search">
      <SearchTab.Screen name="Search" getComponent={() => SearchScreen} />
      {commonScreens(SearchTab as typeof Flat)}
    </SearchTab.Navigator>
  )
}

function NotificationsTabNavigator() {
  const t = useTheme()
  return (
    <NotificationsTab.Navigator
      screenOptions={screenOptions(t)}
      initialRouteName="Notifications">
      <NotificationsTab.Screen
        name="Notifications"
        getComponent={() => NotificationsScreen}
        options={{requireAuth: true}}
      />
      {commonScreens(NotificationsTab as typeof Flat)}
    </NotificationsTab.Navigator>
  )
}

function MyProfileTabNavigator() {
  const t = useTheme()
  return (
    <MyProfileTab.Navigator
      screenOptions={screenOptions(t)}
      initialRouteName="MyProfile">
      <MyProfileTab.Screen
        // MyProfile is not in AllNavigationParams - asserting as Profile at least
        // gives us typechecking for initialParams -sfn
        name={'MyProfile' as 'Profile'}
        getComponent={() => ProfileScreen}
        initialParams={{name: 'me', hideBackButton: true}}
      />
      {commonScreens(MyProfileTab as unknown as typeof Flat)}
    </MyProfileTab.Navigator>
  )
}

function DataTabNavigator() {
  const t = useTheme()
  return (
    <DataTab.Navigator screenOptions={screenOptions(t)} initialRouteName="Data">
      <DataTab.Screen name="Data" getComponent={() => DataScreen} />
      <DataTab.Screen
        name="MyBase"
        getComponent={() => MyBaseScreen}
        options={{title: 'My Base'}}
      />
      <DataTab.Screen
        name="MyCommunities"
        getComponent={() => MyCommunitiesScreen}
        options={{title: 'My Communities'}}
      />
      <DataTab.Screen
        name="MyRAQ"
        getComponent={() => MyRAQScreen}
        options={{title: 'My RAQ'}}
      />
      <DataTab.Screen
        name="MyAffiliations"
        getComponent={() => MyAffiliationsScreen}
        options={{title: 'My Affiliations'}}
      />
      <DataTab.Screen
        name="Communities"
        getComponent={() => CommunitiesScreen}
        options={{title: 'Communities'}}
      />
      <DataTab.Screen
        name="CreateCommunity"
        getComponent={() => CreateCommunityScreen}
        options={{title: 'Create Community'}}
      />
      <DataTab.Screen
        name="CommunityProfile"
        getComponent={() => CommunityProfileScreen}
        options={{title: 'Community'}}
      />
      <DataTab.Screen
        name="CommunityChat"
        getComponent={() => CommunityChatScreen}
        options={{title: 'Chat'}}
      />
      <DataTab.Screen
        name="CommunityMembers"
        getComponent={() => CommunityMembersScreen}
        options={{title: 'Members'}}
      />
      <DataTab.Screen
        name="ModeratorDashboard"
        getComponent={() => ModeratorDashboardScreen}
        options={{title: 'Moderation'}}
      />
      <DataTab.Screen
        name="PoliciesDashboard"
        getComponent={() => PoliciesDashboard}
        options={{title: 'Policies & Matters'}}
      />
      <DataTab.Screen
        name="PolicyDetails"
        getComponent={() => PolicyDetailsScreen}
        options={{title: 'Policy Details'}}
      />
      <DataTab.Screen
        name="Representatives"
        getComponent={() => RepresentativesScreen}
        options={{title: 'Representatives'}}
      />
      {commonScreens(DataTab as typeof Flat)}
    </DataTab.Navigator>
  )
}

/**
 * The FlatNavigator is used by Web to represent the routes
 * in a single ("flat") stack.
 */
const FlatNavigator = ({
  layout,
}: {
  layout?: React.ComponentProps<typeof Flat.Navigator>['layout']
}) => {
  const t = useTheme()
  const numUnread = useUnreadNotifications()
  const screenListeners = useWebScrollRestoration()
  const title = (page: MessageDescriptor) => bskyTitle(i18n._(page), numUnread)

  return (
    <Flat.Navigator
      layout={layout}
      screenListeners={screenListeners}
      screenOptions={screenOptions(t)}>
      <Flat.Screen
        name="Home"
        getComponent={() => HomeScreen}
        options={{title: title(msg`Parties`)}}
      />
      <Flat.Screen
        name="Search"
        getComponent={() => SearchScreen}
        options={{title: title(msg`Data`)}}
      />
      <Flat.Screen
        name="Notifications"
        getComponent={() => NotificationsScreen}
        options={{title: title(msg`Notifications`), requireAuth: true}}

/>
      <Flat.Screen
        name="Data"
        getComponent={() => DataScreen}
        options={{title: bskyTitle('Data', numUnread)}}
      />
      <Flat.Screen
        name="CreatePost"
        getComponent={() => CreatePostScreen}
        options={{title: title(msg`Create Post`)}}
      />
      <Flat.Screen
        name="MyBase"
        getComponent={() => MyBaseScreen}
        options={{title: title(msg`My Base`)}}
      />

      <Flat.Screen
        name="MyCommunities"
        getComponent={() => MyCommunitiesScreen}
        options={{title: title(msg`My Communities`)}}
      />
      <Flat.Screen
        name="MyRAQ"
        getComponent={() => MyRAQScreen}
        options={{title: title(msg`My RAQ`)}}
      />
      <Flat.Screen
        name="MyAffiliations"
        getComponent={() => MyAffiliationsScreen}
        options={{title: title(msg`My Affiliations`)}}
      />
      <Flat.Screen
        name="Communities"
        getComponent={() => CommunitiesScreen}
        options={{title: bskyTitle('Communities', numUnread)}}
      />
      <Flat.Screen
        name="CreateCommunity"
        getComponent={() => CreateCommunityScreen}
        options={{title: title(msg`Create Community`)}}
      />
      <Flat.Screen
        name="Start"
        getComponent={() => HomeScreen}
        options={{title: title(msg`Home`)}}
      />
      <Flat.Screen
        name="PoliciesDashboard"
        getComponent={() => PoliciesDashboard}
        options={{title: title(msg`Policies & Matters`)}}
      />
      <Flat.Screen
        name="Representatives"
        getComponent={() => RepresentativesScreen}
        options={{title: title(msg`Representatives`)}}
      />
      <Flat.Screen
        name="CommunityProfile"
        getComponent={() => CommunityProfileScreen}
        options={{title: title(msg`Community`)}}
      />
      <Flat.Screen
        name="CommunityChat"
        getComponent={() => CommunityChatScreen}
        options={{title: title(msg`Chat`)}}
      />
      <Flat.Screen
        name="CommunityMembers"
        getComponent={() => CommunityMembersScreen}
        options={{title: title(msg`Members`)}}
      />
      <Flat.Screen
        name="ModeratorDashboard"
        getComponent={() => ModeratorDashboardScreen}
        options={{title: title(msg`Moderation`)}}
      />
      <Flat.Screen
        name="PolicyDetails"
        getComponent={() => PolicyDetailsScreen}
        options={{title: title(msg`Policy Details`)}}
      />
      {commonScreens(Flat, numUnread)}
    </Flat.Navigator>
  )
}

/**
 * The RoutesContainer should wrap all components which need access
 * to the navigation context.
 */

const LINKING = {
  // TODO figure out what we are going to use
  // note: `bluesky://` is what is used in app.config.js
  prefixes: ['bsky://', 'bluesky://', 'https://bsky.app'],

  getPathFromState(state: State) {
    // find the current node in the navigation tree
    let node = state.routes[state.index || 0]
    while (node.state?.routes && typeof node.state?.index === 'number') {
      node = node.state?.routes[node.state?.index]
    }

    // build the path
    const route = router.matchName(node.name)
    if (typeof route === 'undefined') {
      return '/' // default to home
    }
    return route.build((node.params || {}) as RouteParams)
  },

  getStateFromPath(path: string) {
    const [name, params] = router.matchPath(path)

    // Any time we receive a url that starts with `intent/` we want to ignore it here. It will be handled in the
    // intent handler hook. We should check for the trailing slash, because if there isn't one then it isn't a valid
    // intent
    // On web, there is no route state that's created by default, so we should initialize it as the home route. On
    // native, since the home tab and the home screen are defined as initial routes, we don't need to return a state
    // since it will be created by react-navigation.
    if (path.includes('intent/')) {
      if (IS_NATIVE) return
      return buildStateObject('Flat', 'Home', params)
    }

    if (IS_NATIVE) {
      if (name === 'Search') {
        return buildStateObject('SearchTab', 'Search', params)
      }
      if (name === 'Notifications') {
        return buildStateObject('NotificationsTab', 'Notifications', params)
      }
      if (name === 'Home') {
        return buildStateObject('HomeTab', 'Home', params)
      }
      if (name === 'Data') {
        return buildStateObject('DataTab', 'Data', params)
      }
      // if the path is something else, like a post, profile, or even settings, we need to initialize the home tab as pre-existing state otherwise the back button will not work
      return buildStateObject('HomeTab', name, params, [
        {
          name: 'Home',
          params: {},
        },
      ])
    } else {
      const res = buildStateObject('Flat', name, params)
      return res
    }
  },
} satisfies LinkingOptions<AllNavigatorParams>

/**
 * Used to ensure we don't handle the same notification twice
 */
let lastHandledNotificationDateDedupe: number | undefined

function RoutesContainer({children}: React.PropsWithChildren<{}>) {
  const ax = useAnalytics()
  const notyLogger = ax.logger.useChild(ax.logger.Context.Notifications)
  const theme = useColorSchemeStyle(DefaultTheme, DarkTheme)
  const {currentAccount, accounts} = useSession()
  const {onPressSwitchAccount} = useAccountSwitcher()
  const {setShowLoggedOut} = useLoggedOutViewControls()
  const previousScreen = useRef<string | undefined>(undefined)
  const emailDialogControl = useEmailDialogControl()
  const closeAllActiveElements = useCloseAllActiveElements()

  /**
   * Handle navigation to a conversation, or prepares for account switch.
   *
   * Non-reactive because we need the latest data from some hooks
   * after an async call - sfn
   */
  const handleChatMessage = useNonReactiveCallback(
    (
      payload: Extract<
        NotificationPayload,
        {reason: 'chat-message' | 'chat-reaction'}
      >,
    ) => {
      notyLogger.debug(`handleChatMessage`, {payload})

      if (payload.recipientDid !== currentAccount?.did) {
        // handled in useNotificationHandler after account switch finishes
        storePayloadForAccountSwitch(payload)
        closeAllActiveElements()

        const account = accounts.find(a => a.did === payload.recipientDid)
        if (account) {
          onPressSwitchAccount(account, 'Notification')
        } else {
          setShowLoggedOut(true)
        }
      } else {
        // @ts-expect-error nested navigators aren't typed -sfn
        navigate('DataTab', {
          screen: 'Data',
          params: {},
        })
      }
    },
  )

  async function handlePushNotificationEntry() {
    if (!IS_NATIVE) return

    // deep links take precedence - on android,
    // getLastNotificationResponseAsync returns a "notification"
    // that is actually a deep link. avoid handling it twice -sfn
    if (await Linking.getInitialURL()) {
      return
    }

    /**
     * The notification that caused the app to open, if applicable
     */
    const response = await Notifications.getLastNotificationResponseAsync()

    if (response) {
      notyLogger.debug(`handlePushNotificationEntry: response`, {response})

      if (response.notification.date === lastHandledNotificationDateDedupe)
        return
      lastHandledNotificationDateDedupe = response.notification.date

      const payload = getNotificationPayload(response.notification)

      if (payload) {
        ax.metric('notifications:openApp', {
          reason: payload.reason,
          causedBoot: true,
        })

        if (payload.reason === 'chat-message') {
          handleChatMessage(payload)
        } else {
          const path = notificationToURL(payload)

          if (path === '/notifications') {
            resetToTab('NotificationsTab')
            notyLogger.debug(`handlePushNotificationEntry: default navigate`)
          } else if (path) {
            const [screen, params] = router.matchPath(path)
            // @ts-expect-error nested navigators aren't typed -sfn
            navigate('HomeTab', {screen, params})
            notyLogger.debug(`handlePushNotificationEntry: navigate`, {
              screen,
              params,
            })
          }
        }
      }
    }
  }

  const onNavigationReady = useCallOnce(() => {
    const currentScreen = getCurrentRouteName()
    setNavigationMetadata({
      previousScreen: currentScreen,
      currentScreen,
    })
    previousScreen.current = currentScreen

    handlePushNotificationEntry()

    ax.metric('router:navigate', {})

    if (currentAccount && shouldRequestEmailConfirmation(currentAccount)) {
      emailDialogControl.open({
        id: EmailDialogScreenID.VerificationReminder,
      })
      snoozeEmailConfirmationPrompt()
    }

    ax.metric('init', {
      initMs: Math.round(
        // @ts-ignore Emitted by Metro in the bundle prelude
        performance.now() - global.__BUNDLE_START_TIME__,
      ),
    })

    if (IS_WEB) {
      const referrerInfo = Referrer.getReferrerInfo()
      if (referrerInfo && referrerInfo.hostname !== 'bsky.app') {
        ax.metric('deepLink:referrerReceived', {
          to: window.location.href,
          referrer: referrerInfo?.referrer,
          hostname: referrerInfo?.hostname,
        })
      }
    }
  })

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={LINKING}
      theme={theme}
      onStateChange={() => {
        const currentScreen = getCurrentRouteName()
        // do this before metric
        setNavigationMetadata({
          previousScreen: previousScreen.current,
          currentScreen,
        })
        ax.metric('router:navigate', {from: previousScreen.current})
        previousScreen.current = currentScreen
      }}
      onReady={onNavigationReady}
      // WARNING: Implicit navigation to nested navigators is depreciated in React Navigation 7.x
      // However, there's a fair amount of places we do that, especially in when popping to the top of stacks.
      // See BottomBar.tsx for an example of how to handle nested navigators in the tabs correctly.
      // I'm scared of missing a spot (esp. with push notifications etc) so let's enable this legacy behaviour for now.
      // We will need to confirm we handle nested navigators correctly by the time we migrate to React Navigation 8.x
      // -sfn
      navigationInChildEnabled>
      {children}
    </NavigationContainer>
  )
}

function getCurrentRouteName() {
  if (navigationRef.isReady()) {
    return navigationRef.getCurrentRoute()?.name
  } else {
    return undefined
  }
}

/**
 * These helpers can be used from outside of the RoutesContainer
 * (eg in the state models).
 */

function navigate<K extends keyof AllNavigatorParams>(
  name: K,
  params?: AllNavigatorParams[K],
) {
  if (navigationRef.isReady()) {
    return Promise.race([
      new Promise<void>(resolve => {
        const handler = () => {
          resolve()
          navigationRef.removeListener('state', handler)
        }
        navigationRef.addListener('state', handler)

        // @ts-ignore I dont know what would make typescript happy but I have a life -prf
        navigationRef.navigate(name, params)
      }),
      timeout(1e3),
    ])
  }
  return Promise.resolve()
}

function resetToTab(
  tabName: 'HomeTab' | 'SearchTab' | 'DataTab' | 'NotificationsTab',
) {
  if (navigationRef.isReady()) {
    navigate(tabName)
    if (navigationRef.canGoBack()) {
      navigationRef.dispatch(StackActions.popToTop()) //we need to check .canGoBack() before calling it
    }
  }
}

// returns a promise that resolves after the state reset is complete
function reset(): Promise<void> {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{name: IS_NATIVE ? 'HomeTab' : 'Home'}],
      }),
    )
    return Promise.race([
      timeout(1e3),
      new Promise<void>(resolve => {
        const handler = () => {
          resolve()
          navigationRef.removeListener('state', handler)
        }
        navigationRef.addListener('state', handler)
      }),
    ])
  } else {
    return Promise.resolve()
  }
}

export {
  FlatNavigator,
  navigate,
  reset,
  resetToTab,
  RoutesContainer,
  TabsNavigator,
}
