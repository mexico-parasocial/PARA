/*
 * This is a reimplementation of what exists in our HTML template files
 * already. Once the React tree mounts, this is what gets rendered first, until
 * the app is ready to go.
 */

import {useMemo} from 'react'
import {StyleSheet, View} from 'react-native'
import {type ThemeName} from '@bsky.app/alf'

import {Logomark} from '#/view/icons/Logomark'
import {Logotype} from '#/view/icons/Logotype'
import {atoms as a} from '#/alf'
import {themes} from '#/alf/themes'
import {Text} from '#/components/Typography'

function getInitialTheme(): ThemeName {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('ALF_THEME')
  if (stored === 'dark' || stored === 'dim' || stored === 'light') {
    return stored
  }
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dim'
  }
  return 'light'
}

export function Splash() {
  const themeName = useMemo(() => getInitialTheme(), [])
  const t = themes[themeName]

  return (
    <View
      style={[
        a.fixed,
        a.inset_0,
        a.align_center,
        a.justify_center,
        {backgroundColor: t.atoms.bg.backgroundColor},
      ]}>
      <View style={[a.align_center, {top: -40}]}>
        {/* Logo lockup — same as desktop/web nav */}
        <View style={[a.flex_row, a.align_center, {gap: 6}, a.mb_xl]}>
          <Logomark width={40} fill={t.palette.primary_500} />
          <View style={{paddingTop: 2}}>
            <Logotype width={100} fill={t.atoms.text.color} variant="strong" />
          </View>
        </View>

        {/* Tagline */}
        <Text
          style={[
            a.text_md,
            a.text_center,
            {color: t.atoms.text_contrast_medium?.color || t.atoms.text.color},
          ]}>
          Real people. Real conversations.
        </Text>

        {/* Subtle animated loader line */}
        <View
          style={[styles.loaderTrack, t.atoms.bg_contrast_25, a.mt_xl]}>
          <View
            style={[
              styles.loaderBar,
              {backgroundColor: t.palette.primary_500},
            ]}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  loaderTrack: {
    width: 140,
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  loaderBar: {
    width: '30%',
    height: '100%',
    borderRadius: 1,
  },
})
