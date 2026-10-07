import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {ThemeProvider} from '#/alf'
import {CivicTreeFab} from '../components/CivicTreeFab'

let mockGtMobile = false
jest.mock('#/alf', () => ({
  ...jest.requireActual('#/alf'),
  useBreakpoints: () => ({gtMobile: mockGtMobile}),
}))

/*
 * #/alf imports Layout only for its constants; the rest of Layout reaches
 * Reanimated and the native bottom sheet, which do not load under jest.
 */
jest.mock('#/components/Layout', () =>
  jest.requireActual('#/components/Layout/const'),
)
jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))
// Reanimated's native worklets do not load under jest; plain views suffice.
jest.mock('react-native-reanimated', () => {
  const {View} = jest.requireActual('react-native')
  const animation = {duration: () => animation}
  return {
    __esModule: true,
    default: {View},
    FadeIn: animation,
    FadeInDown: animation,
    FadeOut: animation,
  }
})
jest.mock('#/lib/haptics', () => ({useHaptics: () => () => {}}))
jest.mock('#/lib/hooks/useMinimalShellTransform', () => ({
  useMinimalShellFabTransform: () => ({}),
}))
jest.mock('#/lib/custom-animations/PressableScale', () => ({
  PressableScale: jest.requireActual('react-native').Pressable,
}))

/* A pressable with the button's label is all these tests need. */
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({label, onPress, children}: any) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: ({children}: any) => <Text>{children}</Text>,
    ButtonIcon: () => null,
  }
})

i18n.loadAndActivate({locale: 'en', messages: {}})

const icon = () => null

function renderFab(keys: string[]) {
  const presses: Record<string, jest.Mock> = {}
  const actions = keys.map(key => {
    presses[key] = jest.fn()
    return {
      key,
      label: `Action ${key}`,
      menuLabel: `Menu ${key}`,
      hint: '',
      icon,
      onPress: presses[key],
    }
  })
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <CivicTreeFab actions={actions} />
      </ThemeProvider>
    </I18nProvider>,
  )
  return presses
}

describe('CivicTreeFab', () => {
  beforeEach(() => {
    mockGtMobile = false
  })

  it('opens a menu of the actions and runs the chosen one', () => {
    const presses = renderFab(['item', 'collection'])
    expect(screen.queryByText('Menu item')).toBeNull()

    fireEvent.press(screen.getByLabelText('Add to your civic tree'))
    expect(screen.getByText('Menu item')).toBeTruthy()
    expect(screen.getByText('Menu collection')).toBeTruthy()

    fireEvent.press(screen.getByLabelText('Action item'))
    expect(presses.item).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Menu item')).toBeNull()

    fireEvent.press(screen.getByLabelText('Add to your civic tree'))
    fireEvent.press(screen.getByLabelText('Action collection'))
    expect(presses.collection).toHaveBeenCalledTimes(1)
  })

  it('closes the menu when tapping outside it', () => {
    renderFab(['item', 'collection'])
    fireEvent.press(screen.getByLabelText('Add to your civic tree'))
    fireEvent.press(screen.getAllByLabelText('Close add menu')[0])
    expect(screen.queryByText('Menu item')).toBeNull()
  })

  it('runs a single action directly, without a menu', () => {
    const presses = renderFab(['collection'])
    fireEvent.press(screen.getByLabelText('Action collection'))
    expect(presses.collection).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Menu collection')).toBeNull()
  })

  it('renders nothing without actions or on wider layouts', () => {
    renderFab([])
    expect(screen.queryByTestId('civicTreeAddFAB')).toBeNull()
  })

  it('renders nothing on wider layouts, which keep their header buttons', () => {
    mockGtMobile = true
    renderFab(['item', 'collection'])
    expect(screen.queryByLabelText('Add to your civic tree')).toBeNull()
  })
})
