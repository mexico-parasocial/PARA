import {StyleSheet, View} from 'react-native'
import {AppBskyFeedDefs} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {isReasonFeedSource, type ReasonFeedSource} from '#/lib/api/feed/types'
import {atoms as a, useTheme} from '#/alf'
import {Pin_Stroke2_Corner0_Rounded as PinIcon} from '#/components/icons/Pin'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {FeedNameText} from '../util/FeedInfoText'

export function PostFeedReason({
  reason,
}: {
  reason:
    | ReasonFeedSource
    | AppBskyFeedDefs.ReasonRepost
    | AppBskyFeedDefs.ReasonPin
    | {[k: string]: unknown; $type: string}
}) {
  const t = useTheme()
  const {_} = useLingui()

  if (isReasonFeedSource(reason)) {
    return (
      <Link label={_(msg`Go to feed`)} to={reason.href}>
        <Text
          style={[
            t.atoms.text_contrast_medium,
            a.font_medium,
            a.leading_snug,
            a.leading_snug,
          ]}
          numberOfLines={1}>
          <Trans context="from-feed">
            From{' '}
            <FeedNameText
              uri={reason.uri}
              href={reason.href}
              style={[
                t.atoms.text_contrast_medium,
                a.font_medium,
                a.leading_snug,
              ]}
              numberOfLines={1}
            />
          </Trans>
        </Text>
      </Link>
    )
  }

  if (AppBskyFeedDefs.isReasonRepost(reason)) {
    return null
  }

  if (AppBskyFeedDefs.isReasonPin(reason)) {
    return (
      <View style={styles.includeReason}>
        <PinIcon
          style={[t.atoms.text_contrast_medium, {marginRight: 3}]}
          width={13}
          height={13}
        />
        <Text
          style={[t.atoms.text_contrast_medium, a.font_medium, a.leading_snug]}
          numberOfLines={1}>
          <Trans>Pinned</Trans>
        </Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  includeReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginLeft: -16,
  },
})
