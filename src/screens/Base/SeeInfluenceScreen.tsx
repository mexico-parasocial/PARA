import {useState} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {Text} from '#/view/com/util/text/Text'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {useTheme} from '#/alf'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRight} from '#/components/icons/Chevron'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfo} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'SeeInfluence'>

// Mock Data for MVP Frontend
const MOCK_PROXIES = [
  { did: 'did:plc:mock1', handle: 'alice.bsky.social', name: 'Alice Smith', power: 1, reason: 'Health & Science policy' },
  { did: 'did:plc:mock2', handle: 'bob.bsky.social', name: 'Bob Jones', power: 1, reason: 'Economic policy' },
]

const MOCK_CONSTITUENTS = [
  { did: 'did:plc:mock3', handle: 'carol.bsky.social', name: 'Carol Williams' },
  { did: 'did:plc:mock4', handle: 'dave.bsky.social', name: 'Dave Brown' },
  { did: 'did:plc:mock5', handle: 'eve.bsky.social', name: 'Eve Davis' },
]

export function SeeInfluenceScreen({route}: Props) {
  const t = useTheme()

  const hasProfileScope = !!route.params?.did

  const [activeTab, setActiveTab] = useState<'proxies' | 'constituents'>('constituents')

  // Total Influence = Base (1) + Constituents (3) = 4
  const totalInfluence = 1 + MOCK_CONSTITUENTS.length

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Command Center</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Content>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}>
          <View style={styles.screenIntro}>
            <Text style={[styles.screenTitle, t.atoms.text]}>
              <Trans>Delegation Dashboard</Trans>
            </Text>
            <Text style={[styles.screenSubtitle, t.atoms.text_contrast_medium]}>
              {hasProfileScope ? (
                <Trans>Influence data for this profile.</Trans>
              ) : (
                <Trans>Manage your liquid democracy proxies and track your influence.</Trans>
              )}
            </Text>
          </View>

          {/* Hero Metric */}
          <View
            style={[
              styles.heroCard,
              t.atoms.bg_contrast_25,
              {borderColor: t.palette.primary_500 + '40'},
            ]}>
            <View style={styles.heroContent}>
              <Text style={[styles.heroLabel, t.atoms.text_contrast_medium]}>
                <Trans>Total Influencia</Trans>
              </Text>
              <Text style={[styles.heroValue, {color: t.palette.primary_500}]}>
                {totalInfluence}x
              </Text>
              <Text style={[styles.heroSubtext, t.atoms.text_contrast_medium]}>
                <Trans>Base voice (1) + {MOCK_CONSTITUENTS.length} constituents</Trans>
              </Text>
            </View>
            <CircleInfo size="lg" style={{color: t.palette.primary_500, opacity: 0.8}} />
          </View>

          {/* Tabs */}
          <View style={[styles.tabs, t.atoms.bg_contrast_25]}>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.tab, activeTab === 'constituents' && styles.tabActive, activeTab === 'constituents' && {backgroundColor: t.palette.contrast_100}]}
              onPress={() => setActiveTab('constituents')}>
              <Text style={[styles.tabText, activeTab === 'constituents' ? t.atoms.text : t.atoms.text_contrast_medium]}>
                <Trans>Mis Constituyentes ({MOCK_CONSTITUENTS.length})</Trans>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button"
              style={[styles.tab, activeTab === 'proxies' && styles.tabActive, activeTab === 'proxies' && {backgroundColor: t.palette.contrast_100}]}
              onPress={() => setActiveTab('proxies')}>
              <Text style={[styles.tabText, activeTab === 'proxies' ? t.atoms.text : t.atoms.text_contrast_medium]}>
                <Trans>Mis Proxies ({MOCK_PROXIES.length})</Trans>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lists */}
          {activeTab === 'constituents' ? (
            <View style={styles.listContainer}>
              {MOCK_CONSTITUENTS.map((constituent, index) => (
                <View key={constituent.did} style={[styles.listItem, t.atoms.border_contrast_low, index === 0 && {borderTopWidth: 0}]}>
                  <UserAvatar type="user" avatar={undefined} size={40} />
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, t.atoms.text]}>{constituent.name}</Text>
                    <Text style={[styles.listHandle, t.atoms.text_contrast_medium]}>@{constituent.handle}</Text>
                  </View>
                  <View style={[styles.powerBadge, {backgroundColor: t.palette.primary_500 + '20'}]}>
                    <Text style={[styles.powerBadgeText, {color: t.palette.primary_500}]}>+1x</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {MOCK_PROXIES.map((proxy, index) => (
                <View key={proxy.did} style={[styles.listItem, t.atoms.border_contrast_low, index === 0 && {borderTopWidth: 0}]}>
                  <UserAvatar type="user" avatar={undefined} size={40} />
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, t.atoms.text]}>{proxy.name}</Text>
                    <Text style={[styles.listHandle, t.atoms.text_contrast_medium]}>@{proxy.handle}</Text>
                    <Text style={[styles.listReason, t.atoms.text_contrast_high]}>{proxy.reason}</Text>
                  </View>
                  <TouchableOpacity accessibilityRole="button" style={styles.manageBtn}>
                    <Text style={[styles.manageBtnText, {color: t.palette.primary_500}]}>Manage</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity accessibilityRole="button" style={[styles.addProxyBtn, t.atoms.bg_contrast_25, {borderColor: t.palette.contrast_100}]}>
                <Text style={[styles.addProxyText, t.atoms.text]}>
                  <Trans>Find new Proxy...</Trans>
                </Text>
                <ChevronRight size="sm" style={t.atoms.text_contrast_medium} />
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  screenIntro: {
    marginBottom: 20,
    gap: 4,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  heroContent: {
    gap: 4,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 52,
  },
  heroSubtext: {
    fontSize: 13,
  },
  tabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    gap: 0,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '700',
  },
  listHandle: {
    fontSize: 14,
    marginTop: 2,
  },
  listReason: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  powerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  powerBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  manageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addProxyBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 12,
  },
  addProxyText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
