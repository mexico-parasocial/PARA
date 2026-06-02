import {useEffect, useMemo, useRef, useState} from 'react'
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {LinearGradient} from 'expo-linear-gradient'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {COMPASS_COLORS, COMPASS_LABEL_COLORS} from '#/lib/compass/compassColors'
import {
  formatNinthPartyBreakdown,
  PARTY_COMPASS_PROFILE_BY_ID,
  PARTY_COMPASS_PROFILES,
  type PartyCompassProfile,
} from '#/lib/compass/party-distributions'
import {
  SIXTY_NINTHS_BY_ID,
  SIXTY_NINTHS_IDEOLOGIES,
  type SixtyNinthsIdeology,
} from '#/lib/compass/sixtyNinths'
import {
  NINTH_NAME_TO_COMPASS_ID,
  POLITICAL_AFFILIATION_OPTIONS,
} from '#/lib/political-affiliations'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {atoms as a, useBreakpoints, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ArrowRotateCounterClockwise_Stroke2_Corner0_Rounded as RecenterIcon} from '#/components/icons/ArrowRotate'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Header, Screen} from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'Compass'>

type Quadrant = {
  id: string
  label: string
  color: string
  labelColor: string
  row: number
  col: number
  isBlank?: boolean
  gradientColors?: string[]
  gradientStart?: {x: number; y: number}
  gradientEnd?: {x: number; y: number}
}

type QuadrantConfig = Omit<Quadrant, 'color' | 'labelColor'>

type Palette = {
  id: string
  name: string
  colors: Record<string, string>
  labelColors?: Record<string, string>
}

type CompassDensityMode = '9ths' | '25ths' | '69ths'

const BASE_QUADRANTS: QuadrantConfig[] = [
  {id: 'auth-left', label: 'Auth Left', row: 0, col: 0},
  {id: 'auth-center', label: 'Auth Center', row: 0, col: 1},
  {id: 'auth-right', label: 'Auth Right', row: 0, col: 2},
  {id: 'center-left', label: 'Center Left', row: 1, col: 0},
  {id: 'center', label: 'Centrist', row: 1, col: 1},
  {id: 'center-right', label: 'Center Right', row: 1, col: 2},
  {id: 'lib-left', label: 'Lib Left', row: 2, col: 0},
  {id: 'lib-center', label: 'Lib Center', row: 2, col: 1},
  {id: 'lib-right', label: 'Lib Right', row: 2, col: 2},
]

const COLOR_PALETTES: Palette[] = [
  {
    id: 'classic',
    name: 'Classic',
    // Source of truth lives in src/lib/compass/compassColors.ts
    colors: COMPASS_COLORS,
    labelColors: COMPASS_LABEL_COLORS,
  },
  {
    id: 'bold',
    name: 'Bold',
    colors: {
      'auth-left': '#d95a63',
      'auth-center': '#8d59c5',
      'auth-right': '#5e8ff0',
      'center-left': '#86b25f',
      center: '#f1ead9',
      'center-right': '#59bfad',
      'lib-left': '#2ebb71',
      'lib-center': '#c7df54',
      'lib-right': '#ecc84c',
    },
    labelColors: {
      'auth-left': '#ffe3e6',
      'auth-center': '#f0e5ff',
      'auth-right': '#eef5ff',
      'center-left': '#16310d',
      center: '#60584a',
      'center-right': '#11322b',
      'lib-left': '#ebfff2',
      'lib-center': '#384000',
      'lib-right': '#4f3900',
    },
  },
]

const CROSS_GRADIENTS: Record<
  string,
  {
    colors: (palette: Palette) => string[]
    start: {x: number; y: number}
    end: {x: number; y: number}
  }
> = {
  'auth-center': {
    colors: palette => [
      palette.colors['auth-left'],
      palette.colors['auth-right'],
    ],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  },
  'center-left': {
    colors: palette => [
      palette.colors['auth-left'],
      palette.colors['lib-left'],
    ],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },
  'center-right': {
    colors: palette => [
      palette.colors['auth-right'],
      palette.colors['lib-right'],
    ],
    start: {x: 0.5, y: 0},
    end: {x: 0.5, y: 1},
  },
  'lib-center': {
    colors: palette => [
      palette.colors['lib-left'],
      palette.colors['lib-right'],
    ],
    start: {x: 0, y: 0.5},
    end: {x: 1, y: 0.5},
  },
}

const SIXTY_NINTHS_GRID_SIZE = 9

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '')
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

