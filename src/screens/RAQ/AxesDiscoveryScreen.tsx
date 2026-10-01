import {useEffect, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type RouteProp, useNavigation, useRoute} from '@react-navigation/native'

import {RAQ_AXES} from '#/lib/mock-data'
import {
  type CommonNavigatorParams,
  type NavigationProp,
} from '#/lib/routes/types'
import {useCommunityAxes} from '#/state/queries/useCommunityAxes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {QueryStatus} from './components/QueryStatus'
import {axisTitle} from './raq-utils'

export default function AxesDiscoveryScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route =
    useRoute<RouteProp<CommonNavigatorParams, 'AxesDiscoveryList'>>()
  const initialTab = route.params?.initialTab ?? 'official'
  const [tab, setTab] = useState(initialTab)
  useEffect(() => setTab(initialTab), [initialTab])
  const axes = useCommunityAxes()
  const displayed =
    tab === 'official'
      ? RAQ_AXES.map(axis => ({id: axis.id, name: axisTitle(axis.id)}))
      : axes.data
  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Axes Discovery</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>
      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={{padding: 16, paddingBottom: 100, gap: 16}}>
          <View style={[a.flex_row, a.gap_sm]}>
            {(['official', 'unofficial'] as const).map(value => (
              <Button
                key={value}
                label={
                  value === 'official'
                    ? _(msg`Official axes`)
                    : _(msg`Unofficial axes`)
                }
                accessibilityState={{selected: tab === value}}
                onPress={() => setTab(value)}
                size="large"
                variant="solid"
                color={tab === value ? 'primary' : 'secondary'}
                style={a.flex_1}>
                <ButtonText>
                  {value === 'official' ? _(msg`Official`) : _(msg`Unofficial`)}
                </ButtonText>
              </Button>
            ))}
          </View>
          {tab === 'unofficial' && (
            <>
              <Text style={t.atoms.text_contrast_medium}>
                <Trans>
                  Axis targets from submitted proposals. These are not official
                  questionnaire axes.
                </Trans>
              </Text>
              <QueryStatus
                loading={axes.isLoading}
                error={axes.isError}
                empty={!displayed.length}
                emptyMessageText={<Trans>No proposed axes yet</Trans>}
                retry={axes.refresh}
                refreshing={axes.isRefetching}
              />
            </>
          )}
          {displayed.map(axis => (
            <Button
              key={axis.id}
              label={axis.name}
              onPress={() =>
                navigation.navigate('AxisDetail', {axisId: axis.id})
              }
              style={[a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
              <ButtonText>{axis.name}</ButtonText>
            </Button>
          ))}
          {tab === 'unofficial' && axes.hasNextPage && (
            <Button
              label={_(msg`Load more`)}
              onPress={() => void axes.fetchNextPage()}
              disabled={axes.isFetching}
              size="large"
              variant="solid"
              color="secondary">
              <ButtonText>
                <Trans>Load more</Trans>
              </ButtonText>
            </Button>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}
