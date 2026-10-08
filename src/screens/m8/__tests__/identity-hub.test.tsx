import {Alert} from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native'

import {ThemeProvider} from '#/alf'
import IdentityHubScreen from '../IdentityHubScreen'

/*
 * The hub shows the m8 connection in its header, and the tabs only while the
 * device has an m8 session — without one every tab would just fail to load.
 */

jest.mock('#/components/Layout', () => {
  const {ScrollView, Text, View} = jest.requireActual('react-native')
  return {
    ...jest.requireActual('#/components/Layout/const'),
    Screen: ({children}: any) => <View>{children}</View>,
    Content: ({children}: any) => <ScrollView>{children}</ScrollView>,
    Header: {
      Outer: ({children}: any) => <View>{children}</View>,
      Content: ({children}: any) => <View>{children}</View>,
      Slot: ({children}: any) => <View>{children}</View>,
      BackButton: () => null,
      TitleText: ({children}: any) => <Text>{children}</Text>,
      SubtitleText: ({children}: any) => <Text>{children}</Text>,
    },
  }
})

jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({label, onPress, disabled, children}: any) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        accessibilityState={{disabled: !!disabled}}
        onPress={disabled ? undefined : onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: ({children}: any) => <Text>{children}</Text>,
    ButtonIcon: () => null,
  }
})

jest.mock('#/components/forms/TextField', () => {
  const {TextInput, View} = jest.requireActual('react-native')
  return {
    Root: ({children}: any) => <View>{children}</View>,
    Input: ({label, ...props}: any) => (
      <TextInput accessibilityLabel={label} accessibilityHint="" {...props} />
    ),
  }
})

jest.mock('../WalletScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('../AnonymousIdentitiesScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('../ConsentAuditScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))
jest.mock('../TrustedIssuersScreen', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}))

const mockGetMe = jest.fn()
const mockLogout = jest.fn()
const mockStart = jest.fn()
jest.mock('#/lib/im8', () => ({
  getMe: (...args: unknown[]) => mockGetMe(...args),
  logoutM8: (...args: unknown[]) => mockLogout(...args),
  startM8Session: (...args: unknown[]) => mockStart(...args),
}))

i18n.loadAndActivate({locale: 'en', messages: {}})

function renderHub() {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <IdentityHubScreen />
      </ThemeProvider>
    </I18nProvider>,
  )
}

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

describe('Identity & Wallet hub', () => {
  it('puts the connection in the header and offers the four tabs', async () => {
    mockGetMe.mockResolvedValue({
      session: {did: 'did:plc:alice', handle: 'alice.test'},
    })
    renderHub()

    expect(await screen.findByText(/@alice\.test · did:plc:alice/)).toBeTruthy()
    for (const tab of ['Wallet', 'Anonymous', 'Activity', 'Issuers']) {
      expect(screen.getByLabelText(tab)).toBeTruthy()
    }
    // the old Verify tab and the stacked banner are gone
    expect(screen.queryByLabelText('Verify')).toBeNull()
    expect(screen.queryByText('Connect your identity wallet')).toBeNull()
  })

  it('shows only the connect form when there is no m8 session', async () => {
    mockGetMe.mockRejectedValue(new Error('401'))
    renderHub()

    expect(await screen.findByText('Connect your identity wallet')).toBeTruthy()
    expect(screen.queryByLabelText('Wallet')).toBeNull()
    expect(screen.getByLabelText('Connect').props.accessibilityState).toEqual({
      disabled: true,
    })
  })

  it('asks before disconnecting, and says it only affects this device', async () => {
    mockGetMe.mockResolvedValue({
      session: {did: 'did:plc:alice', handle: 'alice.test'},
    })
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    renderHub()

    fireEvent.press(await screen.findByLabelText('Disconnect from m8'))
    expect(mockLogout).not.toHaveBeenCalled()
    expect(alert.mock.calls[0][1]).toMatch(/This device forgets/)

    await act(async () => {
      alert.mock.calls[0][2]!.find(b => b.style === 'destructive')!.onPress!()
    })
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Connect your identity wallet')).toBeTruthy()
  })
})
