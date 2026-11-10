import {useCallback, useState} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {ArrowBoxRight_Stroke2_Corner3_Rounded as DisconnectIcon} from '#/components/icons/Arrow'
import {Clock_Stroke2_Corner0_Rounded as ClockIcon} from '#/components/icons/Clock'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlashIcon} from '#/components/icons/Eye'
import {Key_Stroke2_Corner2_Rounded as KeyIcon} from '#/components/icons/Key'
import {ShieldCheck_Stroke2_Corner0_Rounded as ShieldCheckIcon} from '#/components/icons/Shield'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import AnonymousIdentitiesScreen from './AnonymousIdentitiesScreen'
import {confirmAction} from './components/alerts'
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
  const {gtMobile} = useBreakpoints()
  const {connection, account, busy, error, connect, disconnect} =
    useM8Connection()
  const [activeTab, setActiveTab] = useState<TabKey>('wallet')

  const confirmDisconnect = useCallback(() => {
    confirmAction({
      title: _(msg`Disconnect from m8?`),
      message: _(
        msg`This signs you out of m8 on this device. Your grants and proofs stay in m8, and you can connect again at any time.`,
      ),
      cancelLabel: _(msg`Cancel`),
      confirmLabel: _(msg`Disconnect`),
      onConfirm: () => {
        void disconnect()
      },
    })
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
          {connection.status === 'connected' ? (
            <Layout.Header.SubtitleText>
              {connection.handle
                ? `@${connection.handle}`
                : _(msg`Connected wallet`)}
              {' · '}
              {shortenDid(connection.did)}
            </Layout.Header.SubtitleText>
          ) : null}
        </Layout.Header.Content>
        <Layout.Header.Slot>
          {connection.status === 'connected' ? (
            <Button
              label={_(msg`Disconnect from m8`)}
              size="small"
              variant="ghost"
              color="secondary"
              shape="round"
              disabled={busy}
              onPress={confirmDisconnect}>
              <ButtonIcon icon={DisconnectIcon} size="md" />
            </Button>
          ) : null}
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      {connection.status === 'loading' ? (
        <ConnectingIndicator />
      ) : connection.status === 'disconnected' ? (
        <Layout.Content>
          <M8ConnectCard
            account={account}
            busy={busy}
            error={error}
            onConnect={() => {
              void connect()
            }}
          />
        </Layout.Content>
      ) : (
        <>
          {/* inside Center so the tabs line up with the content column */}
          <Layout.Center>
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
                      gtMobile
                        ? [a.flex_row, a.gap_sm, a.py_md]
                        : [a.gap_2xs, a.py_sm],
                      web({cursor: 'pointer'}),
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
                        gtMobile ? a.text_sm : a.text_xs,
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
          </Layout.Center>

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
