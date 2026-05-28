import {View} from 'react-native'
import {RichText} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useHaptics} from '#/lib/haptics'
import {getPartyFeedProfile, type PartyFeedProfile} from '#/lib/party-feeds'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {shareUrl} from '#/lib/sharing'
import {toShareUrl} from '#/lib/strings/url-helpers'
import {type FeedSourceInfo} from '#/state/queries/feed'
import {type FeedParams} from '#/state/queries/post-feed'
import {FeedPage} from '#/view/com/feeds/FeedPage'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {ArrowOutOfBoxModified_Stroke2_Corner2_Rounded as Share} from '#/components/icons/ArrowOutOfBox'
import {DotGrid_Stroke2_Corner0_Rounded as Ellipsis} from '#/components/icons/DotGrid'
import * as Layout from '#/components/Layout'
import * as Menu from '#/components/Menu'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PartyFeed'>

export function PartyFeedScreen({route}: Props) {
  const t = useTheme()
  const profile = getPartyFeedProfile(route.params.partyId)

  if (!profile) {
    return (
      <Layout.Screen testID="partyFeedNotFoundScreen">
        <Layout.Center>
          <Layout.Header.Outer>
            <Layout.Header.BackButton />
            <Layout.Header.Content>
              <Layout.Header.TitleText>
                <Trans>Party feed</Trans>
              </Layout.Header.TitleText>
            </Layout.Header.Content>
          </Layout.Header.Outer>
          <View style={[a.p_lg]}>
            <Text style={[a.text_lg, a.font_semi_bold, t.atoms.text]}>
              <Trans>Party feed not found</Trans>
            </Text>
          </View>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return <PartyFeedScreenInner profile={profile} />
}

function PartyFeedScreenInner({profile}: {profile: PartyFeedProfile}) {
  const t = useTheme()
  const {_} = useLingui()
  const playHaptic = useHaptics()
  const feedInfo: FeedSourceInfo = {
    type: 'feed',
    uri: `para://party-feed/${profile.id}`,
    feedDescriptor: 'para-timeline',
    route: {
      href: `/feeds/party/${profile.id}`,
      name: 'PartyFeed',
      params: {partyId: profile.id},
    },
    cid: '',
    avatar: undefined,
    displayName: `${profile.name} feed`,
    description: new RichText({text: profile.description}),
    creatorDid: 'para',
    creatorHandle: 'para',
    likeCount: undefined,
    likeUri: undefined,
    contentMode: undefined,
  }
  const feedParams: FeedParams = {
    paraTimelineFilters: {party: profile.filter},
  }
  const onPressShare = () => {
    playHaptic()
    void shareUrl(toShareUrl(feedInfo.route.href))
  }

  return (
    <Layout.Screen testID="partyFeedScreen">
      <Layout.Center>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>{profile.name}</Layout.Header.TitleText>
          </Layout.Header.Content>
          <Layout.Header.Slot>
            <View style={[a.flex_row, a.align_center, a.gap_xs]}>
              <Menu.Root>
                <Menu.Trigger label={_(msg`Open feed options menu`)}>
                  {({props}) => (
                    <Button
                      {...props}
                      label={_(msg`Open feed options menu`)}
                      size="small"
                      variant="ghost"
                      shape="square"
                      color="secondary">
                      <ButtonIcon icon={Ellipsis} size="lg" />
                    </Button>
                  )}
                </Menu.Trigger>
                <Menu.Outer>
                  <Menu.Item label={_(msg`Share feed`)} onPress={onPressShare}>
                    <Menu.ItemText>{_(msg`Share feed`)}</Menu.ItemText>
                    <Menu.ItemIcon icon={Share} position="right" />
                  </Menu.Item>
                </Menu.Outer>
              </Menu.Root>
            </View>
          </Layout.Header.Slot>
        </Layout.Header.Outer>
        <View
          style={[
            a.px_lg,
            a.py_md,
            a.border_b,
            t.atoms.border_contrast_low,
            {borderTopColor: profile.color, borderTopWidth: 3},
          ]}>
          <View style={[a.flex_row, a.align_center, a.gap_md]}>
            <View
              style={[
                a.align_center,
                a.justify_center,
                {
                  width: 42,
                  height: 42,
                  borderRadius: 6,
                  backgroundColor: profile.color,
                },
              ]}>
              <Text style={[a.text_md, a.font_bold, {color: 'white'}]}>
                {profile.logo}
              </Text>
            </View>
            <View style={[a.flex_1, a.gap_xs]}>
              <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
                {profile.name} feed
              </Text>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                {profile.description}
              </Text>
            </View>
          </View>
        </View>
        <FeedPage
          testID={`partyFeed-${profile.id}`}
          feed="para-timeline"
          feedParams={feedParams}
          isPageFocused
          isPageAdjacent={false}
          feedInfo={feedInfo}
          renderEmptyState={() => <PartyFeedEmptyState name={profile.name} />}
        />
      </Layout.Center>
    </Layout.Screen>
  )
}

function PartyFeedEmptyState({name}: {name: string}) {
  const t = useTheme()
  return (
    <View style={[a.p_lg, a.gap_sm]}>
      <Text style={[a.text_lg, a.font_semi_bold, t.atoms.text]}>
        <Trans>No posts in this party feed yet</Trans>
      </Text>
      <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
        <Trans>New posts tagged with {name} will appear here.</Trans>
      </Text>
    </View>
  )
}
