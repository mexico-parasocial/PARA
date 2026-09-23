import {useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {CHAT_IDENTITY_COPY, type ChatIdentityMode} from '#/lib/chat/identity'
import {atoms as a, useTheme} from '#/alf'
import {
  ChatEncryptionNotice,
  type ChatEncryptionPolicy,
} from '#/components/chat/ChatEncryptionNotice'
import {ChatIdentityPill} from '#/components/chat/ChatIdentityPill'
import {ChevronBottom_Stroke2_Corner0_Rounded as ChevronDownIcon} from '#/components/icons/Chevron'
import {
  Lock_Stroke2_Corner0_Rounded as LockIcon,
  Unlock_Stroke2_Corner2_Rounded as UnlockIcon,
} from '#/components/icons/Lock'
import {Text} from '#/components/Typography'

export function ChatCivicContext({
  identityMode,
  encryptionPolicy,
  badges,
}: {
  identityMode: ChatIdentityMode
  encryptionPolicy: ChatEncryptionPolicy
  badges: string[]
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [expanded, setExpanded] = useState(false)
  const encrypted = encryptionPolicy === 'e2ee'
  const encryptionLabel = encrypted ? _(msg`Cifrado`) : _(msg`Sin cifrado`)
  const identityLabel = CHAT_IDENTITY_COPY[identityMode].shortLabel
  const EncryptionIcon = encrypted ? LockIcon : UnlockIcon

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: t.palette.contrast_25,
          borderBottomColor: t.palette.contrast_100,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={_(
          msg`Identidad: ${identityLabel}. ${encryptionLabel}. ${badges.length} insignias.`,
        )}
        accessibilityHint={
          expanded
            ? _(msg`Oculta los detalles del chat`)
            : _(msg`Muestra los detalles del chat`)
        }
        accessibilityState={{expanded}}
        onPress={() => setExpanded(value => !value)}
        style={[a.flex_row, a.align_center, a.gap_sm, styles.summary]}>
        <Text
          style={[a.text_xs, a.font_semi_bold, t.atoms.text]}
          numberOfLines={1}>
          {identityLabel}
        </Text>
        <View style={[a.flex_row, a.align_center, a.gap_2xs, a.flex_1]}>
          <EncryptionIcon
            size="xs"
            style={{
              color: encrypted
                ? t.palette.positive_500
                : t.palette.negative_500,
            }}
          />
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              {
                color: encrypted
                  ? t.palette.positive_500
                  : t.palette.negative_500,
              },
            ]}
            numberOfLines={1}>
            {encryptionLabel}
          </Text>
        </View>
        {badges.length > 0 && (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {_(msg`${badges.length} insignias`)}
          </Text>
        )}
        <ChevronDownIcon
          size="xs"
          style={{
            color: t.palette.contrast_500,
            transform: [{rotate: expanded ? '180deg' : '0deg'}],
          }}
        />
      </Pressable>
      {expanded && (
        <View style={[a.gap_xs, a.pb_sm]}>
          <ChatIdentityPill mode={identityMode} />
          <ChatEncryptionNotice policy={encryptionPolicy} />
          {badges.length > 0 && (
            <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
              {badges.slice(0, 4).map(badge => (
                <View
                  key={badge}
                  style={[
                    styles.badge,
                    {
                      backgroundColor: t.palette.primary_500 + '18',
                      borderColor: t.palette.primary_500 + '33',
                    },
                  ]}>
                  <Text style={[a.text_xs, {color: t.palette.primary_500}]}>
                    {badge}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summary: {
    minHeight: 40,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
})