const withAlpha = (hex: string, alpha: number) => {
  const {r, g, b} = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const rgbToHex = (r: number, g: number, b: number) => {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const mixColors = (left: string, right: string, ratio: number) => {
  const start = hexToRgb(left)
  const end = hexToRgb(right)
  return rgbToHex(
    start.r + (end.r - start.r) * ratio,
    start.g + (end.g - start.g) * ratio,
    start.b + (end.b - start.b) * ratio,
  )
}

const getReadableTextColor = (background: string) => {
  const {r, g, b} = hexToRgb(background)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.68 ? '#2b2b2b' : '#ffffff'
}

const buildQuadrantStats = (quadrant: Quadrant) => {
  const seed = `${quadrant.id}-${quadrant.row}-${quadrant.col}`
  const hash = seed.split('').reduce((total, char, index) => {
    return total + char.charCodeAt(0) * (index + 3)
  }, 0)

  return {
    users: (hash % 20) + 5,
    active: (hash % 500) + 50,
  }
}

const POLICY_CATEGORIES = [
  {id: 'public-services', label: 'Public Services'},
  {id: 'hacienda', label: 'Hacienda'},
  {id: 'economia', label: 'Economía'},
  {id: 'social-affairs', label: 'Social Affairs'},
  {id: 'external-affairs', label: 'External Affairs'},
  {id: 'internal-affairs', label: 'Internal Affairs'},
] as const

const buildPolicyBreakdown = (quadrantId: string) => {
  const seed = quadrantId.split('').reduce((total, char, index) => {
    return total + char.charCodeAt(0) * (index + 7)
  }, 0)
  // Generate 6 percentages that sum to 100
  const raw = POLICY_CATEGORIES.map((cat, i) => {
    const value = ((seed * (i + 13)) % 47) + 8 // 8–54 range
    return {category: cat, value}
  })
  const total = raw.reduce((sum, r) => sum + r.value, 0)
  return raw.map(r => ({
    ...r.category,
    share: Math.round((r.value / total) * 100),
  }))
}

const buildQuadrants9 = (palette: Palette): Quadrant[] => {
  return BASE_QUADRANTS.map(definition => {
    const gradient = CROSS_GRADIENTS[definition.id]
    const color = palette.colors[definition.id]

    return {
      ...definition,
      color,
      labelColor:
        palette.labelColors?.[definition.id] ?? getReadableTextColor(color),
      gradientColors: gradient?.colors(palette),
      gradientStart: gradient?.start,
      gradientEnd: gradient?.end,
    }
  })
}

const buildQuadrants25 = (palette: Palette): Quadrant[] => {
  const quadrants: Quadrant[] = []
  const quadrants9 = buildQuadrants9(palette)

  // Mapping from 5x5 to center positions (0,2,4 map to original 0,1,2)
  const centerMapping: Record<string, Quadrant> = {}
  quadrants9.forEach(q => {
    const key = `${q.row * 2}-${q.col * 2}`
    centerMapping[key] = q
  })

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const key = `${row}-${col}`
      const existing = centerMapping[key]

      if (existing) {
        quadrants.push({
          ...existing,
          row,
          col,
          gradientColors: undefined,
          gradientStart: undefined,
          gradientEnd: undefined,
        })
      } else {
        const rowPosition = row / 2
        const colPosition = col / 2
        const rowLow = Math.floor(rowPosition)
        const rowHigh = Math.ceil(rowPosition)
        const colLow = Math.floor(colPosition)
        const colHigh = Math.ceil(colPosition)
        const rowRatio = rowPosition - rowLow
        const colRatio = colPosition - colLow

        const topLeft = palette.colors[BASE_QUADRANTS[rowLow * 3 + colLow].id]
        const topRight = palette.colors[BASE_QUADRANTS[rowLow * 3 + colHigh].id]
        const bottomLeft =
          palette.colors[BASE_QUADRANTS[rowHigh * 3 + colLow].id]
        const bottomRight =
          palette.colors[BASE_QUADRANTS[rowHigh * 3 + colHigh].id]
        const topBlend = mixColors(topLeft, topRight, colRatio)
        const bottomBlend = mixColors(bottomLeft, bottomRight, colRatio)
        const color = mixColors(topBlend, bottomBlend, rowRatio)

        quadrants.push({
          id: `pos-${row}-${col}`,
          label: '',
          color,
          labelColor: getReadableTextColor(color),
          row,
          col,
        })
      }
    }
  }

  return quadrants
}

const getInterpolatedColor = (
  palette: Palette,
  row: number,
  col: number,
  gridSize: number,
) => {
  const rowPosition = (row / (gridSize - 1)) * 2
  const colPosition = (col / (gridSize - 1)) * 2
  const rowLow = Math.floor(rowPosition)
  const rowHigh = Math.ceil(rowPosition)
  const colLow = Math.floor(colPosition)
  const colHigh = Math.ceil(colPosition)
  const rowRatio = rowPosition - rowLow
  const colRatio = colPosition - colLow

  const topLeft = palette.colors[BASE_QUADRANTS[rowLow * 3 + colLow].id]
  const topRight = palette.colors[BASE_QUADRANTS[rowLow * 3 + colHigh].id]
  const bottomLeft = palette.colors[BASE_QUADRANTS[rowHigh * 3 + colLow].id]
  const bottomRight = palette.colors[BASE_QUADRANTS[rowHigh * 3 + colHigh].id]
  const topBlend = mixColors(topLeft, topRight, colRatio)
  const bottomBlend = mixColors(bottomLeft, bottomRight, colRatio)
  return mixColors(topBlend, bottomBlend, rowRatio)
}

const buildQuadrants69 = (palette: Palette): Quadrant[] => {
  const quadrants: Quadrant[] = []
  const ideologiesByPosition = new Map(
    SIXTY_NINTHS_IDEOLOGIES.map(item => [`${item.row}-${item.col}`, item]),
  )

  for (let row = 0; row < SIXTY_NINTHS_GRID_SIZE; row++) {
    for (let col = 0; col < SIXTY_NINTHS_GRID_SIZE; col++) {
      const ideology = ideologiesByPosition.get(`${row}-${col}`)
      if (ideology?.kind === 'center') {
        quadrants.push({
          id: `blank-${row}-${col}`,
          label: '',
          color: 'transparent',
          labelColor: 'transparent',
          row,
          col,
          isBlank: true,
        })
      } else if (ideology) {
        const isMainBoard = ideology.kind === 'main'
        const color = isMainBoard
          ? getInterpolatedColor(palette, row, col, 9)
          : '#f6f4ef'
        quadrants.push({
          id: ideology.id,
          label: ideology.label,
          color,
          labelColor: '#111111',
          row,
          col,
          isBlank: ideology.kind !== 'main' ? false : undefined,
        })
      } else {
        quadrants.push({
          id: `blank-${row}-${col}`,
          label: '',
          color: 'transparent',
          labelColor: 'transparent',
          row,
          col,
          isBlank: true,
        })
      }
    }
  }

  return quadrants
}

const INITIAL_SCALE = 1
const MIN_SCALE = 0.5
const MAX_SCALE = 3
const DENSITY_SELECTOR_WIDTH = 258
const DENSITY_SELECTOR_PADDING = 5
const DENSITY_SELECTOR_OPTION_WIDTH =
  (DENSITY_SELECTOR_WIDTH - DENSITY_SELECTOR_PADDING * 2) / 3

const getDensityModeIndex = (mode: CompassDensityMode) => {
  if (mode === '25ths') return 1
  if (mode === '69ths') return 2
  return 0
}

