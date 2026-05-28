import {StyleSheet, View} from 'react-native'

import {useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function IntersectionChips({
  communities,
  userCommunities,
}: {
  communities: {name: string; color: string}[]
  userCommunities?: string[]
}) {
  const t = useTheme()
  return (
    <View style={styles.wrap}>
      {communities.map(c => {
        const isUserMember = userCommunities?.includes(c.name)
        return (
          <View
            key={c.name}
            style={[
              styles.chip,
              isUserMember
                ? {backgroundColor: c.color + '20', borderColor: c.color + '50'}
                : [
                    t.atoms.bg_contrast_25,
                    {borderColor: t.atoms.border_contrast_low.borderColor},
                  ],
            ]}>
            <View style={[styles.dot, {backgroundColor: c.color}]} />
            <Text
              style={[
                styles.text,
                isUserMember
                  ? {color: c.color, fontWeight: '700'}
                  : t.atoms.text_contrast_medium,
              ]}>
              {c.name}
            </Text>
            {isUserMember && (
              <Text style={[styles.youBadge, {color: c.color}]}>· you</Text>
            )}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {width: 6, height: 6, borderRadius: 3},
  text: {fontSize: 10, fontWeight: '500'},
  youBadge: {fontSize: 9, fontWeight: '700'},
})
