import {
  createThemes,
  DEFAULT_PALETTE,
  DEFAULT_SUBDUED_PALETTE,
  type Palette,
  type Theme,
} from '@bsky.app/alf'

// Custom palette with overridden primary colors
const CUSTOM_PALETTE: Palette = {
  ...DEFAULT_PALETTE,
  // Override primary colors with custom values
  primary_25: 'rgba(72, 38, 127, 0.08)', // Purple tint
  primary_50: 'rgba(72, 38, 127, 0.12)',
  primary_100: 'rgba(72, 38, 127, 0.20)',
  primary_200: 'rgba(72, 38, 127, 0.35)',
  primary_300: 'rgba(72, 38, 127, 0.50)',
  primary_400: 'rgba(72, 38, 127, 0.70)',
  primary_500: '#474652', // Main color
  primary_600: '#48267F', // From blue4
  primary_700: '#2E2033', // From blue5
  primary_800: '#281D33', // From blue6
  primary_900: '#1a141f',
  primary_950: '#0f0a14',
  primary_975: '#08050a',
}

// Custom subdued palette with same primary colors (for dim theme)
const CUSTOM_SUBDUED_PALETTE: Palette = {
  ...DEFAULT_SUBDUED_PALETTE,
  // Override primary colors with same custom values
  primary_25: 'rgba(72, 38, 127, 0.08)',
  primary_50: 'rgba(72, 38, 127, 0.12)',
  primary_100: 'rgba(72, 38, 127, 0.20)',
  primary_200: 'rgba(72, 38, 127, 0.35)',
  primary_300: 'rgba(72, 38, 127, 0.50)',
  primary_400: 'rgba(72, 38, 127, 0.70)',
  primary_500: '#474652', // Main color
  primary_600: '#48267F', // From blue4
  primary_700: '#2E203B', // From blue5
  primary_800: '#281D33', // From blue6
  primary_900: '#1a141f',
  primary_950: '#0f0a14',
  primary_975: '#08050a',
}

const DEFAULT_THEMES = createThemes({
  defaultPalette: CUSTOM_PALETTE,
  subduedPalette: CUSTOM_SUBDUED_PALETTE,
})

/*
 * On dark schemes, `text_link` resolves through palette inversion to the
 * translucent `primary_400` tints above, which composite to a near-invisible
 * dark purple over the dark backgrounds (~1.3:1 in dim). Keep the brand hue
 * (~263°) but lighten it: ~6.7:1 on dim, ~8.3:1 on dark. Light theme keeps
 * `primary_500`.
 */
export const DARK_SCHEME_LINK_COLOR = '#b394e6'

function withDarkSchemeLinkColor(theme: Theme): Theme {
  if (theme.scheme === 'dark') {
    return {
      ...theme,
      atoms: {
        ...theme.atoms,
        text_link: {color: DARK_SCHEME_LINK_COLOR},
      },
    }
  }
  return theme
}

const THEMES = {
  light: DEFAULT_THEMES.light,
  dark: withDarkSchemeLinkColor(DEFAULT_THEMES.dark),
  dim: withDarkSchemeLinkColor(DEFAULT_THEMES.dim),
}

export const themes = {
  lightPalette: THEMES.light.palette,
  darkPalette: THEMES.dark.palette,
  dimPalette: THEMES.dim.palette,
  light: THEMES.light,
  dark: THEMES.dark,
  dim: THEMES.dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = THEMES.light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = THEMES.dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = THEMES.dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const light = THEMES.light
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dark = THEMES.dark
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dim = THEMES.dim
