import {ScrollView, TouchableOpacity} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'

import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {type PersonalTreeGraph} from '#/features/personalCivicTree/graph'

/*
 * The user's collections as a row of cards above the graph. Tapping a card
 * focuses the graph on that collection (tap again to release); long-press opens
 * it. Empty collections are listed too, so a new one is visible immediately.
 * Cards are deliberately plain - name and count, no colour key.
 */
export function CollectionShelf({
  compact = false,
  groups,
  activeGroups,
  onToggleGroup,
  onOpenCollection,
  onNewCollection,
}: {
  compact?: boolean
  groups: PersonalTreeGraph['groups']
  activeGroups: Set<string>
  onToggleGroup: (groupId: string) => void
  onOpenCollection: (groupId: string) => void
  onNewCollection?: () => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()

  return (
    <ScrollView
      horizontal
      style={compact ? {flexGrow: 0, flexShrink: 0} : undefined}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        a.gap_sm,
        a.px_md,
        a.py_xs,
        compact && a.align_start,
      ]}>
      {groups.map(group => {
        const focused = activeGroups.has(group.id)
        return (
          <TouchableOpacity
            key={group.id}
            accessibilityRole="button"
            accessibilityLabel={group.name}
            accessibilityHint={l`Tap to focus the tree on this collection, long-press to open it`}
            accessibilityState={{selected: focused}}
            onPress={() => onToggleGroup(group.id)}
            onLongPress={() => onOpenCollection(group.id)}
            style={[
              a.rounded_md,
              a.px_md,
              compact ? a.py_xs : a.py_sm,
              {
                minWidth: 112,
                maxWidth: 180,
                borderWidth: 1,
                borderColor: focused
                  ? t.palette.primary_500
                  : t.palette.contrast_100,
                backgroundColor: focused
                  ? t.palette.primary_25
                  : t.palette.contrast_25,
              },
            ]}>
            <Text
              style={[
                compact ? a.text_xs : a.text_sm,
                a.font_bold,
                t.atoms.text,
              ]}
              numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {plural(group.itemCount, {one: '# item', other: '# items'})}
            </Text>
          </TouchableOpacity>
        )
      })}
      {onNewCollection ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={l`New collection`}
          accessibilityHint={l`Opens the form to create a collection`}
          onPress={onNewCollection}
          style={[
            a.rounded_md,
            a.px_md,
            a.py_sm,
            a.flex_row,
            a.align_center,
            a.gap_xs,
            {
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: t.palette.contrast_100,
            },
          ]}>
          <PlusIcon size="sm" style={{color: t.palette.primary_500}} />
          <Text
            style={[a.text_sm, a.font_bold, {color: t.palette.primary_500}]}>
            <Trans>New</Trans>
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  )
}
