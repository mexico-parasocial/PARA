/**
 * Render tests for the map overlay components: the state summary bottom
 * sheet and the VIEW layers panel.
 */
import {fireEvent, render} from '@testing-library/react-native'

import {getDistrictsByState} from '#/lib/constants/electoralDistrictsData'
import {type MapCivicQuery} from '#/state/queries/map-cabildeos'
import {
  BigCitiesDataOverlay,
  DistrictsDataOverlay,
  MapLayersPanel,
  SelectedStateOverlay,
} from '#/screens/Map/MapComponents'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/Circle'
import {MapCivicDataNotice} from '../MapDataNotice'

jest.mock('react-native-reanimated', () => {
  const {View} = require('react-native')
  const noop = () => {}
  const fallback = {
    get(target: Record<string | symbol, unknown>, prop: string | symbol) {
      if (prop in target) return target[prop]
      if (typeof prop === 'symbol') return undefined
      return noop
    },
  }
  const base: Record<string, unknown> = {
    __esModule: true,
    default: new Proxy(
      {View, createAnimatedComponent: (C: unknown) => C},
      fallback,
    ),
    View,
    createAnimatedComponent: (C: unknown) => C,
    useSharedValue: (initial: unknown) => ({
      value: initial,
      set: noop,
      get: () => initial,
    }),
    useAnimatedStyle: () => ({}),
    useDerivedValue: (processor: (v: never) => unknown) => ({
      value: undefined,
      get: () => processor(undefined as never),
    }),
    useReducedMotion: () => true,
    // GestureDetector wires this as its native event handler; gestures never
    // fire in these tests, so a stub shape is enough.
    useEvent: () => ({eventNames: [], listener: noop}),
    runOnJS: (fn: unknown) => fn,
    withTiming: (
      value: unknown,
      _options?: unknown,
      callback?: (finished: boolean) => void,
    ) => {
      callback?.(true)
      return {value}
    },
    FadeInDown: {duration: () => ({build: () => ({})})},
    SlideInDown: {duration: () => ({build: () => ({})})},
    FadeIn: {duration: () => ({build: () => ({})})},
    SlideOutDown: {duration: () => ({build: () => ({})})},
  }
  return new Proxy(base, fallback)
})

// Fabric native view; render a plain RN Text in its place.
jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: ({
    children,
    ...props
  }: React.PropsWithChildren<Record<string, unknown>>) => {
    const {Text} = require('react-native')
    return <Text {...props}>{children}</Text>
  },
}))

// The real module reads `Platform.Version` at module scope, which is
// undefined in the jest-expo environment (it loads eagerly through
// alf/atoms → Layout → Dialog). None of these tests render a dialog.
jest.mock('../../../../modules/bottom-sheet', () => ({
  BottomSheet: () => null,
  BottomSheetNativeComponent: () => null,
  BottomSheetSnapPoint: class BottomSheetSnapPoint {},
}))

jest.mock('react-responsive', () => ({
  useMediaQuery: () => false,
}))

// Android's Expo entry imports asset/font native modules at startup; these
// map sheets only need the same device capability used by persisted settings.
jest.mock('../../../../modules/expo-bluesky-swiss-army', () => ({
  PlatformInfo: {getIsReducedMotionEnabled: () => false},
}))

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn()}),
}))

let mockCivicQuery: MapCivicQuery
let mockPreviewFacts = true
jest.mock('#/state/queries/map-cabildeos', () => ({
  useMapCabildeosQuery: () => mockCivicQuery,
}))
jest.mock('#/lib/services/config', () => ({
  get USE_MOCK_DATA() {
    return mockPreviewFacts
  },
}))
// Read the preview flag at render time for both release and demo scenarios.
jest.mock('../mapData', () =>
  Object.defineProperty(
    {...jest.requireActual('../mapData')},
    'SHOW_MAP_PREVIEW_FACTS',
    {
      get: () => mockPreviewFacts,
    },
  ),
)
beforeEach(() => {
  mockPreviewFacts = true
  mockCivicQuery = {
    data: [],
    provenance: {items: [], source: 'appview', hasMore: false},
    isPending: false,
    isFetching: false,
    isError: false,
    refetch: jest.fn(),
  } as unknown as MapCivicQuery
})

