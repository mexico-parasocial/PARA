import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {CircleInfo_Stroke2_Corner0_Rounded as CircleInfoIcon} from '#/components/icons/CircleInfo'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export function MessagesUnavailable({
  title,
  showBackButton = false,
}: {
  title: string
  showBackButton?: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        {showBackButton ? <Layout.Header.BackButton /> : <Layout.Header.Slot />}
        <Layout.Header.Content>
          <Layout.Header.TitleText>{title}</Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={[a.flex_1, a.px_xl]}>
        <CircleInfoIcon width={48} fill={t.atoms.text_contrast_low.color} />
        <Text style={[a.pt_md, a.text_2xl, a.font_semi_bold, a.text_center]}>
          <Trans>Chats unavailable</Trans>
        </Text>
        <Text
          style={[
            a.pt_sm,
            a.text_md,
            a.text_center,
            a.leading_snug,
            t.atoms.text_contrast_medium,
            {maxWidth: 420},
          ]}>
          <Trans>
            Direct messages are disabled for the local demo service. The local
            stack does not expose a resolvable chat endpoint yet.
          </Trans>
        </Text>
        <Text
          style={[
            a.pt_md,
            a.text_sm,
            a.text_center,
            t.atoms.text_contrast_medium,
            {maxWidth: 420},
          ]}>
          {_(
            msg`Enable a real local chat service before using the messages screens.`,
          )}
        </Text>
      </Layout.Center>
    </Layout.Screen>
  )
}
