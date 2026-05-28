import {useCallback, useState} from 'react'
import {StyleSheet, TouchableOpacity, View} from 'react-native'

import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Key_Stroke2_Corner2_Rounded as KeyIcon} from '#/components/icons/Key'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldCheckIcon} from '#/components/icons/Shield'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import AnonymousIdentitiesScreen from './AnonymousIdentitiesScreen'
import ConsentAuditScreen from './ConsentAuditScreen'
import TrustedIssuersScreen from './TrustedIssuersScreen'
import VerifyDashboardScreen from './VerifyDashboardScreen'
import WalletScreen from './WalletScreen'

type TabKey = 'wallet' | 'anon' | 'verify' | 'issuers' | 'audit'

const TABS: {
  key: TabKey
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>
}[] = [
  {key: 'wallet', label: 'Wallet', icon: LockIcon},
  {key: 'anon', label: 'Anon', icon: EyeSlashIcon},
  {key: 'verify', label: 'Verify', icon: ShieldCheckIcon},
  {key: 'issuers', label: 'Issuers', icon: KeyIcon},
  {key: 'audit', label: 'Audit', icon: ClockIcon},
]

export default function IdentityHubScreen() {
  const t = useTheme()
  const {gtMobile} = useBreakpoints()
  const [activeTab, setActiveTab] = useState<TabKey>('wallet')

  const renderTab = useCallback(
    (tab: TabKey) => {
      switch (tab) {
        case 'wallet':
          return <WalletScreen />
        case 'anon':
          return <AnonymousIdentitiesScreen />
        case 'verify':
          return <VerifyDashboardScreen />
        case 'issuers':
          return <TrustedIssuersScreen />
        case 'audit':
          return <ConsentAuditScreen />
      }
    },
    [],
  )

  return (
    <Layout.Screen>
      {/* Tab Bar */}
      <View
        style={[
          styles.tabBar,
          t.atoms.bg,
          {borderBottomColor: t.atoms.border_contrast_low.borderColor},
        ]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <TouchableOpacity
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{selected: isActive}}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tabButton,
                isActive && {
                  borderBottomColor: t.palette.primary_500,
                  borderBottomWidth: 2,
                },
              ]}>
              <tab.icon
                size={gtMobile ? 'md' : 'sm'}
                fill={isActive ? t.palette.primary_500 : t.atoms.text_contrast_medium.color}
                style={a.mb_xs}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isActive
                    ? [t.atoms.text, {fontWeight: '700'}]
                    : t.atoms.text_contrast_medium,
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>{renderTab(activeTab)}</View>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
})