export function CompassScreen({navigation, route}: Props) {
  const {_: translate} = useLingui()
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const {gtMobile} = useBreakpoints()
  const ideologyPromptControl = Prompt.usePromptControl()
  const {affiliations, setAffiliations} = usePoliticalAffiliation()
  const [paletteIndex, _setPaletteIndex] = useState(0)
  const [show69ths, setShow69ths] = useState(false)

  // Affiliation mode: when accessed from MyBase to help user find their position
  const isAffiliateMode = route.params?.mode === 'affiliate'
  const [previewPartyId, setPreviewPartyId] = useState<string | null>(null)
  const [pendingNinthId, setPendingNinthId] = useState<string | null>(null)

  // Custom darker background for cards to match user preference
  // Assuming hex colors for palette, adding alpha for transparency
  // 40 = 25% opacity, 80 = 50% opacity
  // Custom glassmorphism background for cards
  const cardBgColor = {
    backgroundColor:
      t.name === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(15,18,24,0.75)',
    borderWidth: 1,
    borderColor:
      t.name === 'light' ? 'rgba(200,200,200,0.3)' : 'rgba(255,255,255,0.1)',
  }

  const [is25ths, setIs25ths] = useState(false)
  const [selectedQuadrant, setSelectedQuadrant] = useState<Quadrant | null>(
    null,
  )
  const [selectedIdeology, setSelectedIdeology] =
    useState<SixtyNinthsIdeology | null>(null)
  const [_stats, setSelectedQuadrantStats] = useState<{
    users: number
    active: number
  } | null>(null)

  const palette = COLOR_PALETTES[paletteIndex]
  const quadrants9 = useMemo(() => buildQuadrants9(palette), [palette])
  const quadrants25 = useMemo(() => buildQuadrants25(palette), [palette])
  const quadrants69 = useMemo(() => buildQuadrants69(palette), [palette])
  const sixtyNinthsMainCells = useMemo(
    () =>
      quadrants69.filter(
        q =>
          !q.isBlank &&
          q.row < 8 &&
          q.col < 8 &&
          SIXTY_NINTHS_BY_ID[q.id]?.kind === 'main',
      ),
    [quadrants69],
  )
  const sixtyNinthsExtraCells = useMemo(
    () =>
      quadrants69.filter(
        q => !q.isBlank && SIXTY_NINTHS_BY_ID[q.id]?.kind === 'extra',
      ),
    [quadrants69],
  )
  const radicalCenter = SIXTY_NINTHS_BY_ID['radical-centrism']
  const socialLiberalism = SIXTY_NINTHS_BY_ID['social-liberalism']

  const currentQuadrants = show69ths
    ? quadrants69
    : is25ths
      ? quadrants25
      : quadrants9
  const gridDimension = show69ths ? SIXTY_NINTHS_GRID_SIZE : is25ths ? 5 : 3
  const compassMode: CompassDensityMode = show69ths
    ? '69ths'
    : is25ths
      ? '25ths'
      : '9ths'
  const densityOptions: {mode: CompassDensityMode; label: string}[] = [
    {mode: '9ths', label: '9ths'},
    {mode: '25ths', label: '25ths'},
    {mode: '69ths', label: '69ths'},
  ]

  // Animated values stay stable for the lifetime of the screen.
  const pan = useMemo(() => new Animated.ValueXY(), [])
  const scale = useMemo(() => new Animated.Value(INITIAL_SCALE), [])
  const densitySelectorX = useRef(
    new Animated.Value(getDensityModeIndex(compassMode)),
  ).current
  // Track current scale for gesture calculations
  const currentScale = useRef(INITIAL_SCALE)
  useEffect(() => {
    const listenerId = scale.addListener(({value}) => {
      currentScale.current = value
    })

    return () => {
      scale.removeListener(listenerId)
    }
  }, [scale])

  useEffect(() => {
    Animated.spring(densitySelectorX, {
      toValue: getDensityModeIndex(compassMode),
      useNativeDriver: true,
      tension: 180,
      friction: 20,
    }).start()
  }, [compassMode, densitySelectorX])

  // Process route params on mount to zoom/highlight user's position
  const hasProcessedParams = useRef(false)
  useEffect(() => {
    if (hasProcessedParams.current) return
    const params = route.params
    if (!params) return
    hasProcessedParams.current = true

    let targetIs25ths = is25ths
    let targetShow69ths = show69ths

    if (params.initialZoom === '25ths') {
      targetIs25ths = true
      targetShow69ths = false
      setIs25ths(true)
      setShow69ths(false)
    } else if (params.initialZoom === '69ths') {
      targetIs25ths = false
      targetShow69ths = true
      setShow69ths(true)
      setIs25ths(false)
    } else if (params.initialZoom === '9ths') {
      targetIs25ths = false
      targetShow69ths = false
      setIs25ths(false)
      setShow69ths(false)
    }

    const targetQuadrants = targetShow69ths
      ? quadrants69
      : targetIs25ths
        ? quadrants25
        : quadrants9

    if (params.highlightNinth) {
      const quadrant = targetQuadrants.find(q => q.id === params.highlightNinth)
      if (quadrant) {
        setSelectedQuadrant(quadrant)
        setSelectedQuadrantStats(buildQuadrantStats(quadrant))
        if (isAffiliateMode) {
          setPendingNinthId(params.highlightNinth)
        }

        // Highlight without movement — selection state triggers visual feedback
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params, quadrants9, quadrants25, quadrants69, pan, scale])

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          pan.extractOffset()
        },
        onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          pan.flattenOffset()
        },
      }),
    [pan],
  )

  const handleZoom = (factor: number) => {
    const newScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, currentScale.current * factor),
    )
    Animated.spring(scale, {
      toValue: newScale,
      useNativeDriver: false,
    }).start()
  }

  const handleRecenter = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: {x: 0, y: 0},
        useNativeDriver: false,
      }),
      Animated.spring(scale, {
        toValue: INITIAL_SCALE,
        useNativeDriver: false,
      }),
    ]).start()
    setSelectedQuadrant(null)
    setSelectedQuadrantStats(null)
  }

  const handleDensityModeChange = (mode: CompassDensityMode) => {
    setIs25ths(mode === '25ths')
    setShow69ths(mode === '69ths')
    setSelectedQuadrant(null)
    setSelectedQuadrantStats(null)
    setSelectedIdeology(null)
    ideologyPromptControl.close()
    handleRecenter()
  }

  const handleQuadrantPress = (quadrant: Quadrant) => {
    setSelectedQuadrant(quadrant)
    setSelectedQuadrantStats(buildQuadrantStats(quadrant))

    // Selection is now indicated by a subtle light highlight on the cell
    // No pan/scale animation — the grid stays still
  }

  const handleSixtyNinthsPress = (id: string) => {
    const ideology = SIXTY_NINTHS_BY_ID[id]
    if (!ideology) return
    setSelectedIdeology(ideology)
    ideologyPromptControl.open()
  }

  const handleSaveAffiliation = async () => {
    if (!pendingNinthId) return
    const ninthName = Object.entries(NINTH_NAME_TO_COMPASS_ID).find(
      ([, id]) => id === pendingNinthId,
    )?.[0]
    if (!ninthName) return
    const ninthOption = POLITICAL_AFFILIATION_OPTIONS.ninth.find(
      n => n.name === ninthName,
    )
    if (!ninthOption) return
    // Preserve existing affiliations (party, etc.) — only replace the ninth
    const next = affiliations.filter(a => a.type !== 'ninth')
    next.push(ninthOption)
    await setAffiliations(next)
    navigation.goBack()
  }

  const webContentStyle = {
    marginLeft: 'calc(50% - 300px)',
    minHeight: '100%',
    flex: 1,
  }

  const {width} = Dimensions.get('window')
  const gridSize = Math.min(width - 40, 350)
  const cellSize = gridSize / gridDimension
  const sixtyNinthsBoardSize = Math.min(width - (gtMobile ? 80 : -36), 432)
  const sixtyNinthsCellSize = sixtyNinthsBoardSize / 8
  const sixtyNinthsFrameWidth = sixtyNinthsBoardSize + sixtyNinthsCellSize
  const sixtyNinthsFrameHeight = sixtyNinthsBoardSize + sixtyNinthsCellSize

  return (
    <Screen hideBorders>
      <Header.Outer noBottomBorder>
        <Header.BackButton />
        <Header.Content>
          <Header.TitleText style={[a.text_center]}>
            <Trans>Political Compass</Trans>
          </Header.TitleText>
        </Header.Content>
        {isAffiliateMode ? (
          <Header.Slot>
            <Button
              label={translate(msg`Save position`)}
              disabled={!pendingNinthId}
              onPress={handleSaveAffiliation}
              color="primary"
              size="small"
              shape="rectangular">
              <ButtonText>
                <Trans>Save</Trans>
              </ButtonText>
            </Button>
          </Header.Slot>
        ) : (
          <Header.Slot />
        )}
      </Header.Outer>

      <View style={[a.flex_1, gtMobile && web(webContentStyle), t.atoms.bg]}>
        <View style={[a.flex_1, a.w_full, a.relative, a.overflow_hidden]}>
          <View style={[a.flex_1, a.w_full, a.align_center, a.justify_center]}>
            <View style={[{width: 600}, a.relative, a.align_center]}>
              {!show69ths ? (
                <>
                  <Text
                    style={[
                      styles.axisLabel,
                      t.atoms.text_contrast_medium,
                      {top: 80, alignSelf: 'center'},
                    ]}>
                    <Trans>Authoritarian</Trans>
                  </Text>
                  <Text
                    style={[
                      styles.axisLabel,
                      t.atoms.text_contrast_medium,
                      {bottom: 20, alignSelf: 'center'},
                    ]}>
                    <Trans>Libertarian</Trans>
                  </Text>
                  {/* Horizontal labels closer to center */}
                  <View
                    pointerEvents="none"
                    style={[
                      a.absolute,
                      {
                        left: 0,
                        right: 0,
                        top: '50%',
                        height: 40,
                        marginTop: -20,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingHorizontal: 0,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.axisLabel,
                        t.atoms.text_contrast_medium,
                        {position: 'relative', top: 0},
                      ]}>
                      Left
                    </Text>
                    <Text
                      style={[
                        styles.axisLabel,
                        t.atoms.text_contrast_medium,
                        {position: 'relative', top: 0},
                      ]}>
                      Right
                    </Text>
                  </View>
                </>
              ) : null}

              {/* Draggable Grid Container */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.gridContainer,
                  {
                    transform: [
                      {translateX: pan.x},
                      {translateY: pan.y},
                      {scale: scale},
                    ],
                  },
                ]}>
                {show69ths ? (
                  <View
                    style={[
                      styles.sixtyNinthsFrame,
                      {
                        width: sixtyNinthsFrameWidth,
                        height: sixtyNinthsFrameHeight,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.sixtyNinthsAxisLabel,
                        t.atoms.text_contrast_medium,
                        {
                          top: -40,
                          left: sixtyNinthsBoardSize / 2 - 64,
                        },
                      ]}>
                      <Trans>Authoritarian</Trans>
                    </Text>
                    <Text
                      style={[
                        styles.sixtyNinthsAxisLabel,
                        t.atoms.text_contrast_medium,
                        {
                          bottom: -40,
                          left: sixtyNinthsBoardSize / 2 - 54,
                        },
                      ]}>
                      <Trans>Libertarian</Trans>
                    </Text>
                    <Text
                      style={[
                        styles.sixtyNinthsSideLabel,
                        t.atoms.text_contrast_medium,
                        {
                          left: -36,
                          top: sixtyNinthsBoardSize / 2 - 12,
                        },
                      ]}>
                      Left
                    </Text>
                    <Text
                      style={[
                        styles.sixtyNinthsSideLabel,
                        t.atoms.text_contrast_medium,
                        {
                          left: sixtyNinthsBoardSize + 10,
                          top: sixtyNinthsBoardSize / 2 - 12,
                        },
                      ]}>
                      Right
                    </Text>

                    <View
                      style={[
                        styles.sixtyNinthsBoard,
                        {
                          width: sixtyNinthsBoardSize,
                          height: sixtyNinthsBoardSize,
                        },
                      ]}>
                      {sixtyNinthsMainCells.map(quadrant => (
                        <TouchableOpacity
                          key={quadrant.id}
                          accessibilityRole="button"
                          accessibilityLabel={quadrant.label.replaceAll(
                            '\n',
                            ' ',
                          )}
                          accessibilityHint={translate(
                            msg`Opens a brief ideology introduction.`,
                          )}
                          onPress={() => handleSixtyNinthsPress(quadrant.id)}
                          style={[
                            styles.sixtyNinthsCell,
                            {
                              left: quadrant.col * sixtyNinthsCellSize,
                              top: quadrant.row * sixtyNinthsCellSize,
                              width: sixtyNinthsCellSize,
                              height: sixtyNinthsCellSize,
                              backgroundColor: quadrant.color,
                            },
                          ]}>
                          <Text style={styles.sixtyNinthsCellLabel}>
                            {quadrant.label}
                          </Text>
                        </TouchableOpacity>
                      ))}

                      <View
                        pointerEvents="none"
                        style={[
                          styles.centerAxisVertical,
                          {
                            left: sixtyNinthsBoardSize / 2 - 1.5,
                            top: 0,
                            bottom: 0,
                          },
                        ]}
                      />
                      <View
                        pointerEvents="none"
                        style={[
                          styles.centerAxisHorizontal,
                          {
                            top: sixtyNinthsBoardSize / 2 - 1.5,
                            left: 0,
                            right: 0,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={radicalCenter.title}
                        accessibilityHint={translate(
                          msg`Opens a brief ideology introduction.`,
                        )}
                        onPress={() => handleSixtyNinthsPress(radicalCenter.id)}
                        style={[
                          styles.radicalCenterWrap,
                          {
                            left:
                              sixtyNinthsBoardSize / 2 -
                              sixtyNinthsCellSize * 0.55,
                            top:
                              sixtyNinthsBoardSize / 2 -
                              sixtyNinthsCellSize * 0.55,
                            width: sixtyNinthsCellSize * 1.1,
                            height: sixtyNinthsCellSize * 1.1,
                          },
                        ]}>
                        <View style={styles.radicalCenterBox}>
                          <Text style={styles.radicalCenterText}>
                            Radical{'\n'}Centrism
                          </Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={socialLiberalism.title}
                        accessibilityHint={translate(
                          msg`Opens a brief ideology introduction.`,
                        )}
                        onPress={() =>
                          handleSixtyNinthsPress(socialLiberalism.id)
                        }
                        style={[
                          styles.socialLiberalismCell,
                          {
                            left:
                              sixtyNinthsBoardSize / 2 +
                              sixtyNinthsCellSize * 0.5,
                            top:
                              sixtyNinthsBoardSize / 2 +
                              sixtyNinthsCellSize * 0.5,
                            width: sixtyNinthsCellSize * 1.2,
                            height: sixtyNinthsCellSize * 0.78,
                            backgroundColor: getInterpolatedColor(
                              palette,
                              socialLiberalism.row,
                              socialLiberalism.col,
                              9,
                            ),
                          },
                        ]}>
                        <Text style={styles.sixtyNinthsCellLabel}>
                          {socialLiberalism.label}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {sixtyNinthsExtraCells.map(quadrant => (
                      <TouchableOpacity
                        key={quadrant.id}
                        accessibilityRole="button"
                        accessibilityLabel={quadrant.label.replaceAll(
                          '\n',
                          ' ',
                        )}
                        accessibilityHint={translate(
                          msg`Opens a brief ideology introduction.`,
                        )}
                        onPress={() => handleSixtyNinthsPress(quadrant.id)}
                        style={[
                          styles.sixtyNinthsExtraCell,
                          {
                            left: quadrant.col * sixtyNinthsCellSize,
                            top: quadrant.row * sixtyNinthsCellSize,
                            width: sixtyNinthsCellSize,
                            height: sixtyNinthsCellSize,
                          },
                        ]}>
                        <Text style={styles.sixtyNinthsCellLabel}>
                          {quadrant.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View
                    style={[styles.grid, {width: gridSize, height: gridSize}]}>
                    {currentQuadrants.map(quadrant => (
                      <TouchableOpacity
                        key={quadrant.id}
                        accessibilityRole="button"
                        style={[
                          styles.cell,
                          {
                            width: cellSize,
                            height: cellSize,
                            borderWidth: 1,
                            borderColor: 'rgba(0,0,0,0.2)',
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (isAffiliateMode) {
                            setPendingNinthId(quadrant.id)
                            setSelectedQuadrant(quadrant)
                            setSelectedQuadrantStats(
                              buildQuadrantStats(quadrant),
                            )
                          } else {
                            handleQuadrantPress(quadrant)
                          }
                        }}>
                        {quadrant.gradientColors ? (
                          <LinearGradient
                            colors={
                              quadrant.gradientColors as unknown as readonly [
                                string,
                                string,
                                ...string[],
                              ]
                            }
                            start={quadrant.gradientStart}
                            end={quadrant.gradientEnd}
                            style={styles.cellFill}>
                            {quadrant.label ? (
                              <Text
                                style={[
                                  styles.cellLabel,
                                  {
                                    color: quadrant.labelColor,
                                    fontSize: is25ths ? 9 : 12,
                                  },
                                ]}>
                                {quadrant.label}
                              </Text>
                            ) : null}
                          </LinearGradient>
                        ) : (
                          <View
                            style={[
                              styles.cellFill,
                              {
                                backgroundColor: quadrant.color,
                              },
                            ]}>
                            {quadrant.label ? (
                              <Text
                                style={[
                                  styles.cellLabel,
                                  {
                                    color: quadrant.labelColor,
                                    fontSize: is25ths ? 9 : 12,
                                  },
                                ]}>
                                {quadrant.label}
                              </Text>
                            ) : null}
                          </View>
                        )}
                        {/* Party heatmap overlay in affiliate mode */}
                        {isAffiliateMode && previewPartyId && (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.cellOverlay,
                              {
                                backgroundColor: '#000',
                                opacity:
                                  ((PARTY_COMPASS_PROFILE_BY_ID[previewPartyId]
                                    ?.ninthDistribution[quadrant.id] || 0) /
                                    100) *
                                  0.65,
                              },
                            ]}
                          />
                        )}
                        {/* Pending selection ring in affiliate mode - Clean Solid Highlight */}
                        {isAffiliateMode && pendingNinthId === quadrant.id && (
                          <View
                            pointerEvents="none"
                            style={[
                              styles.selectedCellOverlay,
                              {
                                borderColor: t.palette.primary_500,
                                backgroundColor: withAlpha(
                                  t.palette.primary_500,
                                  0.14,
                                ),
                              },
                            ]}>
                            <View style={styles.selectedCellInset} />
                            <View
                              style={[
                                styles.selectedCellBadge,
                                {backgroundColor: t.palette.primary_500},
                              ]}>
                              <Text style={styles.selectedCellBadgeText}>
                                ✓
                              </Text>
                            </View>
                          </View>
                        )}
                        {/* Selected state stays absolute so the sector never moves. */}
                        {!isAffiliateMode &&
                          selectedQuadrant?.id === quadrant.id && (
                            <View
                              pointerEvents="none"
                              style={[
                                styles.selectedCellOverlay,
                                {
                                  borderColor: t.palette.primary_500,
                                  backgroundColor: withAlpha(
                                    t.palette.primary_500,
                                    0.12,
                                  ),
                                },
                              ]}>
                              <View style={styles.selectedCellInset} />
                              <View
                                style={[
                                  styles.selectedCellBadge,
                                  {backgroundColor: t.palette.primary_500},
                                ]}>
                                <Text style={styles.selectedCellBadgeText}>
                                  ✓
                                </Text>
                              </View>
                            </View>
                          )}
                      </TouchableOpacity>
                    ))}

                    <View pointerEvents="none" style={styles.axisOverlay}>
                      <View
                        style={[
                          styles.gridAxisVertical,
                          {
                            left: gridSize / 2 - 1,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.gridAxisHorizontal,
                          {
                            top: gridSize / 2 - 1,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </Animated.View>
            </View>
          </View>
        </View>

        {!isAffiliateMode && (
          <View
            pointerEvents="box-none"
            style={[
              styles.densitySelectorDock,
              {bottom: 86 + insets.bottom},
            ]}>
            <View
              style={[
                styles.densitySelectorWrap,
                cardBgColor,
                web({backdropFilter: 'blur(16px)'}),
                a.shadow_md,
              ]}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.densitySelectorIndicator,
                  {
                    backgroundColor:
                      t.name === 'light'
                        ? 'rgba(255,255,255,0.86)'
                        : 'rgba(255,255,255,0.16)',
                    borderColor:
                      t.name === 'light'
                        ? 'rgba(255,255,255,0.96)'
                        : 'rgba(255,255,255,0.2)',
                    transform: [
                      {
                        translateX: densitySelectorX.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [
                            0,
                            DENSITY_SELECTOR_OPTION_WIDTH,
                            DENSITY_SELECTOR_OPTION_WIDTH * 2,
                          ],
                        }),
                      },
                    ],
                  },
                ]}
              />
              {densityOptions.map(option => {
                const active = compassMode === option.mode
                return (
                  <TouchableOpacity
                    key={option.mode}
                    accessibilityRole="tab"
                    accessibilityState={{selected: active}}
                    onPress={() => handleDensityModeChange(option.mode)}
                    style={styles.densitySelectorOption}>
                    <Text
                      style={[
                        styles.densitySelectorText,
                        t.atoms.text,
                        {opacity: active ? 1 : 0.42},
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Zoom controls – desktop only (bottom-right); on mobile they live in the top-right group below */}
        {gtMobile && (
          <View
            style={[
              a.absolute,
              {right: 20, bottom: 60 + insets.bottom},
              {zIndex: 20},
            ]}>
            <View
              style={[
                styles.zoomControlGroup,
                cardBgColor,
                web({backdropFilter: 'blur(10px)'}),
                a.shadow_md,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={translate(msg`Zoom in`)}
                accessibilityHint={translate(msg`Makes the compass larger.`)}
                onPress={() => handleZoom(1.5)}
                style={styles.zoomControlButton}>
                <PlusIcon width={18} height={18} style={t.atoms.text} />
              </TouchableOpacity>
              <View
                pointerEvents="none"
                style={[
                  styles.zoomControlDivider,
                  {backgroundColor: t.palette.contrast_100},
                ]}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={translate(msg`Zoom out`)}
                accessibilityHint={translate(msg`Makes the compass smaller.`)}
                onPress={() => handleZoom(0.67)}
                style={styles.zoomControlButton}>
                <View
                  style={[
                    styles.minusIcon,
                    {backgroundColor: t.atoms.text.color},
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Recenter & Palette Buttons (+ zoom controls on mobile) */}
        <View style={[a.absolute, {right: 20, top: 20}, {zIndex: 20}]}>
          <View style={[a.gap_sm]}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={handleRecenter}
              style={[
                cardBgColor,
                a.align_center,
                a.justify_center,
                a.shadow_sm,
                styles.recenterButton,
              ]}>
              <RecenterIcon width={18} height={18} style={t.atoms.text} />
            </TouchableOpacity>
            {!gtMobile && (
              <View
                style={[
                  styles.zoomControlGroup,
                  cardBgColor,
                  web({backdropFilter: 'blur(10px)'}),
                  a.shadow_md,
                  a.border,
                  t.atoms.border_contrast_low,
                ]}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={translate(msg`Zoom in`)}
                  accessibilityHint={translate(msg`Makes the compass larger.`)}
                  onPress={() => handleZoom(1.5)}
                  style={styles.zoomControlButton}>
                  <PlusIcon width={18} height={18} style={t.atoms.text} />
                </TouchableOpacity>
                <View
                  pointerEvents="none"
                  style={[
                    styles.zoomControlDivider,
                    {backgroundColor: t.palette.contrast_100},
                  ]}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={translate(msg`Zoom out`)}
                  accessibilityHint={translate(msg`Makes the compass smaller.`)}
                  onPress={() => handleZoom(0.67)}
                  style={styles.zoomControlButton}>
                  <View
                    style={[
                      styles.minusIcon,
                      {backgroundColor: t.atoms.text.color},
                    ]}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Party selection panel (affiliate mode only) */}
        {isAffiliateMode && (
          <View
            style={[
              a.absolute,
              {
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 20,
              },
            ]}>
            {/* Hint text */}
            {!previewPartyId && !pendingNinthId && (
              <View
                style={[
                  a.align_center,
                  a.py_sm,
                  {backgroundColor: t.palette.primary_500 + 'e0'},
                ]}>
                <Text style={[a.text_sm, a.font_bold, {color: '#fff'}]}>
                  <Trans>
                    Tap a party to see where its members cluster, or tap a cell
                    to select your position
                  </Trans>
                </Text>
              </View>
            )}
            {/* Party list */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                a.gap_sm,
                a.px_md,
                a.py_md,
                t.atoms.bg,
                {
                  borderTopWidth: 1,
                  borderTopColor: t.palette.contrast_100,
                },
              ]}>
              {PARTY_COMPASS_PROFILES.map(party => {
                const isActive = previewPartyId === party.id
                return (
                  <TouchableOpacity
                    key={party.id}
                    accessibilityRole="button"
                    onPress={() =>
                      setPreviewPartyId(isActive ? null : party.id)
                    }
                    style={[
                      a.px_md,
                      a.py_sm,
                      a.rounded_md,
                      a.gap_xs,
                      {
                        backgroundColor: isActive
                          ? party.color + '25'
                          : t.palette.contrast_50,
                        borderWidth: isActive ? 2 : 0,
                        borderColor: party.color,
                        minWidth: 110,
                      },
                    ]}>
                    <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 5,
                          backgroundColor: party.color,
                        }}
                      />
                      <Text style={[a.font_bold, a.text_sm, t.atoms.text]}>
                        {party.name}
                      </Text>
                    </View>
                    <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      {party.totalMembers.toLocaleString()} members
                    </Text>
                    {isActive && (
                      <Text
                        style={[a.text_xs, {color: party.color}, a.font_bold]}>
                        {party.descriptors.slice(0, 2).join(' • ')}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* Selected Quadrant Overlay */}
        {selectedQuadrant && !show69ths && (
          <View
            style={[
              a.absolute,
              {
                bottom: isAffiliateMode
                  ? 140 + insets.bottom
                  : gtMobile
                    ? 104
                    : 124 + insets.bottom,
              },
              gtMobile && {right: 40, width: 350},
              !gtMobile && {left: 20, right: 20},
              a.p_lg,
              a.rounded_xl,
              cardBgColor,
              web({backdropFilter: 'blur(12px)'}),
              a.shadow_lg,
            ]}>
            <View
              style={[a.flex_row, a.justify_between, a.align_center, a.mb_md]}>
              <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                <View
                  style={[
                    {
                      width: 24,
                      height: 24,
                      borderRadius: 4,
                      backgroundColor: selectedQuadrant.color,
                    },
                  ]}
                />
                <Text style={[a.text_2xl, a.font_bold, t.atoms.text]}>
                  {selectedQuadrant.label ||
                    `Position ${selectedQuadrant.row}-${selectedQuadrant.col}`}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSelectedQuadrant(null)}
                style={[
                  a.p_xs,
                  a.rounded_full,
                  t.atoms.bg_contrast_25,
                  {
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}>
                <Text
                  style={[
                    a.text_sm,
                    t.atoms.text_contrast_medium,
                    {lineHeight: 14},
                  ]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>

            {isAffiliateMode ? (
              <>
                {/* Party breakdown for this quadrant */}
                <View style={[a.gap_sm, a.mb_md]}>
                  {formatNinthPartyBreakdown(selectedQuadrant.id)
                    .slice(0, 4)
                    .map(
                      ({
                        party,
                        share,
                      }: {
                        party: PartyCompassProfile
                        share: number
                      }) => (
                        <View
                          key={party.id}
                          style={[
                            a.flex_row,
                            a.align_center,
                            a.gap_md,
                            a.mb_sm,
                          ]}>
                          <View style={[a.flex_1]}>
                            <View
                              style={[a.flex_row, a.justify_between, a.mb_xs]}>
                              <Text
                                style={[a.text_sm, a.font_bold, t.atoms.text]}>
                                {party.name}
                              </Text>
                              <Text
                                style={[
                                  a.text_xs,
                                  a.font_bold,
                                  t.atoms.text_contrast_medium,
                                ]}>
                                {share}%
                              </Text>
                            </View>
                            <View
                              style={[
                                {
                                  height: 6,
                                  backgroundColor: t.palette.contrast_100,
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                },
                              ]}>
                              <View
                                style={{
                                  width: `${share}%`,
                                  height: '100%',
                                  backgroundColor: party.color,
                                  borderRadius: 3,
                                }}
                              />
                            </View>
                          </View>
                        </View>
                      ),
                    )}
                </View>
                <Button
                  label={translate(msg`Set as my position`)}
                  onPress={() => {
                    setPendingNinthId(selectedQuadrant.id)
                  }}
                  variant={
                    pendingNinthId === selectedQuadrant.id ? 'solid' : 'outline'
                  }
                  color={
                    pendingNinthId === selectedQuadrant.id
                      ? 'primary'
                      : 'secondary'
                  }
                  size="large"
                  shape="round"
                  style={[a.mt_md]}>
                  <ButtonText style={[a.font_bold]}>
                    {pendingNinthId === selectedQuadrant.id ? (
                      <Trans>✓ Posición confirmada</Trans>
                    ) : (
                      <Trans>Fijar como mi posición</Trans>
                    )}
                  </ButtonText>
                </Button>
              </>
            ) : (
              <>
                <Text
                  style={[
                    a.text_xs,
                    a.font_bold,
                    t.atoms.text_contrast_medium,
                    a.mb_sm,
                  ]}>
                  <Trans>Estimated party distribution</Trans>
                </Text>
                <View style={[a.gap_xs, a.mb_md]}>
                  {formatNinthPartyBreakdown(selectedQuadrant.id)
                    .slice(0, 4)
                    .map(
                      ({
                        party,
                        share,
                      }: {
                        party: PartyCompassProfile
                        share: number
                      }) => (
                        <View
                          key={party.id}
                          style={[a.flex_row, a.align_center, a.gap_sm]}>
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: party.color,
                            }}
                          />
                          <Text style={[a.text_sm, t.atoms.text, a.flex_1]}>
                            {party.name}
                          </Text>
                          <Text
                            style={[
                              a.text_sm,
                              a.font_bold,
                              t.atoms.text_contrast_medium,
                            ]}>
                            {share}%
                          </Text>
                        </View>
                      ),
                    )}
                </View>

                {/* Policy domain breakdown */}
                <Text
                  style={[
                    a.text_xs,
                    a.font_bold,
                    t.atoms.text_contrast_medium,
                    a.mb_sm,
                    a.mt_sm,
                  ]}>
                  <Trans>Policy priorities</Trans>
                </Text>
                <View style={[a.gap_xs, a.mb_sm]}>
                  {buildPolicyBreakdown(selectedQuadrant.id).map(
                    ({id, label, share}) => (
                      <View
                        key={id}
                        style={[a.flex_row, a.align_center, a.gap_sm]}>
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 2,
                            backgroundColor: selectedQuadrant.color + 'cc',
                          }}
                        />
                        <Text style={[a.text_sm, t.atoms.text, a.flex_1]}>
                          {label}
                        </Text>
                        <Text
                          style={[
                            a.text_sm,
                            a.font_bold,
                            t.atoms.text_contrast_medium,
                          ]}>
                          {share}%
                        </Text>
                      </View>
                    ),
                  )}
                </View>
              </>
            )}
          </View>
        )}

        <Prompt.Outer
          control={ideologyPromptControl}
          nativeOptions={{preventExpansion: true}}>
          <Prompt.Content>
            {selectedIdeology ? (
              <>
                <Prompt.TitleText>{selectedIdeology.title}</Prompt.TitleText>
                <Prompt.DescriptionText>
                  {selectedIdeology.shortIntro}
                </Prompt.DescriptionText>
                {selectedIdeology.related?.length ? (
                  <View style={[a.gap_sm]}>
                    <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                      <Trans>Related positions</Trans>
                    </Text>
                    <Text
                      style={[
                        a.text_sm,
                        a.leading_snug,
                        t.atoms.text_contrast_medium,
                      ]}>
                      {selectedIdeology.related
                        .map(id => SIXTY_NINTHS_BY_ID[id]?.title ?? id)
                        .join(', ')}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </Prompt.Content>
        </Prompt.Outer>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  axisLabel: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.7,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  sixtyNinthsFrame: {
    position: 'relative',
    overflow: 'visible',
  },
  sixtyNinthsBoard: {
    position: 'relative',
    backgroundColor: '#f7f2ea',
  },
  sixtyNinthsCell: {
    position: 'absolute',
    borderWidth: 1.25,
    borderColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  sixtyNinthsExtraCell: {
    position: 'absolute',
    backgroundColor: '#f7f4ef',
    borderWidth: 1.25,
    borderColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  socialLiberalismCell: {
    position: 'absolute',
    borderWidth: 1.25,
    borderColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 2,
    zIndex: 4,
  },
  sixtyNinthsCellLabel: {
    fontSize: 7.5,
    lineHeight: 8.5,
    textAlign: 'center',
    fontWeight: '500',
    color: '#111111',
  },
  sixtyNinthsAxisLabel: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '700',
    color: '#cfd5e0',
  },
  sixtyNinthsSideLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '600',
    color: '#aeb6c7',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cellFill: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedCellOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  selectedCellInset: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  selectedCellBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedCellBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  axisOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerAxisVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  centerAxisHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  gridAxisVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(30, 41, 59, 0.42)',
  },
  gridAxisHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(30, 41, 59, 0.42)',
  },
  ideologyOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  radicalCenterWrap: {
    position: 'absolute',
    zIndex: 5,
  },
  ideologyLabelBox: {
    position: 'absolute',
    minHeight: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: 'rgba(70,70,70,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideologyLabelText: {
    fontSize: 9,
    lineHeight: 10,
    color: '#2c2c2c',
    textAlign: 'center',
    fontWeight: '500',
  },
  radicalCenterBox: {
    flex: 1,
    backgroundColor: '#cfcfca',
    borderWidth: 2,
    borderColor: 'rgba(24,24,24,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  radicalCenterText: {
    fontSize: 10,
    lineHeight: 11,
    textAlign: 'center',
    fontWeight: '600',
    color: '#1e1e1e',
  },
  cellLabel: {
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: 12,
  },
  zoomControlGroup: {
    width: 52,
    borderRadius: 14,
    overflow: 'hidden',
  },
  zoomControlButton: {
    width: 52,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomControlDivider: {
    height: 1,
    width: '100%',
  },
  minusIcon: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
  },
  recenterButton: {
    width: 48,
    height: 40,
    borderRadius: 12,
  },
  densitySelectorDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 18,
    alignItems: 'center',
  },
  densitySelectorWrap: {
    flexDirection: 'row',
    width: DENSITY_SELECTOR_WIDTH,
    padding: DENSITY_SELECTOR_PADDING,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
  },
  densitySelectorIndicator: {
    position: 'absolute',
    top: DENSITY_SELECTOR_PADDING,
    bottom: DENSITY_SELECTOR_PADDING,
    left: DENSITY_SELECTOR_PADDING,
    width: DENSITY_SELECTOR_OPTION_WIDTH,
    borderRadius: 17,
    borderWidth: 1,
  },
  densitySelectorOption: {
    width: DENSITY_SELECTOR_OPTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 17,
    zIndex: 1,
  },
  densitySelectorText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '800',
    letterSpacing: 0,
  },
})
