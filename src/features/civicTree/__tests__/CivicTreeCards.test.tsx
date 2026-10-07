import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {fireEvent, render, screen} from '@testing-library/react-native'

import {ThemeProvider} from '#/alf'
import {
  CivicTreeCards,
  type TreeCardGroup,
  type TreeCardLink,
} from '../components/CivicTreeCards'

jest.mock('#/alf', () => ({
  ...jest.requireActual('#/alf'),
  useBreakpoints: () => ({gtMobile: false}),
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
// TouchableOpacity's animated props hook fails to unmount under jest.
jest.mock(
  'react-native/Libraries/Components/Touchable/TouchableOpacity',
  () => ({
    __esModule: true,
    default: jest.requireActual('react-native').Pressable,
  }),
)
/* A pressable with the button's label is all these tests need. */
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({
      label,
      onPress,
      children,
    }: {
      label: string
      onPress: () => void
      children: React.ReactNode
    }) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint=""
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: ({children}: {children: React.ReactNode}) => (
      <Text>{children}</Text>
    ),
    ButtonIcon: () => null,
  }
})

i18n.loadAndActivate({locale: 'en', messages: {}})

const groups: TreeCardGroup[] = [
  {
    id: 'g',
    title: 'Water',
    color: '#00f',
    cards: [
      {
        id: 'a',
        title: 'Rain capture',
        type: 'policy',
        color: '#0a0',
        summary: 'Collect rain for public buildings.',
      },
      {id: 'b', title: 'Pipe repair', type: 'topic', color: '#a00'},
      {id: 'c', title: 'Unlinked card', type: 'note', color: '#aaa'},
    ],
  },
]
const links: TreeCardLink[] = [
  {id: 'l1', source: 'a', target: 'b', label: 'depends on', color: '#888'},
]

function renderCards(onOpenDetails = jest.fn()) {
  render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <CivicTreeCards
          groups={groups}
          links={links}
          onOpenDetails={onOpenDetails}
        />
      </ThemeProvider>
    </I18nProvider>,
  )
  return onOpenDetails
}

describe('CivicTreeCards selection panel', () => {
  it('shows nothing until a card is selected', () => {
    renderCards()
    expect(screen.queryByLabelText('Open details')).toBeNull()
  })

  it('describes the selected card and its connections', () => {
    renderCards()
    fireEvent.press(screen.getByLabelText('Rain capture'))
    expect(screen.getByText('Collect rain for public buildings.')).toBeTruthy()
    expect(
      screen.getByLabelText('Rain capture depends on Pipe repair'),
    ).toBeTruthy()
  })

  it('says when a card has no visible connections', () => {
    renderCards()
    fireEvent.press(screen.getByLabelText('Unlinked card'))
    expect(
      screen.getByText('No visible connections for this card.'),
    ).toBeTruthy()
  })

  it('follows a connection and opens the details of the new card', () => {
    const onOpenDetails = renderCards()
    fireEvent.press(screen.getByLabelText('Rain capture'))
    fireEvent.press(
      screen.getByLabelText('Rain capture depends on Pipe repair'),
    )
    fireEvent.press(screen.getByLabelText('Open details'))
    expect(onOpenDetails).toHaveBeenCalledWith('b')
  })

  it('clears the selection', () => {
    renderCards()
    fireEvent.press(screen.getByLabelText('Rain capture'))
    fireEvent.press(screen.getByLabelText('Clear selection'))
    expect(screen.queryByLabelText('Open details')).toBeNull()
  })
})
