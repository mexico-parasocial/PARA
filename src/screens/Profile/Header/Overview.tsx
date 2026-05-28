import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown} from '#/components/icons/Chevron'
import {Text} from '#/components/Typography'

export function ProfileOverview() {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => {
    setExpanded(!expanded)
  }

  return (
    <View style={[a.w_full, a.mt_sm]}>
      {/* Header Bar */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse overview' : 'Expand overview'}
        accessibilityHint={
          expanded
            ? 'Hides the profile overview section'
            : 'Shows profile statistics and contributions'
        }
        onPress={toggleExpanded}
        style={[
          t.atoms.bg_contrast_25,
          a.flex_row,
          a.justify_between,
          a.align_center,
          a.px_md,
          a.py_sm,
          a.rounded_sm,
        ]}>
        <Text style={[a.font_bold, t.atoms.text_contrast_medium]}>
          <Trans>Overview</Trans>
        </Text>
        <ChevronDown
          size="sm"
          style={[
            expanded && {transform: [{rotate: '180deg'}]},
            t.atoms.text_contrast_medium,
          ]}
        />
      </TouchableOpacity>

      {/* Expandable Content */}
      {expanded && (
        <View
          style={[
            a.px_md,
            a.py_md,
            a.gap_md,
            t.atoms.bg_contrast_25,
            a.rounded_sm,
            {marginTop: 1},
          ]}>
          <Text style={[a.font_bold, a.text_lg]}>
            <Trans>Overview</Trans>
          </Text>
          {/* Stats Row 1 */}
          <View style={[a.flex_row, a.justify_between]}>
            <View style={[a.flex_row, a.gap_xl]}>
              <View>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Neg Avg</Trans>
                </Text>
                <Text
                  style={[
                    a.text_md,
                    a.font_bold,
                    {color: t.palette.negative_400},
                  ]}>
                  2.1
                </Text>
              </View>
              <View>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Abs Avg</Trans>
                </Text>
                <Text style={[a.text_md, a.font_bold]}>1.4</Text>
              </View>
              <View>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Pos Avg</Trans>
                </Text>
                <Text
                  style={[
                    a.text_md,
                    a.font_bold,
                    {color: t.palette.positive_400},
                  ]}>
                  2.5
                </Text>
              </View>
            </View>
            <View>
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>Account Age</Trans>
              </Text>
              <Text style={[a.text_md, a.font_bold]}>2y 4m</Text>
            </View>
          </View>

          {/* Contributions */}
          <View>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mb_xs]}>
              <Trans>Contributions</Trans>
            </Text>
            <View style={[a.flex_row, a.gap_lg]}>
              <View>
                <Text style={[a.font_bold]}>142</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  Policies
                </Text>
              </View>
              <View>
                <Text style={[a.font_bold]}>89</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  Matters
                </Text>
              </View>
              <View>
                <Text style={[a.font_bold]}>1.2k</Text>
                <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                  Comments
                </Text>
              </View>
            </View>
          </View>

          {/* Active In Link */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="View communities active in"
            accessibilityHint="Opens a list of communities this user participates in"
            style={[a.flex_row, a.align_center, a.justify_between, a.pt_xs]}
            onPress={() => {
              // @ts-ignore
              navigation.navigate('CommunitiesActiveIn', {name: ''})
            }}>
            <Text style={[a.font_semi_bold, t.atoms.text_contrast_high]}>
              <Trans>Active in</Trans>
            </Text>
            <ChevronDown
              size="xs"
              style={[
                {transform: [{rotate: '-90deg'}]},
                t.atoms.text_contrast_medium,
              ]}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}
