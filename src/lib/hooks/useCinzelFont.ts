import {Platform} from 'react-native'

export const CINZEL_FONT_FAMILY =
  Platform.select({
    ios: 'Cinzel SemiBold',
    android: 'Cinzel-SemiBold',
    default: 'Cinzel-SemiBold',
  }) ?? 'Cinzel-SemiBold'

export function useCinzelFont() {}
