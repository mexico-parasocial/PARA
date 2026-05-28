import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {View} from 'react-native'
import {useDerivedValue, withSpring} from 'react-native-reanimated'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect, useIsFocused} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {useNonReactiveCallback} from '#/lib/hooks/useNonReactiveCallback'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {
  type NativeStackScreenProps,
  type NotificationsTabNavigatorParams,
} from '#/lib/routes/types'
import {logger} from '#/logger'
import {emitSoftReset, listenSoftReset} from '#/state/events'
import {RQKEY as NOTIFS_RQKEY} from '#/state/queries/notifications/feed'
import {useNotificationSettingsQuery} from '#/state/queries/notifications/settings'
import {
  useUnreadNotifications,
  useUnreadNotificationsApi,
} from '#/state/queries/notifications/unread'
import {truncateAndInvalidate} from '#/state/queries/util'
import {useMinimalShellMode} from '#/state/shell'
import {NotificationFeed} from '#/view/com/notifications/NotificationFeed'
import {Pager, type RenderTabBarFnProps} from '#/view/com/pager/Pager'
import {TabBar as NativeTabBar} from '#/view/com/pager/TabBar'
import {TabBar as WebTabBar} from '#/view/com/pager/TabBar.web'
import {FAB} from '#/view/com/util/fab/FAB'
import {type ListMethods} from '#/view/com/util/List'
import {LoadLatestBtn} from '#/view/com/util/load-latest/LoadLatestBtn'
import {MainScrollProvider} from '#/view/com/util/MainScrollProvider'
import {atoms as a, useTheme, web} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {ButtonIcon} from '#/components/Button'
import {EditBig_Stroke2_Corner2_Rounded as EditBigIcon} from '#/components/icons/EditBig'
import {Message_Stroke2_Corner0_Rounded as MessageIcon} from '#/components/icons/Message'
import {SettingsGear2_Stroke2_Corner0_Rounded as SettingsIcon} from '#/components/icons/SettingsGear2'
import * as Layout from '#/components/Layout'
import {InlineLinkText, Link} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {IS_NATIVE, IS_WEB} from '#/env'

// We don't currently persist this across reloads since
// you gotta visit All to clear the badge anyway.
// But let's at least persist it during the sesssion.
let lastActiveTab = 0

type Props = NativeStackScreenProps<
  NotificationsTabNavigatorParams,
  'Notifications'
>
export function NotificationsScreen({}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {openComposer} = useOpenComposer()
  const unreadNotifs = useUnreadNotifications()
  const hasNew = !!unreadNotifs
  const {checkUnread: checkUnreadAll} = useUnreadNotificationsApi()
  const [isLoadingAll, setIsLoadingAll] = useState(false)
  const [isLoadingMentions, setIsLoadingMentions] = useState(false)
  const initialActiveTab = lastActiveTab
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const isLoading = activeTab === 0 ? isLoadingAll : isLoadingMentions

  const onPageSelected = useCallback(
    (index: number) => {
      setActiveTab(index)
      lastActiveTab = index
    },
    [setActiveTab],
  )

  const queryClient = useQueryClient()
  const checkUnreadMentions = useCallback(
    async ({invalidate}: {invalidate: boolean}) => {
      if (invalidate) {
        return truncateAndInvalidate(queryClient, NOTIFS_RQKEY('mentions'))
      } else {
        // Background polling is not implemented for the mentions tab.
        // Just ignore it.
      }
    },
    [queryClient],
  )

  const sections = useMemo(() => {
    return [
      {
        title: _(msg`All`),
        component: (
          <NotificationsTab
            filter="all"
            isActive={activeTab === 0}
            isLoading={isLoadingAll}
            hasNew={hasNew}
            setIsLoadingLatest={setIsLoadingAll}
            checkUnread={checkUnreadAll}
          />
        ),
      },
      {
        title: _(msg`Mentions`),
        component: (
          <NotificationsTab
            filter="mentions"
            isActive={activeTab === 1}
            isLoading={isLoadingMentions}
            hasNew={false /* We don't know for sure */}
            setIsLoadingLatest={setIsLoadingMentions}
            checkUnread={checkUnreadMentions}
          />
        ),
      },
    ]
  }, [
    _,
    hasNew,
    checkUnreadAll,
    checkUnreadMentions,
    activeTab,
    isLoadingAll,
    isLoadingMentions,
  ])

  return (
    <Layout.Screen testID="notificationsScreen">
      <Layout.Header.Outer noBottomBorder sticky={false}>
        <Layout.Header.MenuButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Notifications</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <Link
            to={{screen: 'NotificationSettings'}}
            label={_(msg`Notification settings`)}
            size="small"
            variant="ghost"
            color="secondary"
            shape="round"
            style={[a.justify_center]}>
            <ButtonIcon icon={isLoading ? Loader : SettingsIcon} size="lg" />
          </Link>
        </Layout.Header.Slot>
      </Layout.Header.Outer>
      <Pager
        onPageSelected={onPageSelected}
        renderTabBar={props => (
          <Layout.Center style={[a.z_10, web([a.sticky, {top: 0}])]}>
            <View style={[a.flex_row, a.align_center, t.atoms.bg]}>
              <NotificationTabsWithChat
                props={props}
                allLabel={sections[0].title}
                mentionsLabel={sections[1].title}
              />
            </View>
          </Layout.Center>
        )}
        initialPage={initialActiveTab}>
        {sections.map((section, i) => (
          <View key={i}>{section.component}</View>
        ))}
      </Pager>
      <FAB
        testID="composeFAB"
        onPress={() => openComposer({})}
        icon={<EditBigIcon size="lg" fill={t.palette.white} />}
        accessibilityRole="button"
        accessibilityLabel={_(msg`New post`)}
        accessibilityHint=""
      />
    </Layout.Screen>
  )
}

