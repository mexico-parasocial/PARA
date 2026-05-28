import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {logEvent} from '#/lib/statsig/statsig'
import {
  useAutoplayDisabled,
  useSetAutoplayDisabled,
  useSetShowAuthorInsignias,
  useSetShowPartyShields,
  useShowAuthorInsignias,
  useShowPartyShields,
} from '#/state/preferences'
import {
  useInAppBrowser,
  useSetInAppBrowser,
} from '#/state/preferences/in-app-browser'
import {
  useTrendingSettings,
  useTrendingSettingsApi,
} from '#/state/preferences/trending'
import {useTrendingConfig} from '#/state/service-config'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import * as Toggle from '#/components/forms/Toggle'
import {Bubbles_Stroke2_Corner2_Rounded as BubblesIcon} from '#/components/icons/Bubble'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {Home_Stroke2_Corner2_Rounded as HomeIcon} from '#/components/icons/Home'
import {Macintosh_Stroke2_Corner2_Rounded as MacintoshIcon} from '#/components/icons/Macintosh'
import {Person_Stroke2_Corner0_Rounded as UserIcon} from '#/components/icons/Person'
import {Play_Stroke2_Corner2_Rounded as PlayIcon} from '#/components/icons/Play'
import {Trending2_Stroke2_Corner2_Rounded as Graph} from '#/components/icons/Trending'
import {Window_Stroke2_Corner2_Rounded as WindowIcon} from '#/components/icons/Window'
import * as Layout from '#/components/Layout'
import {IS_NATIVE} from '#/env'
import {LiveEventFeedsSettingsToggle} from '#/features/liveEvents/components/LiveEventFeedsSettingsToggle'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'ContentAndMediaSettings'
>
export function ContentAndMediaSettingsScreen({}: Props) {
  const {_} = useLingui()
  const showPartyShieldsPref = useShowPartyShields()
  const setShowPartyShieldsPref = useSetShowPartyShields()
  const showAuthorInsigniasPref = useShowAuthorInsignias()
  const setShowAuthorInsigniasPref = useSetShowAuthorInsignias()
  const autoplayDisabledPref = useAutoplayDisabled()
  const setAutoplayDisabledPref = useSetAutoplayDisabled()
  const inAppBrowserPref = useInAppBrowser()
  const setUseInAppBrowser = useSetInAppBrowser()
  const {enabled: trendingEnabled} = useTrendingConfig()
  const {trendingDisabled, trendingVideoDisabled} = useTrendingSettings()
  const {setTrendingDisabled, setTrendingVideoDisabled} =
    useTrendingSettingsApi()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Content & Media</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <SettingsList.Container>
          <SettingsList.LinkItem
            to="/settings/saved-feeds"
            label={_(msg`Manage saved feeds`)}>
            <SettingsList.ItemIcon icon={HashtagIcon} />
            <SettingsList.ItemText>
              <Trans>Manage saved feeds</Trans>
            </SettingsList.ItemText>
          </SettingsList.LinkItem>
          <SettingsList.LinkItem
            to="/settings/threads"
            label={_(msg`Thread preferences`)}>
            <SettingsList.ItemIcon icon={BubblesIcon} />
            <SettingsList.ItemText>
              <Trans>Thread preferences</Trans>
            </SettingsList.ItemText>
          </SettingsList.LinkItem>
          <SettingsList.LinkItem
            to="/settings/following-feed"
            label={_(msg`Following feed preferences`)}>
            <SettingsList.ItemIcon icon={HomeIcon} />
            <SettingsList.ItemText>
              <Trans>Following feed preferences</Trans>
            </SettingsList.ItemText>
          </SettingsList.LinkItem>
          <SettingsList.LinkItem
            to="/settings/external-embeds"
            label={_(msg`External media`)}>
            <SettingsList.ItemIcon icon={MacintoshIcon} />
            <SettingsList.ItemText>
              <Trans>External media</Trans>
            </SettingsList.ItemText>
          </SettingsList.LinkItem>
          <SettingsList.LinkItem
            to="/settings/interests"
            label={_(msg`Your interests`)}>
            <SettingsList.ItemIcon icon={CircleInfo} />
            <SettingsList.ItemText>
              <Trans>Your interests</Trans>
            </SettingsList.ItemText>
          </SettingsList.LinkItem>
          <SettingsList.Divider />
          {IS_NATIVE && (
            <Toggle.Item
              name="use_in_app_browser"
              label={_(msg`Use in-app browser to open links`)}
              value={inAppBrowserPref ?? false}
              onChange={value => setUseInAppBrowser(value)}>
              <SettingsList.Item>
                <SettingsList.ItemIcon icon={WindowIcon} />
                <SettingsList.ItemText>
                  <Trans>Use in-app browser to open links</Trans>
                </SettingsList.ItemText>
                <Toggle.Platform />
              </SettingsList.Item>
            </Toggle.Item>
          )}
          <Toggle.Item
            name="disable_autoplay"
            label={_(msg`Autoplay videos and GIFs`)}
            value={!autoplayDisabledPref}
            onChange={value => setAutoplayDisabledPref(!value)}>
            <SettingsList.Item>
              <SettingsList.ItemIcon icon={PlayIcon} />
              <SettingsList.ItemText>
                <Trans>Autoplay videos and GIFs</Trans>
              </SettingsList.ItemText>
              <Toggle.Platform />
            </SettingsList.Item>
          </Toggle.Item>
          <Toggle.Item
            name="show_party_shields"
            label={_(msg`Show party shields on posts`)}
            value={showPartyShieldsPref ?? true}
            onChange={value => setShowPartyShieldsPref(value)}>
            <SettingsList.Item>
              <SettingsList.ItemIcon icon={HashtagIcon} />
              <SettingsList.ItemText>
                <Trans>Show party shields on posts</Trans>
              </SettingsList.ItemText>
              <Toggle.Platform />
            </SettingsList.Item>
          </Toggle.Item>
          <Toggle.Item
            name="show_author_insignias"
            label={_(msg`Show official author insignia next to avatar`)}
            value={showAuthorInsigniasPref ?? true}
            onChange={value => setShowAuthorInsigniasPref(value)}>
            <SettingsList.Item>
              <SettingsList.ItemIcon icon={UserIcon} />
              <SettingsList.ItemText>
                <Trans>Show author insignia next to avatar</Trans>
              </SettingsList.ItemText>
              <Toggle.Platform />
            </SettingsList.Item>
          </Toggle.Item>
          {trendingEnabled ? (
            <>
              <SettingsList.Divider />
              <Toggle.Item
                name="show_trending_topics"
                label={_(msg`Enable trending topics`)}
                value={!trendingDisabled}
                onChange={value => {
                  const hide = Boolean(!value)
                  if (hide) {
                    logEvent('trendingTopics:hide', {context: 'settings'})
                  } else {
                    logEvent('trendingTopics:show', {context: 'settings'})
                  }
                  setTrendingDisabled(hide)
                }}>
                <SettingsList.Item>
                  <SettingsList.ItemIcon icon={Graph} />
                  <SettingsList.ItemText>
                    <Trans>Enable trending topics</Trans>
                  </SettingsList.ItemText>
                  <Toggle.Platform />
                </SettingsList.Item>
              </Toggle.Item>
              <LiveEventFeedsSettingsToggle />
              <Toggle.Item
                name="show_trending_videos"
                label={_(msg`Enable trending videos in your Discover feed`)}
                value={!trendingVideoDisabled}
                onChange={value => {
                  const hide = Boolean(!value)
                  if (hide) {
                    logEvent('trendingVideos:hide', {context: 'settings'})
                  } else {
                    logEvent('trendingVideos:show', {context: 'settings'})
                  }
                  setTrendingVideoDisabled(hide)
                }}>
                <SettingsList.Item>
                  <SettingsList.ItemIcon icon={Graph} />
                  <SettingsList.ItemText>
                    <Trans>Enable trending videos in your Discover feed</Trans>
                  </SettingsList.ItemText>
                  <Toggle.Platform />
                </SettingsList.Item>
              </Toggle.Item>
            </>
          ) : (
            <>
              <SettingsList.Divider />
              <LiveEventFeedsSettingsToggle />
            </>
          )}
        </SettingsList.Container>
      </Layout.Content>
    </Layout.Screen>
  )
}