jest.mock('@lingui/react', () => ({
  useLingui: () => ({
    i18n: {locale: 'en'},
    _: (value: {message?: string} | string) =>
      typeof value === 'string' ? value : value.message,
  }),
  // The macro plugin rewrites <Trans> to import from here with the compiled
  // message as a prop.
  Trans: ({
    message,
    children,
  }: {
    message?: React.ReactNode
    children?: React.ReactNode
  }) => message ?? children ?? null,
}))

const insets = {bottom: 0}

describe('SelectedStateOverlay', () => {
  const baseProps = {
    insets,
    onClose: jest.fn(),
    onShowCities: jest.fn(),
    onShowDistricts: jest.fn(),
  }

  it('renders nothing when no state is selected', () => {
    const {queryByText} = render(
      <SelectedStateOverlay {...baseProps} selectedState={null} visible />,
    )
    expect(queryByText('STATE SUMMARY')).toBeNull()
  })

  it('renders the state summary when visible', () => {
    const {getByText, UNSAFE_getByType} = render(
      <SelectedStateOverlay
        {...baseProps}
        selectedState={{name: 'Sinaloa'}}
        visible
      />,
    )

    expect(getByText('STATE SUMMARY')).toBeTruthy()
    expect(getByText('Sinaloa')).toBeTruthy()
    // Falls back to the default demographics entry for states without data.
    expect(getByText('Morena')).toBeTruthy()
    expect(getByText('p/Mexico')).toBeTruthy()
    // Close is an icon-only button; press through the icon.
    fireEvent.press(UNSAFE_getByType(CircleX))
    expect(baseProps.onClose).toHaveBeenCalled()
  })

  it('wires the district and city drill-down actions', () => {
    const {getByText} = render(
      <SelectedStateOverlay
        {...baseProps}
        selectedState={{name: 'Sinaloa'}}
        visible
      />,
    )

    fireEvent.press(getByText(/Explore \d+ districts/))
    expect(baseProps.onShowDistricts).toHaveBeenCalled()

    fireEvent.press(getByText(/Browse \d+ cities|Major cities/))
    expect(baseProps.onShowCities).toHaveBeenCalled()
  })
})

describe('BigCitiesDataOverlay', () => {
  it('lets the viewer choose a city and shows the selected context', () => {
    const onSelectCity = jest.fn()
    const props = {
      selectedState: {name: 'Sinaloa'},
      showCities: true,
      onSelectCity,
      onClose: jest.fn(),
    }
    const {getByRole, getByText, rerender} = render(
      <BigCitiesDataOverlay {...props} selectedCityName={null} />,
    )

    const city = getByRole('button', {name: 'View Mazatlán', selected: false})
    fireEvent.press(city)
    expect(onSelectCity).toHaveBeenCalledWith('Mazatlán')

    rerender(<BigCitiesDataOverlay {...props} selectedCityName="Mazatlán" />)
    expect(
      getByRole('button', {name: 'View Mazatlán', selected: true}),
    ).toBeTruthy()
    expect(getByText('CIUDAD ACTIVA')).toBeTruthy()
  })

  it('hides unsourced city officeholders and population in release mode', () => {
    mockPreviewFacts = false
    const {getByText, queryByText} = render(
      <BigCitiesDataOverlay
        selectedState={{name: 'Sinaloa'}}
        showCities
        selectedCityName="Mazatlán"
        onSelectCity={jest.fn()}
        onClose={jest.fn()}
      />,
    )
    expect(getByText(/Verified statistics and officeholder/)).toBeTruthy()
    expect(queryByText(/Mayor:/)).toBeNull()
    expect(queryByText(/Population:/)).toBeNull()
  })
})