function NotificationTabsWithChat({
  props,
  allLabel,
  mentionsLabel,
}: {
  props: RenderTabBarFnProps
  allLabel: string
  mentionsLabel: string
}) {
  const {_} = useLingui()

  const spacerLabel = useMemo(() => {
    return '\u2003\u2003\u2003'
  }, [])

  const dragProgress = useDerivedValue(() => {
    return props.dragProgress.value * 2
  })

  if (IS_WEB) {
    return (
      <View style={[a.flex_1, {position: 'relative'}]}>
        <WebTabBar
          selectedPage={props.selectedPage * 2}
          items={[allLabel, spacerLabel, mentionsLabel]}
          onSelect={index => {
            if (index === 0) props.onSelect?.(0)
            if (index === 2) props.onSelect?.(1)
          }}
          onPressSelected={index => {
            if (index === 0 || index === 2) {
              emitSoftReset()
            }
          }}
        />

        <View
          pointerEvents="box-none"
          style={[
            {
              position: 'absolute',
              left: 0,
              right: 0,
              top: 2,
              alignItems: 'center',
            },
          ]}>
          <Link
            to={{screen: 'Messages', params: {}}}
            label={_(msg`Chat`)}
            size="small"
            variant="solid"
            color="secondary"
            shape="round"
            style={[
              a.py_sm,
              {paddingHorizontal: 8, flexShrink: 0, minWidth: 81},
            ]}>
            <View
              style={[
                a.flex_row,
                a.align_center,
                a.justify_center,
                a.gap_sm,
                {flexShrink: 0, minHeight: 24},
              ]}>
              <View style={{transform: [{translateY: -1}, {translateX: 2}]}}>
                <ButtonIcon icon={MessageIcon} size="md" />
              </View>
              <Text
                emoji
                numberOfLines={1}
                style={[a.font_semi_bold, a.text_md]}>
                <Trans>Chat</Trans>
              </Text>
            </View>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <View style={[a.flex_1, {position: 'relative'}]}>
      <NativeTabBar
        {...props}
        selectedPage={props.selectedPage * 2}
        dragProgress={dragProgress}
        items={[allLabel, spacerLabel, mentionsLabel]}
        onSelect={index => {
          if (index === 0) props.onSelect?.(0)
          if (index === 2) props.onSelect?.(1)
        }}
        onPressSelected={index => {
          if (index === 0 || index === 2) {
            emitSoftReset()
          }
        }}
      />

      <View
        pointerEvents="box-none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: 2,
            alignItems: 'center',
          },
        ]}>
        <Link
          to={{screen: 'Messages', params: {}}}
          label={_(msg`Chat`)}
          size="small"
          variant="solid"
          color="secondary"
          shape="round"
          style={[
            a.py_sm,
            {paddingHorizontal: 8, flexShrink: 0, minWidth: 81},
          ]}>
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.justify_center,
              a.gap_sm,
              {flexShrink: 0, minHeight: 24},
            ]}>
            <View style={{transform: [{translateY: -1}, {translateX: 2}]}}>
              <ButtonIcon icon={MessageIcon} size="md" />
            </View>
            <Text emoji numberOfLines={1} style={[a.font_semi_bold, a.text_md]}>
              <Trans>Chat</Trans>
            </Text>
          </View>
        </Link>
      </View>
    </View>
  )
}

