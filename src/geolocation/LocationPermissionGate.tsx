import {type ReactNode} from 'react'
import {TouchableOpacity, View} from 'react-native'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useLocationPermission} from '#/geolocation/hooks/useLocationPermission'

export type LocationPermissionGateProps = {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Reusable permission gate for location-dependent features.
 *
 * Wrap any component that needs GPS access. If permissions are not
 * granted, renders a fallback UI with a prompt to enable them.
 *
 * Usage:
 * ```tsx
 * <LocationPermissionGate>
 *   <CivicActivityComposer />
 * </LocationPermissionGate>
 * ```
 */
export function LocationPermissionGate({
  children,
  fallback,
}: LocationPermissionGateProps) {
  const {hasPermissions, requestPermissions} = useLocationPermission()

  if (hasPermissions) {
    return children
  }

  if (fallback) {
    return fallback
  }

  return (
    <DefaultPermissionPrompt onRequest={requestPermissions} />
  )
}

function DefaultPermissionPrompt({
  onRequest,
}: {
  onRequest: () => Promise<boolean>
}) {
  const t = useTheme()

  return (
    <View
      style={[
        a.flex_1,
        a.align_center,
        a.justify_center,
        a.p_xl,
        a.gap_md,
      ]}>
      <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
        Ubicación requerida
      </Text>
      <Text
        style={[
          a.text_sm,
          t.atoms.text_contrast_medium,
          a.text_center,
          {maxWidth: 280},
        ]}>
        Esta funcionalidad necesita acceder a tu ubicación para mostrar
        contenido relevante a tu zona.
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => {
          void onRequest()
        }}
        style={[
          a.px_xl,
          a.py_md,
          a.rounded_md,
          {backgroundColor: t.palette.primary_500},
        ]}>
        <Text style={[a.text_sm, a.font_bold, {color: t.palette.contrast_100}]}>
          Permitir acceso
        </Text>
      </TouchableOpacity>
    </View>
  )
}
