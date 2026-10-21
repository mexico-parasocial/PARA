import {Platform} from 'react-native'

/**
 * On web the broker keeps the refresh token in an HttpOnly cookie, so page
 * scripts never see it. This value stands in for it in credential storage.
 */
export const M8_COOKIE_REFRESH = 'cookie'
export const M8_WEB_COOKIE_REFRESH = Platform.OS === 'web'
