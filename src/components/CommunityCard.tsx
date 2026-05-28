import {StyleSheet, TouchableOpacity, View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {CommunityIcon_Stroke as CommunityIcon} from '#/components/icons/Community'
import {Person_Stroke2_Corner0_Rounded as PersonIcon} from '#/components/icons/Person'
import {Text} from '#/components/Typography'

interface CommunityCardProps {
  name: string
  color: string
  isPinned?: boolean
  onToggle: () => void
  onProfile: () => void
}

export function CommunityCard({
  name,
  color,
  isPinned,
  onToggle,
  onProfile,
}: CommunityCardProps) {
  const t = useTheme()

  // Custom darker background logic (extracted from DataScreen)
  const cardBgColor = {
    backgroundColor: t.palette.contrast_25 + '30',
    borderColor: t.palette.contrast_50 + '40',
  }

  return (
    <TouchableOpacity accessibilityRole="button"
      style={[
        styles.card,
        {
          borderColor: isPinned
            ? t.palette.primary_500
            : cardBgColor.borderColor,
          borderWidth: isPinned ? 2 : 1,
        },
      ]}
      onPress={onToggle}
      activeOpacity={0.9}>
      {/* Top Header */}
      <View style={[styles.cardTop, {backgroundColor: color + '30'}]}>
        <View style={[a.absolute, a.inset_0, a.justify_center, a.align_center]}>
          <CommunityIcon width={32} height={32} style={{color}} />
        </View>

        {/* Toggle/Unpin Button (Top Right) */}
        {isPinned && (
          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.iconButton, {top: 4, right: 4}]}
            onPress={onToggle}>
            <Text style={styles.iconButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Body */}
      <View
        style={[
          styles.cardBottom,
          {backgroundColor: cardBgColor.backgroundColor},
        ]}>
        <Text style={[styles.cardText, t.atoms.text]} numberOfLines={1}>
          {name}
        </Text>
      </View>

      {/* Profile Button (Bottom Right) */}
      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.iconButton, {bottom: 4, right: 4}]}
        onPress={onProfile}>
        <PersonIcon width={14} height={14} style={{color: 'white'}} />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    marginRight: 12,
    width: 120,
    overflow: 'hidden',
    // Border is handled dynamically via style prop to avoid double borders
  },
  cardTop: {
    height: 50,
    position: 'relative',
  },
  cardBottom: {
    padding: 8,
    // No border here to fix "weird corners"
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconButton: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12, // Circular-ish
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
})
