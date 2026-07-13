import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {At_Stroke2_Corner0_Rounded as AtIcon} from '#/components/icons/At'
import {type Props as IconProps} from '#/components/icons/common'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {Mark as BskyIcon} from '#/components/icons/Logo'
import {Text} from '#/components/Typography'
import {type ConnectedAccount} from '../types'

const PROVIDER_ICONS: Record<
  ConnectedAccount['provider'],
  React.ComponentType<IconProps>
> = {
  bsky: BskyIcon,
  x: GlobeIcon,
  instagram: GlobeIcon,
}

const PROVIDER_LABELS: Record<ConnectedAccount['provider'], string> = {
  bsky: 'Bluesky',
  x: 'X',
  instagram: 'Instagram',
}

export function ConnectedAccountsSection({
  accounts,
  isPublicContext,
}: {
  accounts: ConnectedAccount[]
  isPublicContext: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        styles.container,
        t.atoms.bg_contrast_25,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm]}>
        <AtIcon
          size="sm"
          fill={t.atoms.text_contrast_medium.color}
          style={t.atoms.text_contrast_medium}
        />
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Connected accounts</Trans>
        </Text>
      </View>

      {!isPublicContext && (
        <Text style={[styles.hint, t.atoms.text_contrast_low]}>
          <Trans>
            Connected accounts are only available for your public identity.
          </Trans>
        </Text>
      )}

      {isPublicContext && accounts.length === 0 && (
        <Text style={[styles.empty, t.atoms.text_contrast_medium]}>
          <Trans>No social accounts connected yet.</Trans>
        </Text>
      )}

      {isPublicContext &&
        accounts.map(account => {
          const Icon = PROVIDER_ICONS[account.provider]
          return (
            <View
              key={account.id}
              style={[
                styles.accountRow,
                a.flex_row,
                a.align_center,
                {borderColor: t.atoms.border_contrast_low.borderColor},
              ]}>
              <Icon
                size="sm"
                fill={t.atoms.text_contrast_medium.color}
                style={{color: t.atoms.text_contrast_medium.color}}
              />
              <View style={[a.flex_1, a.ml_sm]}>
                <Text style={[styles.provider, t.atoms.text]}>
                  {PROVIDER_LABELS[account.provider]}
                </Text>
                <Text style={[styles.handle, t.atoms.text_contrast_medium]}>
                  @{account.handle}
                </Text>
              </View>
            </View>
          )
        })}

      {isPublicContext && (
        <Button
          label={_(msg`Connect an account`)}
          variant="outline"
          color="primary"
          size="small"
          style={styles.addBtn}>
          <ButtonText>
            <Trans>Connect an account</Trans>
          </ButtonText>
        </Button>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    fontSize: 14,
  },
  accountRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  provider: {
    fontSize: 14,
    fontWeight: '700',
  },
  handle: {
    fontSize: 13,
  },
  addBtn: {
    alignSelf: 'flex-start',
  },
})
