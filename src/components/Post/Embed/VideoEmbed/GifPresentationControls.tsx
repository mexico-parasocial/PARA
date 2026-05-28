import {ActivityIndicator, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import {Button} from '#/components/Button'
import {Fill} from '#/components/Fill'
import {Text} from '#/components/Typography'
import {PlayButtonIcon} from '#/components/video/PlayButtonIcon'
import {IS_WEB} from '#/env'

export function GifPresentationControls({
  isPlaying,
  isLoading,
  togglePlayPause,
}: {
  isPlaying: boolean
  isLoading?: boolean
  togglePlayPause: () => void
}) {
  const {_} = useLingui()

  return (
    <View style={[a.absolute, a.inset_0, a.justify_center, a.align_center]}>
      <Button
        style={[
          a.absolute,
          a.inset_0,
          a.justify_center,
          a.align_center,
          {zIndex: 2},
        ]}
        label={isPlaying ? _(msg`Pause GIF`) : _(msg`Play GIF`)}
        onPress={togglePlayPause}
        accessibilityRole="button"
        accessibilityHint={_(msg`Plays or pauses the GIF`)}>
        {isLoading ? (
          <View style={[a.align_center, a.justify_center]}>
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : !isPlaying ? (
          <PlayButtonIcon />
        ) : (
          <></>
        )}
      </Button>
      {!isPlaying && (
        <Fill
          style={[
            a.absolute,
            a.inset_0,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 1,
            },
          ]}
        />
      )}

      {/* Badge */}
      <View style={styles.altContainer} pointerEvents="none">
        <Text style={styles.alt}>
          <Trans>GIF</Trans>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  altContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: IS_WEB ? 8 : 6,
    paddingVertical: IS_WEB ? 6 : 3,
    position: 'absolute',
    // Related to margin/gap hack. This keeps the alt label in the same position
    // on all platforms
    right: IS_WEB ? 8 : 5,
    bottom: IS_WEB ? 8 : 5,
    zIndex: 2,
  },
  alt: {
    color: 'white',
    fontSize: IS_WEB ? 10 : 7,
    fontWeight: '600',
  },
})
