import {type ComponentProps, memo, type ReactElement, useCallback} from 'react'
import {
  Linking,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {plural} from '@lingui/core/macro'
import {Plural, Trans, useLingui} from '@lingui/react/macro'
import {
  StackActions,
  useNavigation,
  useNavigationState,
} from '@react-navigation/native'

import {useActorStatus} from '#/lib/actor-status'
import {FEEDBACK_FORM_URL, HELP_DESK_URL} from '#/lib/constants'
import {useNavigationTabState} from '#/lib/hooks/useNavigationTabState'
import {getCurrentRoute, getTabState, TabState} from '#/lib/routes/helpers'
import {type SharedNavTab, TAB_TO_NAV_ITEM} from '#/lib/routes/tab-to-nav-item'
import {type NavigationProp} from '#/lib/routes/types'
import {sanitizeHandle} from '#/lib/strings/handles'
import {useTotalChatUnread} from '#/state/chat/useTotalChatUnread'
import {emitSoftReset} from '#/state/events'
import {useUnreadNotifications} from '#/state/queries/notifications/unread'
import {useProfileQuery} from '#/state/queries/profile'
import {type SessionAccount, useSession} from '#/state/session'
import {useSetDrawerOpen} from '#/state/shell'
import {formatCount} from '#/view/com/util/numeric/format'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {useLogoVariant} from '#/view/icons/useLogoVariant'
import {NavSignupCard} from '#/view/shell/NavSignupCard'
import {atoms as a, tokens, useTheme, web} from '#/alf'
import {BetaTag} from '#/components/BetaTag'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {useDialogControl} from '#/components/Dialog'
import {Divider} from '#/components/Divider'
import {ArrowShareRight_Stroke2_Corner2_Rounded as ArrowShareRightIcon} from '#/components/icons/ArrowShareRight'
import {
  Atom_Filled_Corner0_Rounded as AtomFilled,
  Atom_Stroke2_Corner0_Rounded as AtomIcon,
} from '#/components/icons/Atom'
import {
  Book_Filled_Corner0_Rounded as BookFilled,
  Book_Stroke2_Corner0_Rounded as Book,
} from '#/components/icons/Base'
import {
  Bell_Filled_Corner0_Rounded as BellFilled,
  Bell_Stroke2_Corner0_Rounded as Bell,
} from '#/components/icons/Bell'
import {Bookmark, BookmarkFilled} from '#/components/icons/Bookmark'
import {BulletList_Stroke2_Corner0_Rounded as List} from '#/components/icons/BulletList'
import {
  CommunityIcon_Filled as CommunityFilled,
  CommunityIcon_Stroke as Community,
} from '#/components/icons/Community'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Earth_Stroke2_Corner0_Rounded as EarthIcon} from '#/components/icons/Earth'
import {
  Hashtag_Filled_Corner0_Rounded as HashtagFilled,
  Hashtag_Stroke2_Corner0_Rounded as Hashtag,
} from '#/components/icons/Hashtag'
import {
  HomeOpen_Filled_Corner0_Rounded as HomeFilled,
  HomeOpen_Stoke2_Corner0_Rounded as Home,
} from '#/components/icons/HomeOpen'
import {Key_Stroke2_Corner2_Rounded as Key} from '#/components/icons/Key'
import {
  Library_Filled_Corner0_Rounded as LibraryFilled,
  Library_Stroke2_Corner0_Rounded as Library,
} from '#/components/icons/Library'
import {
  MagnifyingGlass_Filled_Stroke2_Corner0_Rounded as MagnifyingGlassFilled,
  MagnifyingGlass_Stroke2_Corner0_Rounded as MagnifyingGlass,
} from '#/components/icons/MagnifyingGlass'
import {
  Message_Stroke2_Corner0_Rounded as Message,
  Message_Stroke2_Corner0_Rounded_Filled as MessageFilled,
} from '#/components/icons/Message'
import {SettingsGear2_Stroke2_Corner0_Rounded as Settings} from '#/components/icons/Settings'
import {Shapes_Stroke2_Corner0_Rounded as Shapes} from '#/components/icons/Shapes'
import {Tree_Stroke2_Corner0_Rounded as Tree} from '#/components/icons/Tree'
import {
  UserCircle_Filled_Corner0_Rounded as UserCircleFilled,
  UserCircle_Stroke2_Corner0_Rounded as UserCircle,
} from '#/components/icons/UserCircle'
import {InlineLinkText} from '#/components/Link'
import {OTAChannelNotice} from '#/components/OTAChannelNotice'
import {ProfileBadges} from '#/components/ProfileBadges'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_NATIVE, IS_WEB} from '#/env'
import {InviteFriendsDialog} from '#/features/inviteFriends'

