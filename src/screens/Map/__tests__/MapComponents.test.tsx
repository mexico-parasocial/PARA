/**
 * Render tests for the map overlay components: the state summary bottom
 * sheet and the VIEW layers panel.
 */
import {fireEvent, render} from '@testing-library/react-native'

import {MapLayersPanel, SelectedStateOverlay} from '#/screens/Map/MapComponents'
import {CircleX_Stroke2_Corner0_Rounded as CircleX} from '#/components/icons/CircleX'

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

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn()}),
}))

jest.mock('#/state/queries/cabildeo', () => ({
  useCabildeosQuery: () => ({data: []}),
}))

jest.mock('@lingui/react', () => ({
  useLingui: () => ({i18n: {locale: 'en'}, _: (value: unknown) => value}),
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

describe('MapLayersPanel', () => {
  it('lists every layer and reports selections', () => {
    const onSelectLayer = jest.fn()
    const {getByText} = render(
      <MapLayersPanel activeLayer="states" onSelectLayer={onSelectLayer} />,
    )

    expect(getByText('States')).toBeTruthy()
    expect(getByText('Districts')).toBeTruthy()
    expect(getByText('Cities')).toBeTruthy()
    expect(getByText('Civic')).toBeTruthy()

    fireEvent.press(getByText('Civic'))
    expect(onSelectLayer).toHaveBeenCalledWith('civic')
  })
})
