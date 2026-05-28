import {TouchableOpacity, View} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {useNavigation} from '@react-navigation/native'

import {makeProfileLink} from '#/lib/routes/links'
import {type NavigationProp} from '#/lib/routes/types'
import {type Shadow} from '#/state/cache/types'
import {formatCount} from '#/view/com/util/numeric/format'
import {atoms as a, useTheme} from '#/alf'
import {Influence_Stroke_Icon as InfluenceIcon} from '#/components/icons/Influence'
import {RaisingHand4Finger_Stroke2_Corner2_Rounded as VoteIcon} from '#/components/icons/RaisingHand'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'

export function ProfileHeaderMetrics({
  profile,
}: {
  profile: Shadow<AppBskyActorDefs.ProfileViewDetailed>
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const following = formatCount(i18n, profile.followsCount || 0)
  const followers = formatCount(i18n, profile.followersCount || 0)
  const pluralizedFollowers = plural(profile.followersCount || 0, {
    one: 'follower',
    other: 'followers',
  })
  const pluralizedFollowings = plural(profile.followsCount || 0, {
    one: 'following',
    other: 'following',
  })

  return (
    <View style={[a.flex_col, a.gap_xs]}>
      <View
        style={[a.flex_row, a.gap_sm, a.align_center]}
        pointerEvents="box-none">
        <InlineLinkText
          testID="profileHeaderFollowersButton"
          style={[a.flex_row, t.atoms.text]}
          to={makeProfileLink(profile, 'followers')}
          label={`${profile.followersCount || 0} ${pluralizedFollowers}`}>
          <Text style={[a.font_semi_bold, a.text_md]}>{followers} </Text>
          <Text style={[t.atoms.text_contrast_medium, a.text_md]}>
            {pluralizedFollowers}
          </Text>
        </InlineLinkText>
        <InlineLinkText
          testID="profileHeaderFollowsButton"
          style={[a.flex_row, t.atoms.text]}
          to={makeProfileLink(profile, 'follows')}
          label={_(msg`${profile.followsCount || 0} following`)}>
          <Text style={[a.font_semi_bold, a.text_md]}>{following} </Text>
          <Text style={[t.atoms.text_contrast_medium, a.text_md]}>
            {pluralizedFollowings}
          </Text>
        </InlineLinkText>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`View posts`)}
          accessibilityHint={_(msg`Navigates to the posts history screen`)}
          onPress={() => navigation.navigate('SeePosts', {did: profile.did})}>
          <Text style={[a.font_semi_bold, t.atoms.text, a.text_md]}>
            {formatCount(i18n, profile.postsCount || 0)}{' '}
            <Text
              style={[t.atoms.text_contrast_medium, a.font_normal, a.text_md]}>
              {plural(profile.postsCount || 0, {one: 'post', other: 'posts'})}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={[a.flex_row, a.gap_md, a.align_center]}
        pointerEvents="box-none">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`View influence score`)}
          accessibilityHint={_(msg`Navigates to the influence score details`)}
          style={[a.flex_row, a.align_center, a.gap_xs]}
          onPress={() =>
            navigation.navigate('SeeInfluence', {did: profile.did})
          }>
          <InfluenceIcon size="md" style={[t.atoms.text, {top: 3}]} />
          <Text style={[a.font_semi_bold, t.atoms.text, a.text_md]}>
            {formatCount(i18n, (profile as {influenceScore?: number}).influenceScore || 0)}{' '}
            <Text
              style={[t.atoms.text_contrast_medium, a.font_normal, a.text_md]}>
              influence
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={_(msg`View votes history`)}
          accessibilityHint={_(msg`Navigates to the voting history screen`)}
          style={[a.flex_row, a.align_center, a.gap_xs]}
          onPress={() => navigation.navigate('SeeVotes', {did: profile.did})}>
          <VoteIcon size="md" style={[t.atoms.text]} />
          <Text style={[a.font_semi_bold, t.atoms.text, a.text_md]}>
            {formatCount(i18n, (profile as {votesCount?: number}).votesCount || 0)}{' '}
            <Text
              style={[t.atoms.text_contrast_medium, a.font_normal, a.text_md]}>
              votes
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
