import {type PropsWithChildren, useCallback, useEffect, useState} from 'react'
import {AccessibilityInfo, Image as RNImage, View} from 'react-native'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

import {Logomark} from '#/view/icons/Logomark'
import {atoms as a, useTheme} from '#/alf'
// @ts-expect-error
import splashImagePointer from '../assets/illustrations/illustration-mobile.png'
// @ts-expect-error
import darkSplashImagePointer from '../assets/illustrations/illustration-mobile-dark.png'
/** Startup must not wait longer than this on the splash illustration. */
const SPLASH_IMAGE_TIMEOUT_MS = 2000

const splashImageUri = RNImage.resolveAssetSource(splashImagePointer)!.uri
const darkSplashImageUri = RNImage.resolveAssetSource(
  darkSplashImagePointer,
)!.uri

type Props = {
  isReady: boolean
}

export function Splash(props: PropsWithChildren<Props>) {
  'use no memo'
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const intro = useSharedValue(0)
  const outroLogo = useSharedValue(0)
  const outroApp = useSharedValue(0)
  const outroAppOpacity = useSharedValue(0)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const [reduceMotion, setReduceMotion] = useState<boolean | undefined>(false)
  const isReady =
    props.isReady &&
    isImageLoaded &&
    isLayoutReady &&
    reduceMotion !== undefined

  const isDarkMode = t.name !== 'light'
  const logoBg = t.atoms.bg.backgroundColor

  const logoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
        {
          scale: interpolate(
            outroLogo.get(),
            [0, 0.08, 1],
            [1, 0.8, 500],
            'clamp',
          ),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const reducedLogoAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(intro.get(), [0, 1], [0.8, 1], 'clamp'),
        },
      ],
      opacity: interpolate(intro.get(), [0, 1], [0, 1], 'clamp'),
    }
  })

  const logoWrapperAnimation = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [1, 1, 0, 0],
        'clamp',
      ),
    }
  })

  const appAnimation = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(outroApp.get(), [0, 1], [1.1, 1], 'clamp'),
        },
      ],
      opacity: interpolate(
        outroAppOpacity.get(),
        [0, 0.1, 0.2, 1],
        [0.02, 0.02, 1, 1], // first two values cant be 0 for the iOS blur/glass effects to work, the values obtained by trial and error
        'clamp',
      ),
    }
  })

  const onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])
  const onLoadEnd = useCallback(() => setIsImageLoaded(true), [])

  /*
   * Never let a splash image block startup. `onError` already treats a failed
   * load as "done", but expo-image can also just never report either outcome -
   * observed in dev, where the asset is fetched over HTTP from Metro rather
   * than read from the bundle. Without this the app sits on the splash forever.
   */
  useEffect(() => {
    if (isImageLoaded) return
    const timer = setTimeout(onLoadEnd, SPLASH_IMAGE_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isImageLoaded, onLoadEnd])

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync()
        .then(() => {
          intro.set(
            withTiming(
              1,
              {duration: 400, easing: Easing.out(Easing.cubic)},
              () => {
                'worklet'
                outroLogo.set(
                  withTiming(
                    1,
                    {duration: 1200, easing: Easing.in(Easing.cubic)},
                    () => {
                      runOnJS(onFinish)()
                    },
                  ),
                )
                outroApp.set(
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.inOut(Easing.cubic),
                  }),
                )
                outroAppOpacity.set(
                  withTiming(1, {
                    duration: 1200,
                    easing: Easing.in(Easing.cubic),
                  }),
                )
              },
            ),
          )
        })
        .catch(() => {})
    }
  }, [onFinish, intro, outroLogo, outroApp, outroAppOpacity, isReady])

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false))
  }, [])

  const logoAnimations =
    reduceMotion === true ? reducedLogoAnimation : logoAnimation

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: logoBg,
      }}
      onLayout={onLayout}>
      {!isAnimationComplete && (
        <View style={[a.absolute, a.inset_0]}>
          <Image
            accessibilityIgnoresInvertColors
            onError={onLoadEnd}
            onLoadEnd={onLoadEnd}
            source={{uri: isDarkMode ? darkSplashImageUri : splashImageUri}}
            style={[a.absolute, a.inset_0]}
          />
        </View>
      )}

      {isReady && (
        <>
          <Animated.View style={[{flex: 1}, appAnimation]}>
            {props.children}
          </Animated.View>

          {!isAnimationComplete && (
            <Animated.View
              style={[
                a.absolute,
                a.inset_0,
                logoWrapperAnimation,
                {
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                  transform: [{translateY: -(insets.top / 2)}, {scale: 0.1}], // scale from 1000px to 100px
                },
              ]}>
              <Animated.View style={[logoAnimations]}>
                <Logomark allowVariants={false} fill={logoBg} width={1000} />
              </Animated.View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  )
}
