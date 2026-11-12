import {Platform} from 'react-native'

export const CINZEL_FONT_FAMILY =
  Platform.select({
    // The PostScript name is unambiguous. "Cinzel SemiBold" is also a family
    // alias, and the bundled variable font registers the "Cinzel" family too.
    ios: 'Cinzel-SemiBold',
    android: 'Cinzel-SemiBold',
    default: 'Cinzel-SemiBold',
  }) ?? 'Cinzel-SemiBold'

export function useCinzelFont() {}
