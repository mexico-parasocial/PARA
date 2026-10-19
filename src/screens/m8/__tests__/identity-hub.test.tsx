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
 * signed-in PARA account has an m8 session — without one every tab would just
 * fail to load. Connecting is DID-bound: it connects the account PARA is
 * using, so a session for any other DID does not count.
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

const mockUseSession = jest.fn()
jest.mock('#/state/session', () => ({
  useSession: () => mockUseSession(),
}))

const mockGetToken = jest.fn()
const mockGetMe = jest.fn()
const mockLogout = jest.fn()
jest.mock('#/lib/im8', () => ({
  getM8AccessToken: (...args: unknown[]) => mockGetToken(...args),
  getMe: (...args: unknown[]) => mockGetMe(...args),
  logoutM8: (...args: unknown[]) => mockLogout(...args),
}))
jest.mock('#/lib/im8/credentials', () => ({
  M8_GRANT_ERROR_KEY: 'm8_grant_error',
  setM8ActiveAccount: jest.fn(async () => {}),
}))
jest.mock('#/lib/im8/credentialStorage', () => ({
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
}))
const mockConnect = jest.fn()
jest.mock('#/lib/im8/grant', () => ({
  connectM8SessionFor: (...args: unknown[]) => mockConnect(...args),
}))

i18n.loadAndActivate({locale: 'en', messages: {}})

const ALICE = {did: 'did:plc:alice', handle: 'alice.test'}

function renderHub() {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <IdentityHubScreen />
      </ThemeProvider>
    </I18nProvider>,
  )
}

beforeEach(() => {
  mockUseSession.mockReturnValue({currentAccount: ALICE})
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
})

function connectedAs(did: string, handle: string) {
  mockGetToken.mockResolvedValue('access-token')
  mockGetMe.mockResolvedValue({session: {did, handle}})
}

describe('Identity & Wallet hub', () => {
  it('puts the connection in the header and offers the four tabs', async () => {
    connectedAs(ALICE.did, ALICE.handle)
    renderHub()

    expect(await screen.findByText(/@alice\.test · did:plc:alice/)).toBeTruthy()
    for (const tab of ['Wallet', 'Anonymous', 'Activity', 'Issuers']) {
      expect(screen.getByLabelText(tab)).toBeTruthy()
    }
    // the old Verify tab and the stacked banner are gone
    expect(screen.queryByLabelText('Verify')).toBeNull()
    expect(screen.queryByText('Connect your identity wallet')).toBeNull()
  })

  it('shows only the connect card for the signed-in account when there is no m8 session', async () => {
    mockGetToken.mockResolvedValue(null)
    renderHub()

    expect(await screen.findByText('Connect your identity wallet')).toBeTruthy()
    expect(screen.getByText('@alice.test')).toBeTruthy()
    expect(screen.queryByLabelText('Wallet')).toBeNull()
  })

  it('connects the current PARA account, then reveals the tabs', async () => {
    mockGetToken.mockResolvedValue(null)
    mockConnect.mockResolvedValue({tokens: true, session: ALICE})
    renderHub()

    fireEvent.press(await screen.findByLabelText('Connect'))
    await waitFor(() =>
      expect(mockConnect).toHaveBeenCalledWith(ALICE.did, expect.any(Function)),
    )
    expect(await screen.findByLabelText('Wallet')).toBeTruthy()
  })

  it("explains a failed connect in the app's words, not the raw code", async () => {
    mockGetToken.mockResolvedValue(null)
    mockConnect.mockRejectedValue(new Error('M8_LOGIN_CANCELLED'))
    renderHub()

    fireEvent.press(await screen.findByLabelText('Connect'))
    expect(
      await screen.findByText('Sign-in was cancelled. You can try again.'),
    ).toBeTruthy()
  })

  it("does not treat another account's m8 session as this account's", async () => {
    connectedAs('did:plc:bob', 'bob.test')
    renderHub()

    expect(await screen.findByText('Connect your identity wallet')).toBeTruthy()
    expect(screen.queryByText(/bob\.test/)).toBeNull()
    expect(screen.queryByLabelText('Wallet')).toBeNull()
  })

  it('asks before disconnecting and says what that does', async () => {
    connectedAs(ALICE.did, ALICE.handle)
    mockLogout.mockResolvedValue(undefined)
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    renderHub()

    fireEvent.press(await screen.findByLabelText('Disconnect from m8'))
    expect(mockLogout).not.toHaveBeenCalled()
    expect(alert.mock.calls[0][1]).toMatch(/signs you out of m8 on this device/)

    await act(async () => {
      alert.mock.calls[0][2]!.find(b => b.style === 'destructive')!.onPress!()
    })
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('Connect your identity wallet')).toBeTruthy()
  })

  it('still disconnects locally, and says so, when the server sign-out fails', async () => {
    connectedAs(ALICE.did, ALICE.handle)
    mockLogout.mockRejectedValue(new Error('M8_LOGOUT_REVOCATION_FAILED'))
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    renderHub()

    fireEvent.press(await screen.findByLabelText('Disconnect from m8'))
    await act(async () => {
      alert.mock.calls[0][2]!.find(b => b.style === 'destructive')!.onPress!()
    })
    expect(
      await screen.findByText(
        'Disconnected on this device. Server sign-out could not be confirmed.',
      ),
    ).toBeTruthy()
    expect(screen.queryByLabelText('Wallet')).toBeNull()
  })
})
