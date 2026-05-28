import {useCallback, useMemo, useState} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {COMMUNITY_AXES, RAQ_AXES as RAQ_DATA} from '#/lib/mock-data'
import {type NavigationProp} from '#/lib/routes/types'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {Button} from '#/components/Button'
import * as Layout from '#/components/Layout'

export default function AxesDiscoveryScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const navState = navigation.getState()
  const routeParams = navState?.routes.find(r => r.name === 'AxesDiscoveryList')?.params as
    | {initialTab?: 'official' | 'unofficial'}
    | undefined
  const initialTab = routeParams?.initialTab
  const [activeTab, setActiveTab] = useState<'official' | 'unofficial'>(
    initialTab === 'unofficial' ? 'unofficial' : 'official',
  )

  const renderAxisCard = useCallback(
    (
      item: (typeof RAQ_DATA)[0] | (typeof COMMUNITY_AXES)[0],
      isOfficial: boolean,
    ) => {
      // Formatting similar to RAQMenu
      let displayTitle = ''
      let metadata = null

      if (isOfficial) {
        // Official Item (from RAQ_DATA)
        const typedItem = item as (typeof RAQ_DATA)[0]
        displayTitle = typedItem.title
          .replace(/^\d+\.\s*/, '')
          .toLowerCase()
          .replace(/^\w/, c => c.toUpperCase())
      } else {
        // Unofficial Item (from COMMUNITY_AXES)
        const typedItem = item as (typeof COMMUNITY_AXES)[0]
        displayTitle = typedItem.name
        metadata = `${typedItem.votes} votes`
      }

      return (
        <TouchableOpacity
          accessibilityRole="button"
          key={item.id}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AxisDetail', {axisId: item.id})}
          style={[
            styles.card,
            t.atoms.bg_contrast_25,
            {
              paddingVertical: 14,
              paddingLeft: 16,
              paddingRight: 10,
              borderRadius: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            },
          ]}>
          <View style={{flex: 1, marginRight: 8}}>
            <Text
              style={[t.atoms.text, {fontWeight: '600', fontSize: 16}]}
              numberOfLines={1}>
              {displayTitle}
            </Text>
            {metadata && (
              <Text style={[t.atoms.text_contrast_medium, {fontSize: 12}]}>
                {metadata}
              </Text>
            )}
          </View>
          <Text style={[t.atoms.text_contrast_medium]}>›</Text>
        </TouchableOpacity>
      )
    },
    [t],
  )

  const displayedContent = useMemo(() => {
    if (activeTab === 'official') {
      return (
        <View style={{gap: 12}}>
          {RAQ_DATA.map(axis => renderAxisCard(axis, true))}
        </View>
      )
    } else {
      return (
        <View style={{gap: 12}}>
          {COMMUNITY_AXES.map(axis => renderAxisCard(axis, false))}
        </View>
      )
    }
  }, [activeTab, renderAxisCard])

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

      <Layout.Center>
        <View
          style={[t.atoms.bg, {paddingVertical: 12, paddingHorizontal: 16}]}>
          <View style={[styles.tabContainer, t.atoms.bg_contrast_25]}>
            <Button
              label={_(msg`Official axes`)}
              onPress={() => setActiveTab('official')}
              style={[
                styles.tabButton,
                activeTab === 'official' && [
                  t.atoms.bg,
                  styles.activeTab,
                  {shadowColor: t.palette.black, shadowOpacity: 0.1},
                ],
              ]}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'official'
                    ? [t.atoms.text, {fontWeight: '600'}]
                    : t.atoms.text_contrast_medium,
                ]}>
                <Trans>Official</Trans>
              </Text>
            </Button>
            <Button
              label={_(msg`Unofficial axes`)}
              onPress={() => setActiveTab('unofficial')}
              style={[
                styles.tabButton,
                activeTab === 'unofficial' && [
                  t.atoms.bg,
                  styles.activeTab,
                  {shadowColor: t.palette.black, shadowOpacity: 0.1},
                ],
              ]}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'unofficial'
                    ? [t.atoms.text, {fontWeight: '600'}]
                    : t.atoms.text_contrast_medium,
                ]}>
                <Trans>Unofficial</Trans>
              </Text>
            </Button>
          </View>
        </View>
      </Layout.Center>

      <Layout.Content contentContainerStyle={styles.container}>
        {displayedContent}
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    // border removed to match slim style, relying on bg contrast
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    shadowOffset: {width: 0, height: 1},
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
  },
})
