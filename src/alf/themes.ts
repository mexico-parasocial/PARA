import {
  createThemes,
  DEFAULT_PALETTE,
  DEFAULT_SUBDUED_PALETTE,
  type Palette,
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

export const themes = {
  lightPalette: DEFAULT_THEMES.light.palette,
  darkPalette: DEFAULT_THEMES.dark.palette,
  dimPalette: DEFAULT_THEMES.dim.palette,
  light: DEFAULT_THEMES.light,
  dark: DEFAULT_THEMES.dark,
  dim: DEFAULT_THEMES.dim,
}

/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const lightPalette = DEFAULT_THEMES.light.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const darkPalette = DEFAULT_THEMES.dark.palette
/**
 * @deprecated use ALF and access palette from `useTheme()`
 */
export const dimPalette = DEFAULT_THEMES.dim.palette
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const light = DEFAULT_THEMES.light
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dark = DEFAULT_THEMES.dark
/**
 * @deprecated use ALF and access theme from `useTheme()`
 */
export const dim = DEFAULT_THEMES.dim