const iconWidth = 26
type SecondarySidebarTab =
  'Atmosphere' | 'Feeds' | 'Lists' | 'Bookmarks' | 'Settings'
const SECONDARY_TAB_ROUTES: Record<
  SecondarySidebarTab,
  'AtmosphereTab' | 'FeedsTab' | 'ListsTab' | 'BookmarksTab' | 'SettingsTab'
> = {
  Atmosphere: 'AtmosphereTab',
  Feeds: 'FeedsTab',
  Lists: 'ListsTab',
  Bookmarks: 'BookmarksTab',
  Settings: 'SettingsTab',
}

let DrawerProfileCard = ({
  account,
  onPressProfile,
  onPressShare,
}: {
  account: SessionAccount
  onPressProfile: () => void
  onPressShare?: () => void
}): React.ReactNode => {
  const {t: l, i18n} = useLingui()
  const t = useTheme()
  const {data: profile} = useProfileQuery({did: account.did})
  const {isActive: live} = useActorStatus(profile)

  return (
    <TouchableOpacity
      testID="profileCardButton"
      accessibilityLabel={l`Profile`}
      accessibilityHint={l`Navigates to your profile`}
      onPress={onPressProfile}
      style={[a.gap_sm, a.pr_lg]}>
      <UserAvatar
        size={52}
        avatar={profile?.avatar}
        // See https://github.com/pararepo/PARA/pull/1801:
        usePlainRNImage={true}
        type={profile?.associated?.labeler ? 'labeler' : 'user'}
        live={live}
      />
      <View style={[a.gap_2xs]}>
        <View style={[a.flex_row, a.align_center, a.gap_xs, a.flex_1]}>
          <Text
            emoji
            style={[
              a.font_bold,
              a.text_xl,
              a.mt_2xs,
              a.leading_tight,
              a.flex_shrink,
            ]}
            numberOfLines={1}>
            {profile?.displayName || account.handle}
          </Text>
          {profile && <ProfileBadges profile={profile} size="lg" />}
          {onPressShare && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={l`Invite friends`}
              accessibilityHint={l`Opens the invite friends sheet to share your profile`}
              onPress={onPressShare}
              hitSlop={8}
              style={({pressed}) => [
                a.ml_auto,
                a.align_center,
                a.justify_center,
                a.rounded_full,
                t.atoms.bg_contrast_50,
                {width: 32, height: 32, opacity: pressed ? 0.7 : 1},
              ]}>
              <ArrowShareRightIcon
                width={16}
                height={16}
                fill={t.palette.primary_500}
              />
            </Pressable>
          )}
        </View>
        <Text
          emoji
          style={[t.atoms.text_contrast_medium, a.text_md, a.leading_tight]}
          numberOfLines={1}>
          {sanitizeHandle(account.handle, '@')}
        </Text>
      </View>
      <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
        <Trans>
          <Text style={[a.text_md, a.font_semi_bold]}>
            {formatCount(i18n, profile?.followersCount ?? 0)}
          </Text>{' '}
          <Plural
            value={profile?.followersCount || 0}
            one="follower"
            other="followers"
          />
        </Trans>{' '}
        &middot;{' '}
        <Trans>
          <Text style={[a.text_md, a.font_semi_bold]}>
            {formatCount(i18n, profile?.followsCount ?? 0)}
          </Text>{' '}
          <Plural
            value={profile?.followsCount || 0}
            one="following"
            other="following"
          />
        </Trans>
      </Text>
    </TouchableOpacity>
  )
}
DrawerProfileCard = memo(DrawerProfileCard)
export {DrawerProfileCard}

