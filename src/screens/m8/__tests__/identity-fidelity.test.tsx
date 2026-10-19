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

import {
  type AnonymousIdentityCard,
  type ProofBrokerGrant,
  type ProofBrokerProofArtifact,
} from '#/lib/im8/types'
import {ThemeProvider} from '#/alf'
import AnonymousIdentitiesScreen from '../AnonymousIdentitiesScreen'
import ConsentAuditScreen from '../ConsentAuditScreen'
import TrustedIssuersScreen from '../TrustedIssuersScreen'
import WalletScreen from '../WalletScreen'

/*
 * The Identity & Wallet tabs must show only what the m8 broker (mubEZ) and
 * the iM8 wallet really do. These tests feed each tab responses shaped like
 * mubEZ's and check what reaches the screen — including that the simulated
 * fields and controls removed in October 2026 stay gone.
 */

// Layout.Content reaches Reanimated; a plain ScrollView is enough here.
jest.mock('#/components/Layout', () => {
  const {ScrollView} = jest.requireActual('react-native')
  return {
    ...jest.requireActual('#/components/Layout/const'),
    Content: ({children, refreshControl: _r, ...props}: any) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  }
})

// Typography's native text view ships untransformed ESM.
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

jest.mock('#/components/chat/ChatIdentityPill', () => ({
  ChatIdentityPill: () => null,
}))
jest.mock('#/components/germ/GermContactButton', () => ({
  GermContactButton: () => null,
}))
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({navigate: jest.fn()}),
}))

const mockAnonProfile = {id: 'anon-profile-1'}
jest.mock('#/lib/im8/hooks/useAnonymousMode', () => ({
  useAnonymousMode: () => ({profile: mockAnonProfile}),
}))

const mockGetGrants = jest.fn()
const mockPostGrantRevoke = jest.fn()
const mockM8Fetch = jest.fn()
const mockGetAnonymousIdentities = jest.fn()
jest.mock('#/lib/im8', () => ({
  getGrants: (...args: unknown[]) => mockGetGrants(...args),
  postGrantRevoke: (...args: unknown[]) => mockPostGrantRevoke(...args),
  m8Fetch: (...args: unknown[]) => mockM8Fetch(...args),
}))
jest.mock('#/lib/im8/api', () => ({
  m8Fetch: (...args: unknown[]) => mockM8Fetch(...args),
  getAnonymousIdentities: (...args: unknown[]) =>
    mockGetAnonymousIdentities(...args),
  patchAnonymousIdentity: jest.fn(),
  patchAnonymousPostDmPolicy: jest.fn(),
  postAnonymousGermLink: jest.fn(),
  postAnonymousGermUnlink: jest.fn(),
  postAnonymousIdentity: jest.fn(),
}))

i18n.loadAndActivate({locale: 'en', messages: {}})

function wrap(ui: React.ReactElement) {
  return render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">{ui}</ThemeProvider>
    </I18nProvider>,
  )
}

function jsonResponse(body: unknown) {
  return {ok: true, status: 200, json: async () => body}
}

const grant = (over: Partial<ProofBrokerGrant>): ProofBrokerGrant => ({
  id: 'grant-1',
  requestId: 'req-1',
  appId: 'app.cabildeo',
  appName: 'Cabildeo',
  appKind: 'Civic app',
  surface: 'civic',
  requestedClaims: [{type: 'is_age_eligible', disclosure: 'proof-only'}],
  proofMode: 'proof-only',
  status: 'approved',
  reason: 'Check you can vote in this community',
  requestedAt: '2026-09-01T10:00:00.000Z',
  issuedAt: '2026-09-01T10:05:00.000Z',
  lastUsedAt: null,
  expiresAt: null,
  proofArtifactIds: ['proof-1'],
  issuerId: 'm8.broker',
  reviewNote: null,
  ...over,
})

const proof: ProofBrokerProofArtifact = {
  id: 'proof-1',
  grantId: 'grant-1',
  requestId: 'req-1',
  claimType: 'is_age_eligible',
  requestedValue: null,
  outcome: 'verified',
  statement: 'Holder is 18 or older',
  proofMode: 'proof-only',
  issuerId: 'm8.broker',
  verifierId: 'm8.broker',
  audienceAppId: 'app.cabildeo',
  audienceAppName: 'Cabildeo',
  surface: 'civic',
  reference: 'para:alice.test',
  status: 'active',
  issuedAt: '2026-09-01T10:05:00.000Z',
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
}

