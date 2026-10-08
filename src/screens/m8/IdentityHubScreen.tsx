import {useCallback, useState} from 'react'
import {Alert, Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {ArrowBoxRight_Stroke2_Corner3_Rounded as DisconnectIcon} from '#/components/icons/ArrowBoxRight'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/EyeSlash'
import {Key_Stroke2_Corner2_Rounded as KeyIcon} from '#/components/icons/Key'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldCheckIcon} from '#/components/icons/Shield'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import AnonymousIdentitiesScreen from './AnonymousIdentitiesScreen'
import {
  ConnectingIndicator,
  M8ConnectCard,
  shortenDid,
  useM8Connection,
} from './components/M8Connection'
import ConsentAuditScreen from './ConsentAuditScreen'
import TrustedIssuersScreen from './TrustedIssuersScreen'
import WalletScreen from './WalletScreen'

type TabKey = 'wallet' | 'anon' | 'audit' | 'issuers'

export default function IdentityHubScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const {state, refresh, disconnect} = useM8Connection()
  const [activeTab, setActiveTab] = useState<TabKey>('wallet')

  const confirmDisconnect = useCallback(() => {
    Alert.alert(
      _(msg`Disconnect from m8?`),
      _(
        msg`This device forgets its m8 session. Your grants and proofs stay in m8, and you can connect again at any time.`,
      ),
      [
        {text: _(msg`Cancel`), style: 'cancel'},
        {
          text: _(msg`Disconnect`),
          style: 'destructive',
          onPress: () => {
            void disconnect()
          },
        },
      ],
    )
  }, [_, disconnect])

  const tabs: {
    key: TabKey
    label: string
    icon: typeof ShieldCheckIcon
  }[] = [
    {key: 'wallet', label: _(msg`Wallet`), icon: ShieldCheckIcon},
    {key: 'anon', label: _(msg`Anonymous`), icon: EyeSlashIcon},
    {key: 'audit', label: _(msg`Activity`), icon: ClockIcon},
    {key: 'issuers', label: _(msg`Issuers`), icon: KeyIcon},
  ]

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Identity & Wallet</Trans>
          </Layout.Header.TitleText>
          {state.status === 'connected' ? (
            <Layout.Header.SubtitleText>
              {state.handle ? `@${state.handle}` : _(msg`Connected wallet`)}
              {' · '}
              {shortenDid(state.did)}
            </Layout.Header.SubtitleText>
          ) : null}
        </Layout.Header.Content>
        <Layout.Header.Slot>
          {state.status === 'connected' ? (
            <Button
              label={_(msg`Disconnect from m8`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="round"
              onPress={confirmDisconnect}>
              <ButtonIcon icon={DisconnectIcon} size="md" />
            </Button>
          ) : null}
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      {state.status === 'loading' ? (
        <ConnectingIndicator />
      ) : state.status === 'disconnected' ? (
        <Layout.Content>
          <M8ConnectCard
            onConnected={() => {
              void refresh()
            }}
          />
        </Layout.Content>
      ) : (
        <>
          <View
            accessibilityRole="tablist"
            style={[
              a.flex_row,
              a.border_b,
              a.px_sm,
              t.atoms.border_contrast_low,
            ]}>
            {tabs.map(tab => {
              const isActive = activeTab === tab.key
              return (
                <Pressable
                  key={tab.key}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityHint=""
                  accessibilityState={{selected: isActive}}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    a.flex_1,
                    a.align_center,
                    a.justify_center,
                    a.gap_2xs,
                    a.py_sm,
                    {
                      borderBottomWidth: 2,
                      borderBottomColor: isActive
                        ? t.palette.primary_500
                        : 'transparent',
                    },
                  ]}>
                  <tab.icon
                    size="sm"
                    fill={
                      isActive
                        ? t.palette.primary_500
                        : t.atoms.text_contrast_medium.color
                    }
                  />
                  <Text
                    style={[
                      a.text_xs,
                      isActive
                        ? [a.font_bold, t.atoms.text]
                        : [a.font_medium, t.atoms.text_contrast_medium],
                    ]}
                    numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          <View style={[a.flex_1]}>
            {activeTab === 'wallet' ? (
              <WalletScreen />
            ) : activeTab === 'anon' ? (
              <AnonymousIdentitiesScreen />
            ) : activeTab === 'audit' ? (
              <ConsentAuditScreen />
            ) : (
              <TrustedIssuersScreen />
            )}
          </View>
        </>
      )}
    </Layout.Screen>
  )
}