let DrawerContent = ({}: React.PropsWithoutRef<{}>): React.ReactNode => {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const setDrawerOpen = useSetDrawerOpen()
  const navigation = useNavigation<NavigationProp>()
  const {
    isAtHome,
    isAtSearch,
    isAtAtmosphere,
    isAtFeeds,
    isAtBookmarks,
    isAtNotifications,
    isAtMyProfile,
    isAtData,
    isAtMessages,
    isAtCommunities,
  } = useNavigationTabState()
  const currentRoute = useNavigationState(state =>
    state ? getCurrentRoute(state) : {name: 'Home'},
  )
  const isAtAgora =
    currentRoute.name === 'Agora' ||
    currentRoute.name === 'ProposalDetail' ||
    currentRoute.name === 'CabildeoList' ||
    currentRoute.name === 'CabildeoDetail' ||
    currentRoute.name === 'DelegateVote' ||
    currentRoute.name === 'CreateCabildeo' ||
    currentRoute.name === 'CreatePosition'
  const isAtCivicTree = currentRoute.name === 'CivicTree'
  const isAtDeliberation = currentRoute.name === 'CommunityCivicTree'
  const isAtMyBase = currentRoute.name === 'MyBase'
  const isAtCompass = currentRoute.name === 'Compass'
  const isAtIdentityHub =
    currentRoute.name === 'IdentityHub' ||
    currentRoute.name === 'MyWallet' ||
    currentRoute.name === 'TrustedIssuers' ||
    currentRoute.name === 'ConsentAudit'
  const {hasSession, currentAccount} = useSession()
  const ax = useAnalytics()
  const inviteFriendsControl = useDialogControl()
  const isAtmosphereExploreEnabled = ax.features.enabled(
    ax.features.AtmosphereExploreEnable,
  )

  // events
  // =

  const onPressTab = useCallback(
    (tab: SharedNavTab, surface: 'drawer' | 'drawerHeader' = 'drawer') => {
      ax.metric('nav:click', {
        item: TAB_TO_NAV_ITEM[tab],
        surface,
      })
      const state = navigation.getState()
      setDrawerOpen(false)
      if (IS_WEB) {
        // hack because we have flat navigator for web and MyProfile does not exist on the web navigator -ansh
        if (tab === 'MyProfile') {
          navigation.navigate('Profile', {name: currentAccount!.handle})
        } else {
          // @ts-expect-error struggles with string unions, apparently
          navigation.navigate(tab)
        }
      } else {
        const tabState = getTabState(state, tab)
        if (tabState === TabState.InsideAtRoot) {
          emitSoftReset()
        } else if (tabState === TabState.Inside) {
          // find the correct navigator in which to pop-to-top
          const target = state.routes.find(route => route.name === `${tab}Tab`)
            ?.state?.key
          if (target) {
            // if we found it, trigger pop-to-top
            navigation.dispatch({
              ...StackActions.popToTop(),
              target,
            })
          } else {
            // fallback: reset navigation
            navigation.reset({
              index: 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              routes: [{name: `${tab}Tab` as any}],
            })
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          navigation.navigate(`${tab}Tab` as any)
        }
      }
    },
    [navigation, setDrawerOpen, currentAccount, ax],
  )

  const onPressHome = useCallback(() => onPressTab('Home'), [onPressTab])

  const onPressSearch = useCallback(() => onPressTab('Search'), [onPressTab])

  const onPressMessages = useCallback(() => {
    onPressTab('Messages')
  }, [onPressTab])

  const onPressNotifications = useCallback(
    () => onPressTab('Notifications'),
    [onPressTab],
  )

  const onPressProfile = useCallback(() => {
    onPressTab('MyProfile')
  }, [onPressTab])

  const onPressDrawerHeaderProfile = useCallback(() => {
    onPressTab('MyProfile', 'drawerHeader')
  }, [onPressTab])

  const navigateToSecondaryTab = useCallback(
    (tab: SecondarySidebarTab) => {
      const state = navigation.getState()
      const tabState = getTabState(state, tab)
      const routeName = SECONDARY_TAB_ROUTES[tab]
      if (tabState === TabState.InsideAtRoot) {
        emitSoftReset()
      } else if (tabState === TabState.Inside) {
        const target = state.routes.find(route => route.name === routeName)
          ?.state?.key
        if (target) {
          navigation.dispatch({
            ...StackActions.popToTop(),
            target,
          })
        } else {
          navigation.reset({index: 0, routes: [{name: routeName}]})
        }
      } else {
        navigation.navigate(routeName)
      }
      setDrawerOpen(false)
    },
    [navigation, setDrawerOpen],
  )

  const onPressMyFeeds = useCallback(() => {
    ax.metric('nav:click', {item: 'feeds', surface: 'drawer'})
    if (IS_WEB) navigation.navigate('Feeds')
    else navigateToSecondaryTab('Feeds')
    if (IS_WEB) setDrawerOpen(false)
  }, [navigation, navigateToSecondaryTab, setDrawerOpen, ax])

  const onPressAtmosphere = useCallback(() => {
    ax.metric('nav:click', {item: 'atmosphere', surface: 'drawer'})
    if (IS_WEB) navigation.navigate('Atmosphere')
    else navigateToSecondaryTab('Atmosphere')
    if (IS_WEB) setDrawerOpen(false)
  }, [navigation, navigateToSecondaryTab, setDrawerOpen, ax])

  const onPressLists = useCallback(() => {
    ax.metric('nav:click', {item: 'lists', surface: 'drawer'})
    if (IS_WEB) navigation.navigate('Lists')
    else navigateToSecondaryTab('Lists')
    if (IS_WEB) setDrawerOpen(false)
  }, [navigation, navigateToSecondaryTab, setDrawerOpen, ax])

  const onPressBookmarks = useCallback(() => {
    ax.metric('nav:click', {item: 'saved', surface: 'drawer'})
    if (IS_WEB) navigation.navigate('Bookmarks')
    else navigateToSecondaryTab('Bookmarks')
    if (IS_WEB) setDrawerOpen(false)
  }, [navigation, navigateToSecondaryTab, setDrawerOpen, ax])

  const onPressSettings = useCallback(() => {
    ax.metric('nav:click', {item: 'settings', surface: 'drawer'})
    if (IS_WEB) navigation.navigate('Settings')
    else navigateToSecondaryTab('Settings')
    if (IS_WEB) setDrawerOpen(false)
  }, [navigation, navigateToSecondaryTab, setDrawerOpen, ax])

  const onPressCommunities = useCallback(() => {
    ax.metric('nav:click', {item: 'communities', surface: 'drawer'})
    if (IS_WEB) {
      navigation.navigate('Communities')
      setDrawerOpen(false)
      return
    }

    setDrawerOpen(false)
    const state = navigation.getState()
    const tabState = getTabState(state, 'Data')
    if (tabState === TabState.InsideAtRoot || tabState === TabState.Inside) {
      // Already in DataTab — push Communities onto the existing stack
      navigation.navigate('Communities')
    } else {
      // Switch to DataTab first, then push Communities so Data stays in the stack
      navigation.navigate('DataTab')
      navigation.navigate('Communities')
    }
  }, [navigation, setDrawerOpen, ax])

  const onPressCompass = useCallback(() => {
    ax.metric('nav:click', {item: 'compass', surface: 'drawer'})
    navigation.navigate('Compass')
    setDrawerOpen(false)
  }, [navigation, setDrawerOpen, ax])

  const onPressAgora = useCallback(() => {
    navigation.navigate('Agora')
    setDrawerOpen(false)
  }, [navigation, setDrawerOpen])

  const onPressDeliberation = useCallback(() => {
    navigation.navigate('CommunityCivicTree')
    setDrawerOpen(false)
  }, [navigation, setDrawerOpen])

  const onPressData = useCallback(() => {
    if (IS_WEB) {
      navigation.navigate('Data')
      setDrawerOpen(false)
    } else {
      const state = navigation.getState()
      setDrawerOpen(false)
      const tabState = getTabState(state, 'Data')
      if (tabState === TabState.InsideAtRoot) {
        emitSoftReset()
      } else if (tabState === TabState.Inside) {
        const target = state.routes.find(route => route.name === 'DataTab')
          ?.state?.key
        if (target) {
          navigation.dispatch({
            ...StackActions.popToTop(),
            target,
          })
        } else {
          navigation.reset({
            index: 0,
            routes: [{name: 'DataTab'}],
          })
        }
      } else {
        /*
         * The Data tab also hosts drawer destinations that are pushed onto its
         * stack (Communities, My Base, Civic Tree), so it is often left deep.
         * Target the Data screen explicitly instead of letting the tab restore
         * whatever was last open there.
         */
        navigation.navigate('DataTab', {screen: 'Data'} as never)
      }
    }
  }, [navigation, setDrawerOpen])

  const onPressMyBase = useCallback(() => {
    ax.metric('nav:click', {item: 'myBase', surface: 'drawer'})
    setDrawerOpen(false)
    navigation.navigate('DataTab', {screen: 'MyBase'} as never)
  }, [ax, navigation, setDrawerOpen])

  const onPressCivicTree = useCallback(() => {
    setDrawerOpen(false)
    navigation.navigate('DataTab', {screen: 'CivicTree'} as never)
  }, [navigation, setDrawerOpen])

  const onPressIdentityHub = useCallback(() => {
    setDrawerOpen(false)
    navigation.navigate('IdentityHub')
  }, [navigation, setDrawerOpen])

  const onPressFeedback = useCallback(() => {
    void Linking.openURL(
      FEEDBACK_FORM_URL({
        email: currentAccount?.email,
        handle: currentAccount?.handle,
      }),
    )
  }, [currentAccount])

  const onPressHelp = useCallback(() => {
    void Linking.openURL(HELP_DESK_URL)
  }, [])

  // rendering
  // =

  return (
    <View
      testID="drawer"
      style={[a.flex_1, a.border_r, t.atoms.bg, t.atoms.border_contrast_low]}>
      <ScrollView
        style={[a.flex_1]}
        contentContainerStyle={[
          {
            paddingTop: Math.max(
              insets.top + a.pt_xl.paddingTop,
              a.pt_xl.paddingTop,
            ),
          },
        ]}>
        <View style={[a.px_xl]}>
          {hasSession && currentAccount ? (
            <DrawerProfileCard
              account={currentAccount}
              onPressProfile={onPressDrawerHeaderProfile}
              onPressShare={
                IS_NATIVE
                  ? () => {
                      ax.metric('invite:dialog:open', {logContext: 'Drawer'})
                      setDrawerOpen(false)
                      inviteFriendsControl.open()
                    }
                  : undefined
              }
            />
          ) : (
            <View style={[a.pr_xl]}>
              <NavSignupCard />
            </View>
          )}

          <OTAChannelNotice style={[a.mt_lg]} />

          <Divider style={[a.mt_xl, a.mb_sm]} />
        </View>

        {hasSession ? (
          <>
            <SearchMenuItem isActive={isAtSearch} onPress={onPressSearch} />
            <HomeMenuItem isActive={isAtHome} onPress={onPressHome} />
            <ChatMenuItem isActive={isAtMessages} onPress={onPressMessages} />
            <NotificationsMenuItem
              isActive={isAtNotifications}
              onPress={onPressNotifications}
            />
            {isAtmosphereExploreEnabled && (
              <AtmosphereMenuItem
                isActive={isAtAtmosphere}
                onPress={onPressAtmosphere}
              />
            )}
            <FeedsMenuItem isActive={isAtFeeds} onPress={onPressMyFeeds} />
            <CompassMenuItem isActive={isAtCompass} onPress={onPressCompass} />
            <BaseMenuItem isActive={isAtData} onPress={onPressData} />
            <MyBaseMenuItem isActive={isAtMyBase} onPress={onPressMyBase} />
            <CivicTreeMenuItem
              isActive={isAtCivicTree}
              onPress={onPressCivicTree}
            />
            <IdentityHubMenuItem
              isActive={isAtIdentityHub}
              onPress={onPressIdentityHub}
            />
            <CommunitiesMenuItem
              isActive={isAtCommunities}
              onPress={onPressCommunities}
            />
            <AgoraMenuItem isActive={isAtAgora} onPress={onPressAgora} />
            <DeliberationMenuItem
              isActive={isAtDeliberation}
              onPress={onPressDeliberation}
            />
            <ListsMenuItem onPress={onPressLists} />
            <BookmarksMenuItem
              isActive={isAtBookmarks}
              onPress={onPressBookmarks}
            />
            <ProfileMenuItem
              isActive={isAtMyProfile}
              onPress={onPressProfile}
            />
            <SettingsMenuItem onPress={onPressSettings} />
          </>
        ) : (
          <>
            <HomeMenuItem isActive={isAtHome} onPress={onPressHome} />
            <FeedsMenuItem isActive={isAtFeeds} onPress={onPressMyFeeds} />
            <CompassMenuItem isActive={isAtCompass} onPress={onPressCompass} />
            <SearchMenuItem isActive={isAtSearch} onPress={onPressSearch} />
          </>
        )}

        <View style={[a.px_xl]}>
          <Divider style={[a.mb_xl, a.mt_sm]} />
          <ExtraLinks />
        </View>
      </ScrollView>

      <DrawerFooter
        onPressFeedback={onPressFeedback}
        onPressHelp={onPressHelp}
      />
      <InviteFriendsDialog control={inviteFriendsControl} />
    </View>
  )
}
DrawerContent = memo(DrawerContent)
export {DrawerContent}

let DrawerFooter = ({
  onPressFeedback,
  onPressHelp,
}: {
  onPressFeedback: () => void
  onPressHelp: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        a.flex_row,
        a.gap_sm,
        a.flex_wrap,
        a.pl_xl,
        a.pt_md,
        {
          paddingBottom: Math.max(
            insets.bottom + tokens.space.xs,
            tokens.space.xl,
          ),
        },
      ]}>
      <Button
        label={l`Send feedback`}
        size="small"
        variant="solid"
        color="secondary"
        onPress={onPressFeedback}>
        <ButtonIcon icon={Message} position="left" />
        <ButtonText>
          <Trans>Feedback</Trans>
        </ButtonText>
      </Button>
      <Button
        label={l`Get help`}
        size="small"
        variant="outline"
        color="secondary"
        onPress={onPressHelp}
        style={{
          backgroundColor: 'transparent',
        }}>
        <ButtonText>
          <Trans>Help</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}
