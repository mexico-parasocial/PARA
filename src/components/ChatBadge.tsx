import {StyleSheet, View} from 'react-native'

interface ChatBadgeProps {
  severity?: 'info' | 'warning' | 'critical'
  size?: number
}

const SEVERITY_COLORS = {
  info: '#34C759',
  warning: '#FF9500',
  critical: '#FF3B30',
}

/**
 * S subtle risk indicator dot for avatars.
 * No text, no labels — just a colored dot that invites curiosity.
 * Tap the avatar to expand and see full badge details.
 */
export function ChatBadge({severity = 'info', size = 10}: ChatBadgeProps) {
  if (!severity) return null
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: SEVERITY_COLORS[severity],
          borderWidth: 1.5,
          borderColor: '#fff',
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
})
