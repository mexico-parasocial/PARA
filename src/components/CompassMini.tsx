import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {Trans} from '@lingui/react/macro'

import {
  COMPASS_COLORS,
  COMPASS_CROSS_GRADIENTS,
  COMPASS_GRID_ROWS,
  COMPASS_POSITION_IDS,
} from '#/lib/compass/compassColors'
import {getPartyNinthId} from '#/lib/compass/party-distributions'
import {
  COMPASS_ID_TO_NINTH_NAME,
  NINTH_NAME_TO_COMPASS_ID,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

// Flat list of IDs in grid order (used for index lookups)
const NINTH_COMPASS_IDS = [...COMPASS_POSITION_IDS]

function getExplicitNinthId(
  affiliations: PoliticalAffiliation[],
): string | null {
  const ninth = affiliations.find(a => a.type === 'ninth')
  if (ninth) {
    return NINTH_NAME_TO_COMPASS_ID[ninth.name] || null
  }
  const tf = affiliations.find(a => a.type === 'twentyFifth')
  if (tf) {
    const match = tf.id.match(/twenty-fifth-(\d+)-(\d+)/)
    if (match) {
      const row = parseInt(match[1], 10)
      const col = parseInt(match[2], 10)
      const parentRow = Math.floor(row / 2)
      const parentCol = Math.floor(col / 2)
      return NINTH_COMPASS_IDS[parentRow * 3 + parentCol] || null
    }
  }
  return null
}

function getDisplayedNinthId(affiliations: PoliticalAffiliation[]): string {
  const explicit = getExplicitNinthId(affiliations)
  if (explicit) return explicit
  // Fallback: derive from party's predominant ninth
  const party = affiliations.find(a => a.type === 'party')
  if (party) {
    return getPartyNinthId(party.id) || 'center'
  }
  // Default to center when no affiliations are set
  return 'center'
}

export function CompassMini({
  affiliations,
  onPress,
  size = 78,
  compact = false,
}: {
  affiliations: PoliticalAffiliation[]
  onPress?: () => void
  size?: number
  compact?: boolean
}) {
  const t = useTheme()
  const explicitNinthId = getExplicitNinthId(affiliations)
  const displayedNinthId = getDisplayedNinthId(affiliations)
  const partyAffiliations = affiliations.filter(a => a.type === 'party')
  const hasPosition = explicitNinthId !== null

  const grid = (
    <View style={[styles.grid, {width: size, height: size}]}>
      {COMPASS_GRID_ROWS.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((positionId, colIdx) => {
            const isActive = positionId === displayedNinthId
            const solidColor = COMPASS_COLORS[positionId]
            const gradient = COMPASS_CROSS_GRADIENTS[positionId]
            return (
              <View
                key={colIdx}
                style={[
                  styles.cell,
                  isActive && {zIndex: 1},
                  !hasPosition && !isActive && {opacity: 0.5},
                ]}>
                {/* Base background — always normal size */}
                {gradient ? (
                  <LinearGradient
                    colors={
                      gradient.colors as unknown as readonly [
                        string,
                        string,
                        ...string[],
                      ]
                    }
                    start={gradient.start}
                    end={gradient.end}
                    style={StyleSheet.absoluteFill}
                  />
                ) : (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {backgroundColor: solidColor},
                    ]}
                  />
                )}

                {/* Active overlay — scaled so it never affects grid layout */}
                {isActive && (
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      {
                        transform: [{scale: 1.15}],
                        borderWidth: 2,
                        borderColor: solidColor,
                        shadowColor: solidColor,
                        shadowOffset: {width: 0, height: 0},
                        shadowOpacity: 0.5,
                        shadowRadius: 6,
                        elevation: 6,
                      },
                    ]}>
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {borderWidth: 2, borderColor: '#ffffff80'},
                      ]}
                    />
                  </View>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )

  const partyDots = partyAffiliations.length > 0 && (
    <View style={styles.partyDots}>
      {partyAffiliations.slice(0, 3).map((p, i) => (
        <View
          key={p.id}
          style={[
            styles.partyDot,
            {
              backgroundColor: p.color,
              marginLeft: i > 0 ? -6 : 0,
              borderColor: t.atoms.bg.backgroundColor || '#fff',
            },
          ]}
        />
      ))}
    </View>
  )

  const positionLabel = (() => {
    const party = affiliations.find(a => a.type === 'party')
    const ninthName = displayedNinthId
      ? COMPASS_ID_TO_NINTH_NAME[displayedNinthId]
      : null
    if (ninthName && party) return `${ninthName} • ${party.name}`
    if (ninthName) return ninthName
    if (party) return party.name
    return 'Set position'
  })()

  if (compact) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Ver posición política"
        accessibilityHint="Navega a la pantalla de detalle de tu posición política"
        onPress={onPress}>
        <View style={[a.align_center, a.gap_xs]}>
          {grid}
          {partyDots}
          <Text
            style={[
              a.text_xs,
              a.font_bold,
              t.atoms.text_contrast_medium,
              {fontSize: 9, marginTop: 2},
            ]}
            numberOfLines={1}>
            {positionLabel}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel="Ver posición política"
      accessibilityHint="Navega a la pantalla de detalle de tu posición política"
      style={[styles.card, {gap: 14}]}
      onPress={onPress}>
      <View style={[a.align_center, a.gap_xs]}>
        {grid}
        {partyDots}
      </View>

      <View style={styles.info}>
        <Text style={[styles.label, t.atoms.text_contrast_medium]}>
          <Trans>Posición política</Trans>
        </Text>
        <Text style={[styles.value, t.atoms.text]} numberOfLines={1}>
          {affiliations.length > 0
            ? affiliations.map(a => a.name).join(' • ')
            : 'No configurada'}
        </Text>
        <Text style={[styles.link, {color: t.palette.primary_500}]}>
          <Trans>Editar →</Trans>
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  grid: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
  },
  row: {
    flexDirection: 'row',
    flex: 1,
  },
  cell: {
    flex: 1,
    margin: 0.5,
  },
  partyDots: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  partyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  link: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
})
