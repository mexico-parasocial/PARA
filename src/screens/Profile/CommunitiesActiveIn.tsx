import {View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'CommunitiesActiveIn'
>

export function CommunitiesActiveInScreen({route: _route}: Props) {
  const t = useTheme()
  const _navigation = useNavigation()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Communities Active In</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Content>
        <Layout.Center>
          <View style={[a.px_md, a.py_md, a.gap_md]}>
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>This user is active in the following communities:</Trans>
            </Text>
            <View
              style={[
                a.p_md,
                t.atoms.bg_contrast_25,
                a.rounded_sm,
                a.flex_row,
                a.gap_md,
                a.align_center,
              ]}>
              <UserAvatar size={40} avatar={undefined} type="user" />
              <View style={[a.flex_1]}>
                <Text style={[a.font_bold, a.text_lg]}>r/Politics</Text>
                <Text style={[t.atoms.text_contrast_medium]}>
                  High engagement in policy discussions.
                </Text>
              </View>
            </View>
            <View
              style={[
                a.p_md,
                t.atoms.bg_contrast_25,
                a.rounded_sm,
                a.flex_row,
                a.gap_md,
                a.align_center,
              ]}>
              <UserAvatar size={40} avatar={undefined} type="user" />
              <View style={[a.flex_1]}>
                <Text style={[a.font_bold, a.text_lg]}>r/Technology</Text>
                <Text style={[t.atoms.text_contrast_medium]}>
                  Frequent contributor to tech debates.
                </Text>
              </View>
            </View>
          </View>
        </Layout.Center>
      </Layout.Content>
    </Layout.Screen>
  )
}
