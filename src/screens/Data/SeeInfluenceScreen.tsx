import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {useInfluenceQuery} from '#/state/queries/influence'
import {useSession} from '#/state/session'
import {formatCount} from '#/view/com/util/numeric/format'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Influence_Stroke_Icon as InfluenceIcon} from '#/components/icons/Influence'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SeeInfluence'>

export function SeeInfluenceScreen({route}: Props) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const {currentAccount} = useSession()
  const did = route.params?.did ?? currentAccount?.did
  const influence = useInfluenceQuery(did)
  const canSeeInfluence =
    influence.data?.influenceVisible === true || currentAccount?.did === did

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Influence</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <ScrollView contentContainerStyle={[a.p_lg, a.gap_lg]}>
          <View
            style={[a.p_lg, a.rounded_md, a.gap_md, t.atoms.bg_contrast_25]}>
            <View style={[a.flex_row, a.align_center, a.gap_sm]}>
              <InfluenceIcon size="lg" style={t.atoms.text} />
              <Text style={[a.text_lg, a.font_semi_bold]}>
                <Trans>Global Influence</Trans>
              </Text>
            </View>
            {influence.isError || !did ? (
              <>
                <Text>
                  <Trans>Unable to load Influence</Trans>
                </Text>
                <Button
                  label={_(msg`Retry`)}
                  onPress={() => influence.refetch()}
                  color="primary"
                  size="small">
                  <ButtonText>
                    <Trans>Retry</Trans>
                  </ButtonText>
                </Button>
              </>
            ) : !influence.data ? (
              <Loader size="lg" />
            ) : canSeeInfluence ? (
              <Text style={[a.text_4xl, a.font_bold]}>
                {formatCount(i18n, influence.data.stats.influence)}
              </Text>
            ) : (
              <Text>
                <Trans>This profile has hidden its Influence score.</Trans>
              </Text>
            )}
            <Text
              style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>
                Your Influence is the total upvotes received minus downvotes
                across your posts, replies, and proposed questions over time.
                Each upvote adds one and each downvote subtracts one.
              </Trans>
            </Text>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>
                Changed or removed votes update the total. You can show or hide
                your score in Account Settings.
              </Trans>
            </Text>
          </View>
        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}
