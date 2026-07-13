import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Check_Stroke2_Corner0_Rounded as Check} from '#/components/icons/Check'
import {Eye_Stroke2_Corner0_Rounded as Eye} from '#/components/icons/Eye'
import {EyeSlash_Stroke2_Corner0_Rounded as EyeSlash} from '#/components/icons/EyeSlash'
import {Text} from '#/components/Typography'
import {type PrivacyClaim} from '../types'

export function ProofPrivacyFooter({claims}: {claims: PrivacyClaim[]}) {
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
        <Eye
          size="sm"
          fill={t.atoms.text_contrast_medium.color}
          style={t.atoms.text_contrast_medium}
        />
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Proofs & privacy</Trans>
        </Text>
      </View>

      <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
        <Trans>
          These verified facts can be shared as zero-knowledge proofs. Raw
          identity data stays on your device.
        </Trans>
      </Text>

      {claims.length === 0 && (
        <Text style={[styles.empty, t.atoms.text_contrast_low]}>
          <Trans>
            No active proofs. Complete verification to unlock civic features.
          </Trans>
        </Text>
      )}

      {claims.map(claim => (
        <View
          key={claim.id}
          style={[
            styles.claimRow,
            a.flex_row,
            a.align_center,
            {borderColor: t.atoms.border_contrast_low.borderColor},
          ]}>
          <View style={[a.flex_1, a.gap_xs]}>
            <View style={[a.flex_row, a.align_center, a.gap_sm]}>
              <Text style={[styles.claimLabel, t.atoms.text]}>
                {claim.label}
              </Text>
              {claim.disclosed ? (
                <Eye
                  size="xs"
                  fill={t.atoms.text_contrast_low.color}
                  style={t.atoms.text_contrast_low}
                />
              ) : (
                <EyeSlash
                  size="xs"
                  fill={t.palette.primary_500}
                  style={{color: t.palette.primary_500}}
                />
              )}
            </View>
            <Text style={[styles.claimDetail, t.atoms.text_contrast_low]}>
              {claim.detail}
            </Text>
          </View>
          {claim.disclosed ? (
            <View
              style={[
                styles.check,
                {backgroundColor: t.palette.positive_500 + '20'},
              ]}>
              <Check
                size="xs"
                fill={t.palette.positive_500}
                style={{color: t.palette.positive_500}}
              />
            </View>
          ) : null}
        </View>
      ))}

      <Button
        label={_(msg`Manage in iM8 wallet`)}
        variant="ghost"
        color="secondary"
        size="small"
        style={styles.manageBtn}>
        <ButtonText>
          <Trans>Manage in iM8 wallet</Trans>
        </ButtonText>
      </Button>
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
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    fontSize: 14,
  },
  claimRow: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  claimLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  claimDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtn: {
    alignSelf: 'flex-start',
  },
})
