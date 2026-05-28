import {StyleSheet, View} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function EmergentPublicBadge({
  communities,
  noveltyScore,
}: {
  communities: string[]
  noveltyScore: number
}) {
  const t = useTheme()
  if (noveltyScore < 0.6) return null

  return (
    <View
      style={[styles.wrap, {backgroundColor: t.palette.primary_500 + '12'}]}>
      <Text style={[styles.icon, {color: t.palette.primary_500}]}>✨</Text>
      <Text style={[styles.text, {color: t.palette.primary_500}]}>
        <Trans>New Coalition</Trans>{' '}
        <Text style={[styles.sub, {color: t.palette.primary_500}]}>
          <Trans>
            {communities.length} communities voting together for the first time
          </Trans>
        </Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  icon: {fontSize: 14},
  text: {fontSize: 11, fontWeight: '700'},
  sub: {fontSize: 10, fontWeight: '500'},
})
