import {useState} from 'react'
import {type StyleProp, View, type ViewStyle} from 'react-native'
import {Image} from 'expo-image'

import {atoms as a} from '#/alf'
import {ButtonIcon} from '#/components/Button'
import {Globe_Stroke2_Corner0_Rounded as GlobeIcon} from '#/components/icons/Globe'
import {type ProfileLink} from '../types'

/**
 * Profile views provide an icon URL. Owner records contain only a blob, so
 * use the globe until the configured AppView supplies an icon URL.
 */
export function linkFaviconUrl(
  link: ProfileLink,
  _did: string | undefined,
): string | undefined {
  if (link.iconUrl) return link.iconUrl
  // Repo blobs have no AppView URL yet; use the globe until the view catches up.
  return undefined
}

/**
 * A link's stored favicon. Shows `fallback` if the CDN won't serve it, for
 * example after the blob is taken down.
 */
export function LinkFavicon({
  uri,
  size,
  fallback,
  style,
}: {
  uri: string
  size: number
  fallback: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return (
    <View style={[a.align_center, a.justify_center, style]}>
      <Image
        source={{uri}}
        style={{width: size, height: size, borderRadius: size / 6}}
        accessibilityIgnoresInvertColors
        onError={() => setFailed(true)}
      />
    </View>
  )
}

/** Fills the slot a `ButtonIcon` would, so favicon and logo pills line up. */
export function ButtonFavicon({uri}: {uri: string}) {
  return (
    <LinkFavicon
      uri={uri}
      size={16}
      fallback={<ButtonIcon icon={GlobeIcon} />}
      // ButtonIcon's slot for small buttons
      style={{width: 17, height: 17, marginHorizontal: -2}}
    />
  )
}
