import {useState} from 'react'
import {LayoutAnimation, StyleSheet, TouchableOpacity, View} from 'react-native'

import {useGlobalFilter} from '#/state/shell/global-filter'
import {atoms as a, useTheme} from '#/alf'
// import {
//   ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
//   ChevronTop_Stroke2_Corner0_Rounded as ChevronUp,
// } from '#/components/icons/Chevron'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
import {Text} from '#/components/Typography'

export function GlobalFilterBar({style}: {style?: StyleProp<ViewStyle>}) {
  const t = useTheme()
  const {selectedCommunities, toggleCommunity} = useGlobalFilter()
  const [isExpanded, setIsExpanded] = useState(false)

  if (selectedCommunities.length === 0) {
    // Optional: Hide if no filters active? Or show "All communities"?
    // User wants "Compass button", so maybe always show it.
    // Let's show "All Views" state.
    // But if minimized by default, maybe just the icon.
  }

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setIsExpanded(!isExpanded)
  }

  return (
    <View style={[styles.container, t.atoms.bg_contrast_25, style]}>
      {/* Minimized / Header View */}
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.8}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              {backgroundColor: t.palette.primary_500},
            ]}>
            <CompassIcon width={16} height={16} style={{color: 'white'}} />
          </View>
          <Text style={[a.font_bold, t.atoms.text]}>
            {selectedCommunities.length > 0
              ? `${selectedCommunities.length} Active View${selectedCommunities.length !== 1 ? 's' : ''}`
              : 'Global View (All)'}
          </Text>
        </View>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {isExpanded ? 'Hide' : 'Show'}
        </Text>
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          {selectedCommunities.length > 0 ? (
            <View style={styles.tagsRow}>
              {selectedCommunities.map(community => (
                <TouchableOpacity
                  key={community}
                  accessibilityRole="button"
                  style={[styles.tag, {backgroundColor: t.palette.primary_500}]}
                  onPress={() => toggleCommunity(community)}>
                  <Text style={styles.tagText}>{community}</Text>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                accessibilityRole="button"
                style={[
                  styles.tag,
                  styles.clearTag,
                  t.atoms.border_contrast_medium,
                ]}
                onPress={() => {
                  // Hack: toggle all off? Or just need a clear function in context
                  selectedCommunities.forEach(c => toggleCommunity(c))
                }}>
                <Text style={[styles.tagText, t.atoms.text]}>Clear All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[t.atoms.text_contrast_medium, a.p_sm]}>
              No communities selected. You are viewing global data.
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  clearTag: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  tagText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  removeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: 'bold',
  },
})