DrawerFooter = memo(DrawerFooter)

interface MenuItemProps extends Omit<
  ComponentProps<typeof Button>,
  'children'
> {
  icon: ReactElement
  label: string
  accessibilityHint?: string
  count?: string
  bold?: boolean
  beta?: boolean
  onPress: () => void
}

let SearchMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <MagnifyingGlassFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <MagnifyingGlass style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Explore`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
SearchMenuItem = memo(SearchMenuItem)

function AtmosphereMenuItem({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}) {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={<EarthIcon style={[t.atoms.text]} width={iconWidth} />}
      label={l`Atmosphere`}
      beta
      bold={isActive}
      onPress={onPress}
    />
  )
}

let HomeMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <HomeFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Home style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Home`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
HomeMenuItem = memo(HomeMenuItem)

let ChatMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  const {numUnread} = useTotalChatUnread()
  return (
    <MenuItem
      icon={
        isActive ? (
          <MessageFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Message style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Chat`}
      bold={isActive}
      onPress={onPress}
      count={numUnread}
    />
  )
}
ChatMenuItem = memo(ChatMenuItem)

let NotificationsMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  const numUnreadNotifications = useUnreadNotifications()
  return (
    <MenuItem
      icon={
        isActive ? (
          <BellFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Bell style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Notifications`}
      accessibilityHint={
        numUnreadNotifications === ''
          ? ''
          : plural(numUnreadNotifications ?? 0, {
              one: '# unread item',
              other: '# unread items',
            })
      }
      count={numUnreadNotifications}
      bold={isActive}
      onPress={onPress}
    />
  )
}
NotificationsMenuItem = memo(NotificationsMenuItem)

let FeedsMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <HashtagFilled width={iconWidth} style={[t.atoms.text]} />
        ) : (
          <Hashtag width={iconWidth} style={[t.atoms.text]} />
        )
      }
      label={l`Feeds`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
FeedsMenuItem = memo(FeedsMenuItem)

let CompassMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={<CompassIcon width={iconWidth} style={[t.atoms.text]} />}
      label={l`Political Compass`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
CompassMenuItem = memo(CompassMenuItem)

let ListsMenuItem = ({onPress}: {onPress: () => void}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()

  return (
    <MenuItem
      icon={<List style={[t.atoms.text]} width={iconWidth} />}
      label={l`Lists`}
      onPress={onPress}
    />
  )
}
ListsMenuItem = memo(ListsMenuItem)

let BookmarksMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()

  return (
    <MenuItem
      icon={
        isActive ? (
          <BookmarkFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Bookmark style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l({message: 'Saved', context: 'link to bookmarks screen'})}
      onPress={onPress}
    />
  )
}
BookmarksMenuItem = memo(BookmarksMenuItem)

let ProfileMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <UserCircleFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <UserCircle style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Profile`}
      onPress={onPress}
    />
  )
}
ProfileMenuItem = memo(ProfileMenuItem)

let SettingsMenuItem = ({onPress}: {onPress: () => void}): React.ReactNode => {
  const {t: l} = useLingui()
  const t = useTheme()
  return (
    <MenuItem
      icon={<Settings style={[t.atoms.text]} width={iconWidth} />}
      label={l`Settings`}
      onPress={onPress}
    />
  )
}
SettingsMenuItem = memo(SettingsMenuItem)

let CommunitiesMenuItem = ({
  isActive, // Add this prop
  onPress,
}: {
  isActive: boolean // Add this type
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  return (
    <MenuItem
      icon={
        isActive ? (
          <CommunityFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Community style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label="Communities"
      bold={isActive} // Add bold state
      onPress={onPress}
    />
  )
}
CommunitiesMenuItem = memo(CommunitiesMenuItem)

let AgoraMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={
        isActive ? (
          <LibraryFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Library style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Agora`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
AgoraMenuItem = memo(AgoraMenuItem)

let DeliberationMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={<Shapes style={[t.atoms.text]} width={iconWidth} />}
      label={l`Community Tree`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
DeliberationMenuItem = memo(DeliberationMenuItem)

let BaseMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={
        isActive ? (
          <BookFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <Book style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`Data`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
BaseMenuItem = memo(BaseMenuItem)

let MyBaseMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={
        isActive ? (
          <AtomFilled style={[t.atoms.text]} width={iconWidth} />
        ) : (
          <AtomIcon style={[t.atoms.text]} width={iconWidth} />
        )
      }
      label={l`My Base`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
MyBaseMenuItem = memo(MyBaseMenuItem)

let CivicTreeMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={<Tree style={[t.atoms.text]} width={iconWidth} />}
      label={l`Personal Civic Tree`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
CivicTreeMenuItem = memo(CivicTreeMenuItem)

let IdentityHubMenuItem = ({
  isActive,
  onPress,
}: {
  isActive: boolean
  onPress: () => void
}): React.ReactNode => {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <MenuItem
      icon={<Key style={[t.atoms.text]} width={iconWidth} />}
      label={l`Identity & Wallet`}
      bold={isActive}
      onPress={onPress}
    />
  )
}
IdentityHubMenuItem = memo(IdentityHubMenuItem)

function MenuItem({
  icon,
  label,
  count,
  bold,
  beta,
  onPress,
  accessibilityHint,
  ...props
}: MenuItemProps) {
  const t = useTheme()
  const {t: l} = useLingui()
  return (
    <Button
      {...props}
      testID={`menuItemButton-${label}`}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityHint={accessibilityHint}
      label={beta ? l`${label}, Beta` : label}>
      {({hovered, pressed}) => (
        <View
          style={[
            a.flex_1,
            a.flex_row,
            a.align_center,
            a.gap_md,
            a.py_md,
            a.px_xl,
            (hovered || pressed) && t.atoms.bg_contrast_25,
          ]}>
          <View style={[a.relative]}>
            {icon}
            {count ? (
              <View
                style={[
                  a.absolute,
                  a.inset_0,
                  a.align_end,
                  {top: -4, right: a.gap_sm.gap * -1},
                ]}>
                <View
                  style={[
                    a.rounded_full,
                    {
                      right: count.length === 1 ? 6 : 0,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      backgroundColor: t.palette.primary_500,
                    },
                  ]}>
                  <Text
                    style={[
                      a.text_xs,
                      a.leading_tight,
                      a.font_semi_bold,
                      {
                        fontVariant: ['tabular-nums'],
                        color: t.palette.white,
                      },
                    ]}
                    numberOfLines={1}>
                    {count}
                  </Text>
                </View>
              </View>
            ) : undefined}
          </View>
          <View style={[a.flex_1, a.flex_row, a.align_center, a.gap_sm]}>
            <Text
              style={[
                a.flex_shrink,
                a.text_2xl,
                bold && a.font_bold,
                web(a.leading_snug),
              ]}
              numberOfLines={1}>
              {label}
            </Text>
            {beta && <BetaTag />}
          </View>
        </View>
      )}
    </Button>
  )
}

function ExtraLinks() {
  const {t: l} = useLingui()
  const t = useTheme()
  const logoVariant = useLogoVariant()

  return (
    <View style={[a.flex_col, a.gap_md, a.flex_wrap]}>
      <InlineLinkText
        style={[a.text_md]}
        label={l`Terms of Service`}
        to="https://bsky.social/about/support/tos">
        <Trans>Terms of Service</Trans>
      </InlineLinkText>
      <InlineLinkText
        style={[a.text_md]}
        to="https://bsky.social/about/support/privacy-policy"
        label={l`Privacy Policy`}>
        <Trans>Privacy Policy</Trans>
      </InlineLinkText>
      {logoVariant === 'kawaii' && (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>
            Logo by{' '}
            <InlineLinkText
              style={[a.text_md]}
              to="/profile/sawaratsuki.bsky.social"
              label="@sawaratsuki.bsky.social">
              @sawaratsuki.bsky.social
            </InlineLinkText>
          </Trans>
        </Text>
      )}
    </View>
  )
}
