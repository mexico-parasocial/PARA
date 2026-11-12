import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {type PoliticalAffiliation} from '#/lib/political-affiliations'
import {ThemeProvider} from '#/alf'
import {type app} from '#/lexicons'
import {MyBaseHero} from '../components/MyBaseHero'

jest.mock('#/components/Layout', () => ({
  Center: jest.requireActual('react-native').View,
}))

jest.mock('#/view/com/util/UserAvatar', () => ({
  UserAvatar: ({avatar}: {avatar?: string}) => {
    const {Text} = jest.requireActual('react-native')
    return <Text testID="avatar">{avatar ?? 'default'}</Text>
  },
}))

jest.mock('#/components/CompassMini', () => ({
  CompassMini: () => null,
}))

jest.mock('@bsky.app/react-native-uitextview', () => ({
  UITextView: jest.requireActual('react-native').Text,
}))

const PROFILE = {
  did: 'did:plc:me',
  handle: 'hotmail.test',
  displayName: '',
  avatar: 'https://cdn.example/img/avatar/plain/did:plc:me/bafk@jpeg',
} as app.bsky.actor.defs.ProfileViewDetailed

const AFFILIATIONS: PoliticalAffiliation[] = [
  {id: 'party-pri', type: 'party', name: 'PRI', color: '#CC0000'},
  {id: 'ninth-auth-left', type: 'ninth', name: 'Auth Left', color: '#efb9bb'},
]

function renderHero(affiliations = AFFILIATIONS) {
  const handlers = {
    onPressSettings: jest.fn(),
    onPressCommunities: jest.fn(),
    onPressCompass: jest.fn(),
    onPressBack: jest.fn(),
  }
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <MyBaseHero
          profile={PROFILE}
          civicWeight={{directPower: 3, delegatedPower: 1}}
          affiliations={affiliations}
          {...handlers}
        />
      </ThemeProvider>
    </I18nProvider>,
  )
  return handlers
}

describe('MyBaseHero', () => {
  beforeAll(() => {
    i18n.loadAndActivate({locale: 'en', messages: {}})
  })

  it('shows identity, avatar, affiliations and civic weight', () => {
    renderHero()
    // An empty display name falls back to the handle.
    expect(screen.getByText('hotmail.test')).toBeTruthy()
    expect(screen.getByText('@hotmail.test')).toBeTruthy()
    expect(screen.getByTestId('avatar').props.children).toBe(PROFILE.avatar)
    expect(screen.getByText('PRI')).toBeTruthy()
    expect(screen.getByText('Auth Left')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('Direct power')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    expect(screen.getByText('Delegated power')).toBeTruthy()
  })

  it('wires the banner buttons and affiliation chips', () => {
    const handlers = renderHero()
    fireEvent.press(screen.getByLabelText('Go back'))
    fireEvent.press(screen.getByLabelText('My communities'))
    fireEvent.press(screen.getByLabelText('Account settings'))
    fireEvent.press(screen.getByLabelText('PRI, Party'))
    expect(handlers.onPressBack).toHaveBeenCalled()
    expect(handlers.onPressCommunities).toHaveBeenCalled()
    expect(handlers.onPressSettings).toHaveBeenCalled()
    expect(handlers.onPressCompass).toHaveBeenCalled()
  })

  it('invites choosing affiliations when there are none', () => {
    const handlers = renderHero([])
    fireEvent.press(screen.getByText('Choose your affiliations'))
    expect(handlers.onPressCompass).toHaveBeenCalled()
  })
})
