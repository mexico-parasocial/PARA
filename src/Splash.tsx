import {type PropsWithChildren, useCallback, useEffect, useState} from 'react'
import {
  AccessibilityInfo,
  Image as RNImage,
  StyleSheet,
  View,
} from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {Image} from 'expo-image'
import * as SplashScreen from 'expo-splash-screen'

// @ts-ignore
import splashImagePointer from '../assets/splash/splash-mobile.png'
// @ts-ignore
import darkSplashImagePointer from '../assets/splash/splash-mobile-dark.png'
const splashImageUri = RNImage.resolveAssetSource(splashImagePointer).uri
const darkSplashImageUri = RNImage.resolveAssetSource(
  darkSplashImagePointer,
).uri

type Props = {
  isReady: boolean
  theme?: 'light' | 'dim' | 'dark'
}

export function Splash(props: PropsWithChildren<Props>) {
  'use no memo'
  const overlayOpacity = useSharedValue(1)
  const [isAnimationComplete, setIsAnimationComplete] = useState(false)
  const [isLayoutReady, setIsLayoutReady] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const isReady = props.isReady && isLayoutReady
  const isDarkMode = props.theme && props.theme !== 'light'

  const overlayAnimation = useAnimatedStyle(() => {
    return {
      opacity: overlayOpacity.get(),
    }
  })

  const onFinish = useCallback(() => setIsAnimationComplete(true), [])
  const onLayout = useCallback(() => setIsLayoutReady(true), [])

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync()
        .then(() => {
          overlayOpacity.set(() =>
            withTiming(
              0,
              {
                duration: reduceMotion ? 0 : 220,
                easing: Easing.out(Easing.cubic),
              },
              finished => {
                if (finished) {
                  runOnJS(onFinish)()
                }
              },
            ),
          )
        })
        .catch(() => {
          setIsAnimationComplete(true)
        })
    }
  }, [isReady, onFinish, overlayOpacity, reduceMotion])

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false))
  }, [])

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDarkMode ? '#10141F' : '#F7FAFC',
      }}
      onLayout={onLayout}>
      {isReady && <View style={{flex: 1}}>{props.children}</View>}

      {!isAnimationComplete && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, overlayAnimation]}>
          <Image
            accessibilityIgnoresInvertColors
            source={{uri: isDarkMode ? darkSplashImageUri : splashImageUri}}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}
    </View>
  )
}
