import {useCallback, useState} from 'react'
import {ActivityIndicator, StyleSheet, TouchableOpacity, View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {PinLocation_Stroke2_Corner0_Rounded as MapPinIcon} from '#/components/icons/PinLocation'
import {Text} from '#/components/Typography'
import {
  fetchAccurateLocation,
  GEO_SCOPE_DESCRIPTIONS,
  GEO_SCOPE_LABELS,
  type GeoScope,
  useM8IdentityLocation,
} from '#/geolocation'
import {findClosestDistrict, resolveStateFromCoordinate} from '#/geolocation/geoScope'

export type ResolvedGeoScope = {
  scope: GeoScope
  region: string
  districtKey?: string
  city?: string
  neighborhood?: string
  geo?: {latE7: number; lngE7: number}
  positionalAccuracy?: number
}

export type GeoScopeSelectorProps = {
  value?: ResolvedGeoScope
  onChange: (value: ResolvedGeoScope | undefined) => void
}

/**
 * GeoScopeSelector lets the user choose how precisely they want to
 * georeference their civic content (cabildeo, RAQ, post, etc).
 *
 * Levels:
 *   - Estado:       Always available. Coarse GPS → state name.
 *   - Distrito:     Available with GPS. Accurate fix → closest district.
 *   - Ciudad:       Available with GPS. Accurate fix → city lookup.
 *   - Colonia:      Only if user has m8 INE verification.
 *
 * When a scope is selected, the component fetches the location and
 * calls `onChange` with the resolved data.
 */
export function GeoScopeSelector({value, onChange}: GeoScopeSelectorProps) {
  const t = useTheme()
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureError, setCaptureError] = useState<string | null>(null)

  const {data: m8Location, isLoading: m8Loading} = useM8IdentityLocation()

  const availableScopes: GeoScope[] = ['state', 'district', 'city']
  if (m8Location?.hasIneVerification && m8Location.neighborhood) {
    availableScopes.push('neighborhood')
  }

  const handleSelectScope = useCallback(
    async (scope: GeoScope) => {
      setCaptureError(null)
      setIsCapturing(true)

      try {
        let resolved: ResolvedGeoScope

        if (scope === 'state') {
          // State-level: use accurate location and resolve state
          const loc = await fetchAccurateLocation()
          const state = resolveStateFromCoordinate(loc.latitude, loc.longitude)
          if (!state) throw new Error('No se pudo resolver el estado')
          resolved = {
            scope,
            region: state,
            geo: {
              latE7: Math.round(loc.latitude * 1e7),
              lngE7: Math.round(loc.longitude * 1e7),
            },
            positionalAccuracy: loc.positionalAccuracy,
          }
        } else if (scope === 'district') {
          const loc = await fetchAccurateLocation()
          const district = findClosestDistrict(loc.latitude, loc.longitude)
          if (!district) throw new Error('No se pudo resolver el distrito')
          resolved = {
            scope,
            region: district.stateName,
            districtKey: district.districtKey,
            geo: {
              latE7: Math.round(loc.latitude * 1e7),
              lngE7: Math.round(loc.longitude * 1e7),
            },
            positionalAccuracy: loc.positionalAccuracy,
          }
        } else if (scope === 'city') {
          const loc = await fetchAccurateLocation()
          const state = resolveStateFromCoordinate(loc.latitude, loc.longitude)
          // City resolution from GPS requires city coordinate database
          // For now, we fall back to the m8-verified city if available,
          // otherwise use the state as a placeholder with a TODO.
          const cityName =
            m8Location?.city ??
            (state ? `Ciudad en ${state}` : 'Ciudad desconocida')
          resolved = {
            scope,
            region: state ?? 'Desconocido',
            city: cityName,
            geo: {
              latE7: Math.round(loc.latitude * 1e7),
              lngE7: Math.round(loc.longitude * 1e7),
            },
            positionalAccuracy: loc.positionalAccuracy,
          }
        } else if (scope === 'neighborhood') {
          // Neighborhood requires m8 INE data
          if (!m8Location?.hasIneVerification) {
            throw new Error('INE verification required for neighborhood level')
          }
          const loc = await fetchAccurateLocation()
          resolved = {
            scope,
            region: m8Location.state ?? 'Desconocido',
            city: m8Location.city,
            neighborhood: m8Location.neighborhood,
            geo: {
              latE7: Math.round(loc.latitude * 1e7),
              lngE7: Math.round(loc.longitude * 1e7),
            },
            positionalAccuracy: loc.positionalAccuracy,
          }
        } else {
          throw new Error('Scope no soportado')
        }

        onChange(resolved)
      } catch (e) {
        setCaptureError(e instanceof Error ? e.message : String(e))
      } finally {
        setIsCapturing(false)
      }
    },
    [m8Location, onChange],
  )

  const handleClear = useCallback(() => {
    onChange(undefined)
    setCaptureError(null)
  }, [onChange])

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MapPinIcon
          width={18}
          height={18}
          fill={t.palette.primary_500}
        />
        <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.ml_sm]}>
          Geographic scope
        </Text>
      </View>

      <Text
        style={[
          a.text_xs,
          t.atoms.text_contrast_medium,
          a.mt_xs,
          {lineHeight: 18},
        ]}>
        Choose how specific your proposal's location will be. This
        affects where it will appear on the civic tree.
      </Text>

      {value ? (
        <View
          style={[
            styles.selectedCard,
            a.mt_md,
            a.p_md,
            a.rounded_md,
            {backgroundColor: t.palette.primary_500 + '12'},
            a.border,
            {borderColor: t.palette.primary_500 + '40'},
          ]}>
          <View style={a.flex_row}>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
              {GEO_SCOPE_LABELS[value.scope]}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleClear}
              style={a.ml_auto}>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: t.palette.negative_500},
                ]}>
                Cambiar
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[a.text_xs, t.atoms.text_contrast_medium, a.mt_2xs]}>
            {value.region}
            {value.districtKey ? ` · ${value.districtKey}` : ''}
            {value.city ? ` · ${value.city}` : ''}
            {value.neighborhood ? ` · ${value.neighborhood}` : ''}
          </Text>

          {value.positionalAccuracy && (
            <Text
              style={[a.text_2xs, t.atoms.text_contrast_medium, a.mt_2xs]}>
              Accuracy: ±{Math.round(value.positionalAccuracy)}m
            </Text>
          )}
        </View>
      ) : (
        <View style={[a.mt_md, a.gap_sm]}>
          {availableScopes.map(scope => (
            <ScopeOption
              key={scope}
              scope={scope}
              disabled={isCapturing || m8Loading}
              onPress={() => handleSelectScope(scope)}
            />
          ))}

          {m8Loading && (
            <View style={[a.flex_row, a.align_center, a.gap_sm, a.p_sm]}>
              <ActivityIndicator size="small" />
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                Verificando credenciales m8...
              </Text>
            </View>
          )}

          {isCapturing && (
            <View style={[a.flex_row, a.align_center, a.gap_sm, a.p_sm]}>
              <ActivityIndicator size="small" />
              <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                Capturing location...
              </Text>
            </View>
          )}

          {captureError && (
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                {color: t.palette.negative_500},
                a.p_sm,
              ]}>
              {captureError}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

function ScopeOption({
  scope,
  disabled,
  onPress,
}: {
  scope: GeoScope
  disabled: boolean
  onPress: () => void
}) {
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.scopeButton,
        a.p_md,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        a.border,
        {borderColor: t.atoms.border_contrast_low.borderColor},
        disabled && {opacity: 0.5},
      ]}>
      <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
        {GEO_SCOPE_LABELS[scope]}
      </Text>
      <Text
        style={[
          a.text_2xs,
          t.atoms.text_contrast_medium,
          a.mt_2xs,
          {lineHeight: 16},
        ]}>
        {GEO_SCOPE_DESCRIPTIONS[scope]}
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scopeButton: {
    // opacity handled inline
  },
  selectedCard: {
    // background + border handled inline
  },
})
