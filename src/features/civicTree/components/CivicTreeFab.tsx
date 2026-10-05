import {type ComponentType, useState} from 'react'
import {Pressable, StyleSheet, View} from 'react-native'
import Animated, {FadeIn, FadeInDown, FadeOut} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {useHaptics} from '#/lib/haptics'
import {useMinimalShellFabTransform} from '#/lib/hooks/useMinimalShellTransform'
import {clamp} from '#/lib/numbers'
import {atoms as a, ios, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {type Props as SVGIconProps} from '#/components/icons/common'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {IS_WEB} from '#/env'

export type CivicTreeFabAction = {
  key: string
  /** Accessibility label, and the name on the button when it is the only action. */
  label: string
  /** Short name for the option shown in the menu; defaults to `label`. */
  menuLabel?: string
  hint: string
  icon: ComponentType<SVGIconProps>
  onPress: () => void
}

/**
 * Phone-only add button shared by the civic trees; wider layouts keep their
 * header buttons. One action runs directly. Several open a menu of labeled
 * options above the button, listed top to bottom in the order given.
 */
export function CivicTreeFab({
  actions,
  testID = 'civicTreeAddFAB',
}: {
  actions: CivicTreeFabAction[]
  testID?: string
}) {
  const {_} = useLingui()
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const {gtMobile} = useBreakpoints()
  const shellTransform = useMinimalShellFabTransform()
  const playHaptic = useHaptics()
  const [open, setOpen] = useState(false)

  if (gtMobile || actions.length === 0) return null

  const single = actions.length === 1 ? actions[0] : undefined
  const menuOpen = open && !single
  const SingleIcon = single?.icon

  return (
    <>
      {menuOpen ? (
        <Animated.View
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={[styles.fixed, a.inset_0, styles.backdrop]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={_(msg`Close add menu`)}
            accessibilityHint=""
            style={[a.flex_1]}
            onPress={() => setOpen(false)}
          />
        </Animated.View>
      ) : null}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.fixed,
          a.align_end,
          a.gap_md,
          {right: 24, bottom: clamp(insets.bottom, 15, 60) + 15},
          shellTransform,
        ]}>
        {menuOpen ? (
          <Animated.View
            entering={FadeInDown.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[a.align_end, a.gap_sm]}>
            {actions.map(action => (
              <View key={action.key} style={[a.rounded_md, t.atoms.shadow_md]}>
                <Button
                  testID={`${testID}-${action.key}`}
                  label={action.label}
                  accessibilityHint={action.hint}
                  variant="solid"
                  color="secondary"
                  size="large"
                  onPress={() => {
                    setOpen(false)
                    action.onPress()
                  }}>
                  <ButtonIcon icon={action.icon} />
                  <ButtonText>{action.menuLabel ?? action.label}</ButtonText>
                </Button>
              </View>
            ))}
          </Animated.View>
        ) : null}
        <PressableScale
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={
            single
              ? single.label
              : menuOpen
                ? _(msg`Close add menu`)
                : _(msg`Add to your civic tree`)
          }
          accessibilityHint={
            single
              ? single.hint
              : _(msg`Shows options for what to add to your civic tree`)
          }
          accessibilityState={single ? undefined : {expanded: menuOpen}}
          onPressIn={ios(() => playHaptic('Light'))}
          onPress={() => {
            playHaptic('Light')
            if (single) {
              single.onPress()
              return
            }
            setOpen(previous => !previous)
          }}
          targetScale={0.9}
          style={[
            styles.fab,
            a.rounded_full,
            a.align_center,
            a.justify_center,
            t.atoms.shadow_md,
            {backgroundColor: t.palette.primary_500},
          ]}>
          {SingleIcon ? (
            <SingleIcon size="lg" fill={t.palette.white} />
          ) : (
            <View style={menuOpen && styles.rotated}>
              <PlusIcon size="lg" fill={t.palette.white} />
            </View>
          )}
        </PressableScale>
      </Animated.View>
    </>
  )
}

const styles = StyleSheet.create({
  fixed: {
    // @ts-expect-error web-only
    position: IS_WEB ? 'fixed' : 'absolute',
    zIndex: 1,
  },
  backdrop: {backgroundColor: 'rgba(0, 0, 0, 0.25)'},
  fab: {width: 56, height: 56},
  rotated: {transform: [{rotate: '45deg'}]},
})
