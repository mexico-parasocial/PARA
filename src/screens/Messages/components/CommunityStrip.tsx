import {useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, platform, useTheme} from '#/alf'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronBottom,
  ChevronTop_Stroke2_Corner0_Rounded as ChevronTop,
} from '#/components/icons/Chevron'
import {Group3_Stroke2_Corner0_Rounded as GroupIcon} from '#/components/icons/Group'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {useIsWithinSplitView} from './splitView/context'

export type CommunityTile = {
  communityUri: string
  /** Empty until the bridge has a room; opening the chat creates the join. */
  roomId: string
  name: string
  unread: number
}

const TILE_WIDTH = 76
const AVATAR = 48

/**
 * The communities a member belongs to as one horizontally scrolling row, so
 * the list stays the same height whether they have five communities or fifty.
 * Each community's individual rooms live on the community chats screen.
 */
export function CommunityStrip({communities}: {communities: CommunityTile[]}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {isWithinLeftPanel} = useIsWithinSplitView()
  const action = isWithinLeftPanel ? 'navigate' : 'push'
  const [isMinimized, setIsMinimized] = useState(false)
  const totalUnread = communities.reduce((sum, c) => sum + c.unread, 0)

  return (
    <View style={{backgroundColor: t.palette.contrast_0}}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={
          isMinimized ? l`Expand communities` : l`Minimize communities`
        }
        accessibilityHint={l`Shows or hides your community list`}
        activeOpacity={0.7}
        onPress={() => setIsMinimized(!isMinimized)}
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.px_lg,
          a.pt_md,
          a.pb_xs,
        ]}>
        <Text
          style={[
            a.text_xs,
            a.font_semi_bold,
            t.atoms.text_contrast_medium,
            {textTransform: 'uppercase'},
          ]}>
          {l`Comunidades`}
        </Text>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          {isMinimized && totalUnread > 0 && (
            <View
              style={[
                a.align_center,
                a.justify_center,
                a.mr_sm,
                {
                  minWidth: 18,
                  height: 18,
                  borderRadius: 9,
                  paddingHorizontal: 5,
                  backgroundColor: t.palette.primary_500,
                },
              ]}>
              <Text style={[a.text_2xs, a.font_bold, {color: t.palette.white}]}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </Text>
            </View>
          )}
          {isMinimized ? (
            <ChevronBottom size="xs" style={t.atoms.text_contrast_medium} />
          ) : (
            <ChevronTop size="xs" style={t.atoms.text_contrast_medium} />
          )}
        </View>
      </TouchableOpacity>
      {!isMinimized && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={platform({web: true, default: false})}
          style={[{backgroundColor: t.palette.contrast_0}, a.flex_grow_0]}
          contentContainerStyle={[a.px_lg, a.py_sm, a.gap_sm]}>
          {communities.map(community => (
            <Link
              key={community.communityUri}
              to={`/messages/community/${encodeURIComponent(community.communityUri)}/chat`}
              action={action}
              label={community.name}
              accessibilityHint={l`Go to the community chat for ${community.name}`}
              onPress={() =>
                navigation.navigate('CommunityChat', {
                  communityUri: community.communityUri,
                  communityName: community.name,
                  roomId: community.roomId || undefined,
                })
              }>
              {({hovered, pressed, focused}) => (
                <View
                  style={[
                    a.align_center,
                    a.gap_xs,
                    a.rounded_md,
                    a.p_xs,
                    {width: TILE_WIDTH},
                    (hovered || pressed || focused) && t.atoms.bg_contrast_25,
                  ]}>
                  <View>
                    <View
                      style={[
                        a.align_center,
                        a.justify_center,
                        {
                          width: AVATAR,
                          height: AVATAR,
                          borderRadius: 14,
                          backgroundColor: t.palette.primary_500 + '20',
                        },
                      ]}>
                      <Text
                        style={[
                          a.text_xl,
                          a.font_bold,
                          {color: t.palette.primary_600},
                        ]}>
                        {community.name.trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    {community.unread > 0 && (
                      <View
                        style={[
                          a.absolute,
                          a.align_center,
                          a.justify_center,
                          {
                            top: -4,
                            right: -6,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            paddingHorizontal: 5,
                            backgroundColor: t.palette.primary_500,
                            borderWidth: 2,
                            borderColor: t.palette.contrast_0,
                          },
                        ]}>
                        <Text
                          style={[
                            a.text_2xs,
                            a.font_bold,
                            {color: t.palette.white},
                          ]}>
                          {community.unread > 99 ? '99+' : community.unread}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    emoji
                    numberOfLines={2}
                    style={[
                      a.text_xs,
                      a.text_center,
                      community.unread > 0 ? a.font_bold : a.font_medium,
                      t.atoms.text,
                    ]}>
                    {community.name}
                  </Text>
                </View>
              )}
            </Link>
          ))}

          <Link
            to="/community-chats"
            action={action}
            label={l`Chats de comunidades`}
            accessibilityHint={l`Shows every room of your communities`}
            onPress={() => navigation.navigate('CommunityChats')}>
            {({hovered, pressed, focused}) => (
              <View
                style={[
                  a.align_center,
                  a.gap_xs,
                  a.rounded_md,
                  a.p_xs,
                  {width: TILE_WIDTH},
                  (hovered || pressed || focused) && t.atoms.bg_contrast_25,
                ]}>
                <View
                  style={[
                    a.align_center,
                    a.justify_center,
                    {
                      width: AVATAR,
                      height: AVATAR,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: t.palette.contrast_300,
                    },
                  ]}>
                  <GroupIcon size="md" style={[t.atoms.text_contrast_medium]} />
                </View>
                <Text
                  numberOfLines={2}
                  style={[
                    a.text_xs,
                    a.text_center,
                    a.font_medium,
                    t.atoms.text_contrast_medium,
                  ]}>
                  {l`Ver todas`}
                </Text>
              </View>
            )}
          </Link>
        </ScrollView>
      )}
    </View>
  )
}
