import {Platform} from 'react-native'

export const IS_IOS = Platform.OS === 'ios'
export const IS_ANDROID = Platform.OS === 'android'
export const IS_NATIVE = IS_IOS || IS_ANDROID
export const IS_WEB = !IS_NATIVE
export const isMobileWebMediaQuery = 'only screen and (max-width: 1300px)'
export const isMobileWeb =
  IS_WEB &&
  // @ts-ignore we know window exists -prf
  global.window.matchMedia(isMobileWebMediaQuery)?.matches
export const isIPhoneWeb = IS_WEB && /iPhone/.test(navigator.userAgent)