describe('Map civic read states', () => {
  it('shows loading without an empty-result claim', () => {
    mockCivicQuery.data = undefined
    mockCivicQuery.isPending = true
    const {getByText, queryByText} = render(
      <MapCivicDataNotice query={mockCivicQuery} count={0} />,
    )
    expect(getByText(/Loading civic activity/)).toBeTruthy()
    expect(queryByText(/No civic activity/)).toBeNull()
  })

  it('offers retry after a failed read and treats counts as unknown', () => {
    mockCivicQuery.data = undefined
    mockCivicQuery.isError = true
    const {getByText, getByRole, queryByText} = render(
      <MapCivicDataNotice query={mockCivicQuery} count={0} />,
    )
    expect(getByText(/Counts are unknown/)).toBeTruthy()
    expect(queryByText(/No civic activity/)).toBeNull()
    fireEvent.press(getByRole('button', {name: 'Retry civic activity'}))
    expect(mockCivicQuery.refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps cached results clearly stale after refresh failure', () => {
    mockCivicQuery.isError = true
    const {getByText} = render(
      <MapCivicDataNotice query={mockCivicQuery} count={2} />,
    )
    expect(getByText(/Showing the last loaded results/)).toBeTruthy()
  })

  it('identifies sample civic records and allows a real-data retry', () => {
    mockCivicQuery.provenance = {
      items: [],
      source: 'demo',
      hasMore: false,
      demoReason: 'unavailable',
    }
    const {getByText, getByRole} = render(
      <MapCivicDataNotice query={mockCivicQuery} count={2} />,
    )
    expect(
      getByText(/Demo civic activity: the service is unavailable/),
    ).toBeTruthy()
    expect(getByRole('button', {name: 'Retry civic activity'})).toBeTruthy()
  })

  it('does not call a partial empty match a complete absence of activity', () => {
    mockCivicQuery.provenance = {items: [], source: 'appview', hasMore: true}
    const {getByText, queryByText} = render(
      <MapCivicDataNotice query={mockCivicQuery} count={0} />,
    )
    expect(getByText(/Coverage is incomplete/)).toBeTruthy()
    expect(queryByText('No civic activity matches this view.')).toBeNull()
  })
})

it('labels illustrative district shapes and hides seeded district facts in release mode', () => {
  mockPreviewFacts = false
  const district = getDistrictsByState('Sinaloa')[0]
  const {getByText, queryByText} = render(
    <DistrictsDataOverlay
      selectedState={{name: 'Sinaloa'}}
      showDistricts
      selectedDistrictId={district.id}
      onSelectDistrict={jest.fn()}
      onClose={jest.fn()}
      onBackToState={jest.fn()}
    />,
  )
  expect(getByText(/Illustrative district shapes/)).toBeTruthy()
  expect(queryByText(new RegExp(district.currentDeputy))).toBeNull()
  expect(queryByText(/Deputy:/)).toBeNull()
  expect(queryByText(/Registered/)).toBeNull()
})

it('hides seeded statewide indicators in release mode', () => {
  mockPreviewFacts = false
  const {getByText, queryByText} = render(
    <SelectedStateOverlay
      selectedState={{name: 'Sinaloa'}}
      visible
      insets={insets}
      onClose={jest.fn()}
      onShowCities={jest.fn()}
      onShowDistricts={jest.fn()}
    />,
  )
  expect(getByText(/Verified statistics and officeholder/)).toBeTruthy()
  expect(queryByText('Morena')).toBeNull()
  expect(queryByText('Approval')).toBeNull()
})

describe('MapLayersPanel', () => {
  const renderPanel = (overrides: {civicHeatOn?: boolean} = {}) => {
    const onSelectLayer = jest.fn()
    const onToggleCivicHeat = jest.fn()
    const utils = render(
      <MapLayersPanel
        activeLayer="states"
        onSelectLayer={onSelectLayer}
        civicHeatOn={overrides.civicHeatOn ?? false}
        onToggleCivicHeat={onToggleCivicHeat}
        civicPointCount={3}
      />,
    )
    return {...utils, onSelectLayer, onToggleCivicHeat}
  }

  it('lists the map views and reports selections', () => {
    const {getByText, onSelectLayer} = renderPanel()

    expect(getByText('States')).toBeTruthy()
    expect(getByText('Districts')).toBeTruthy()
    expect(getByText('Cities')).toBeTruthy()

    fireEvent.press(getByText('Districts'))
    expect(onSelectLayer).toHaveBeenCalledWith('districts')
  })

  it('offers civic heat as an independent on/off switch, not a view', () => {
    const {getByRole, onSelectLayer, onToggleCivicHeat} = renderPanel()

    const toggle = getByRole('switch')
    expect(toggle.props.accessibilityState.checked).toBe(false)

    fireEvent.press(toggle)
    expect(onToggleCivicHeat).toHaveBeenCalledTimes(1)
    expect(onSelectLayer).not.toHaveBeenCalled()
  })

  it('shows the switch as on while the heat is enabled', () => {
    const {getByRole} = renderPanel({civicHeatOn: true})
    expect(getByRole('switch').props.accessibilityState.checked).toBe(true)
  })
})