beforeEach(() => {
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Wallet tab', () => {
  it('shows m8 receipts and grants in iM8 wording, with nothing invented', async () => {
    mockGetGrants.mockResolvedValue({
      grants: [grant({}), grant({id: 'grant-2', status: 'pending'})],
      proofs: [proof],
    })
    wrap(<WalletScreen />)

    expect(await screen.findByText('Holder is 18 or older')).toBeTruthy()
    // iM8's CLAIM_LABELS wording for is_age_eligible
    expect(screen.getAllByText('Age eligible').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Result: Verified · Shared with Cabildeo'),
    ).toBeTruthy()
    expect(screen.getByText('Your credentials live in iM8')).toBeTruthy()
    expect(screen.getByText('Waiting for your approval in iM8.')).toBeTruthy()

    // only the approved grant can be revoked
    expect(screen.getAllByText('Revoke access')).toHaveLength(1)

    // removed simulated fields and controls
    for (const gone of [
      /Ed25519/,
      /device:m8/,
      /sha256:/,
      /Add Credential/i,
      /Unlock/i,
      /Expires/,
    ]) {
      expect(screen.queryByText(gone)).toBeNull()
    }
  })

  it('revokes through m8 only after confirmation, and reports failure', async () => {
    mockGetGrants.mockResolvedValue({grants: [grant({})], proofs: []})
    mockPostGrantRevoke.mockRejectedValue(new Error('Grant not found'))
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    wrap(<WalletScreen />)

    fireEvent.press(await screen.findByLabelText('Revoke access for Cabildeo'))
    expect(mockPostGrantRevoke).not.toHaveBeenCalled()

    const buttons = alert.mock.calls[0][2]!
    await act(async () => {
      buttons.find(b => b.style === 'destructive')!.onPress!()
    })
    await waitFor(() =>
      expect(mockPostGrantRevoke).toHaveBeenCalledWith(
        'grant-1',
        expect.any(String),
      ),
    )
    await waitFor(() =>
      expect(alert).toHaveBeenLastCalledWith(
        'Could not revoke access',
        expect.any(String),
      ),
    )
  })
})

describe('Issuers tab', () => {
  it("lists m8's published issuer keys, read-only", async () => {
    mockM8Fetch.mockResolvedValue(
      jsonResponse([
        {
          did: 'did:web:m8.example',
          keyId: 'key-2026',
          name: 'm8 issuer',
          country: 'MX',
          status: 'active',
          publicKeyPem: '-----BEGIN PUBLIC KEY-----',
          allowedElements: ['age_over_18', 'curp_hash'],
        },
      ]),
    )
    wrap(<TrustedIssuersScreen />)

    expect(await screen.findByText('m8 issuer')).toBeTruthy()
    expect(mockM8Fetch).toHaveBeenCalledWith('/issuers')
    expect(screen.getByText('Key key-2026')).toBeTruthy()
    expect(screen.getByText('Age over 18')).toBeTruthy()
    expect(screen.getByText('CURP (hashed)')).toBeTruthy()
    // the on-device trust settings nothing enforced are gone
    for (const gone of [/Trust Mode/i, /Blocked/, /Whitelist/i, /Country/]) {
      expect(screen.queryByText(gone)).toBeNull()
    }
  })
})

describe('Activity tab', () => {
  it('names the app behind a grant and reads SQLite timestamps', async () => {
    mockM8Fetch.mockResolvedValue(
      jsonResponse({
        ledger: [
          {
            id: 1,
            action: 'Requested',
            targetType: 'grant',
            targetId: 'grant-1',
            detail: {reason: 'Check you can vote'},
            // grantService rows take SQLite's datetime('now') default
            createdAt: '2026-09-01 10:00:00',
          },
        ],
        grants: [{id: 'grant-1', appName: 'Cabildeo'}],
        proofs: [],
        summary: {
          totalRequests: 1,
          activeGrants: 0,
          revokedGrants: 0,
          totalProofs: 0,
          activeProofs: 0,
        },
      }),
    )
    wrap(<ConsentAuditScreen />)

    expect(await screen.findByText('Requested · grant')).toBeTruthy()
    expect(mockM8Fetch).toHaveBeenCalledWith('/ledger')
    expect(screen.getByText('Cabildeo')).toBeTruthy()
    expect(screen.queryByText('grant-1')).toBeNull()
    expect(screen.getByText(/2026/)).toBeTruthy()
  })
})

describe('Anonymous tab', () => {
  const identity = (
    over: Partial<AnonymousIdentityCard>,
  ): AnonymousIdentityCard => ({
    id: 'anon-1',
    displayName: 'Garza',
    avatarSeed: 'seed',
    surface: 'civic',
    communityUri: null,
    status: 'active',
    burnAfter: 'none',
    tier: 'burner',
    deviceTrust: {
      status: 'limited',
      platform: 'ios',
      riskTier: null,
      lastVerifiedAt: null,
    },
    proofBadges: [],
    posts: [],
    germ: null,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    archivedAt: null,
    ...over,
  })

  it('mirrors m8 rules: no archive on the main voice, Germ needs a trusted device', async () => {
    mockGetAnonymousIdentities.mockResolvedValue({
      identities: [
        identity({id: 'main-1', displayName: 'Colibrí', tier: 'main'}),
        identity({}),
      ],
    })
    wrap(<AnonymousIdentitiesScreen />)

    expect(await screen.findByText('Colibrí')).toBeTruthy()
    // archive only exists for the burner
    expect(screen.getAllByLabelText('Archive')).toHaveLength(1)
    // m8's assertTrustedDevice: linking Germ is off on an untrusted device
    for (const button of screen.getAllByLabelText('Link Germ')) {
      expect(button.props.accessibilityState).toEqual({disabled: true})
    }
    // surfaces read as iM8 names them
    expect(screen.getAllByText(/^PARA · Active/).length).toBe(2)
  })
})