function NotificationsTab({
  filter,
  isActive,
  isLoading,
  hasNew,
  checkUnread,
  setIsLoadingLatest,
}: {
  filter: 'all' | 'mentions'
  isActive: boolean
  isLoading: boolean
  hasNew: boolean
  checkUnread: ({invalidate}: {invalidate: boolean}) => Promise<void>
  setIsLoadingLatest: (v: boolean) => void
}) {
  const {_} = useLingui()
  const scrollElRef = useRef<ListMethods>(null)
  const [isScrolledDown, setIsScrolledDown] = useState(false)
  const {headerMode} = useMinimalShellMode()
  const showHeader = useCallback(() => {
    'worklet'
    headerMode.set(withSpring(0, {overshootClamping: true}))
  }, [headerMode])
  const queryClient = useQueryClient()
  const isScreenFocused = useIsFocused()
  const isFocusedAndActive = isScreenFocused && isActive

  // event handlers
  // =
  const scrollToTop = useCallback(() => {
    scrollElRef.current?.scrollToOffset({animated: IS_NATIVE, offset: 0})
    showHeader()
  }, [scrollElRef, showHeader])

  const onPressLoadLatest = useCallback(() => {
    scrollToTop()
    if (hasNew) {
      // render what we have now
      truncateAndInvalidate(queryClient, NOTIFS_RQKEY(filter))
    } else if (!isLoading) {
      // check with the server
      setIsLoadingLatest(true)
      checkUnread({invalidate: true})
        .catch(() => undefined)
        .then(() => setIsLoadingLatest(false))
    }
  }, [
    scrollToTop,
    queryClient,
    checkUnread,
    hasNew,
    isLoading,
    setIsLoadingLatest,
    filter,
  ])

  const onFocusCheckLatest = useNonReactiveCallback(() => {
    // on focus, check for latest, but only invalidate if the user
    // isnt scrolled down to avoid moving content underneath them
    let currentIsScrolledDown
    if (IS_NATIVE) {
      currentIsScrolledDown = isScrolledDown
    } else {
      // On the web, this isn't always updated in time so
      // we're just going to look it up synchronously.
      currentIsScrolledDown = window.scrollY > 200
    }
    checkUnread({invalidate: !currentIsScrolledDown})
  })

  // on-visible setup
  // =
  useFocusEffect(
    useCallback(() => {
      if (isFocusedAndActive) {
        showHeader()
        logger.debug('NotificationsScreen: Focus')
        onFocusCheckLatest()
      }
    }, [showHeader, onFocusCheckLatest, isFocusedAndActive]),
  )

  useEffect(() => {
    if (!isFocusedAndActive) {
      return
    }
    return listenSoftReset(onPressLoadLatest)
  }, [onPressLoadLatest, isFocusedAndActive])

  return (
    <>
      <MainScrollProvider>
        <NotificationFeed
          enabled={isFocusedAndActive}
          filter={filter}
          refreshNotifications={() => checkUnread({invalidate: true})}
          onScrolledDownChange={setIsScrolledDown}
          scrollElRef={scrollElRef}
          ListHeaderComponent={
            filter === 'mentions' ? (
              <DisabledNotificationsWarning active={isFocusedAndActive} />
            ) : null
          }
        />
      </MainScrollProvider>
      {(isScrolledDown || hasNew) && (
        <LoadLatestBtn
          onPress={onPressLoadLatest}
          label={_(msg`Load new notifications`)}
          showIndicator={hasNew}
        />
      )}
    </>
  )
}

function DisabledNotificationsWarning({active}: {active: boolean}) {
  const t = useTheme()
  const {_} = useLingui()
  const {data} = useNotificationSettingsQuery({enabled: active})

  if (!data) return null

  if (!data.reply.list && !data.quote.list && !data.mention.list) {
    // mention tab notifications are disabled
    return (
      <View style={[a.py_md, a.px_lg, a.border_b, t.atoms.border_contrast_low]}>
        <Admonition type="warning">
          <Trans>
            You have completely disabled reply, quote, and mention
            notifications, so this tab will no longer update. To adjust this,
            visit your{' '}
            <InlineLinkText
              label={_(msg`Visit your notification settings`)}
              to={{screen: 'NotificationSettings'}}>
              notification settings
            </InlineLinkText>
            .
          </Trans>
        </Admonition>
      </View>
    )
  }

  return null
}
