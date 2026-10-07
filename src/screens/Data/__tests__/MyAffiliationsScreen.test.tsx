import {View} from 'react-native'
import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native'

import {
  inferPoliticalAffiliation,
  type PoliticalAffiliation,
} from '#/lib/political-affiliations'
import {type CommunityBoardView} from '#/state/queries/community-boards'
import {
  PoliticalAffiliationProvider,
  usePoliticalAffiliation,
} from '#/state/shell/political-affiliation'
import {selectMyCommunityBoards} from '#/screens/Communities/myCommunitySelection'
import {ThemeProvider} from '#/alf'
import {MyAffiliationsScreen} from '../MyAffiliationsScreen'

const mockGoBack = jest.fn()
const mockNavigation = {goBack: mockGoBack, navigate: jest.fn()}

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useFocusEffect: (callback: () => void) => {
    const {useEffect} = jest.requireActual('react')
    useEffect(callback, [callback])
  },
}))

jest.mock('#/state/queries/cabildeo', () => ({
  useCabildeosQuery: () => ({data: []}),
}))

jest.mock('#/components/Layout', () => {
  const {View, Text} = jest.requireActual('react-native')
  const Header = {
    Outer: View,
    BackButton: () => null,
    Content: View,
    TitleText: Text,
    Slot: View,
  }
  return {
    ...jest.requireActual('#/components/Layout/const'),
    Screen: View,
    Center: View,
    Header,
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
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint=""
        disabled={disabled}
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})

jest.mock('#/components/PieChart', () => ({PieChart: () => null}))
jest.mock('#/components/icons/Compass', () => ({
  Compass_Stroke2_Corner0_Rounded: () => null,
}))
jest.mock('#/components/icons/Times', () => ({
  TimesLarge_Stroke2_Corner0_Rounded: () => null,
}))

function AffiliationLoadStatus() {
  const {isLoading} = usePoliticalAffiliation()
  return (
    <View testID={isLoading ? 'loading-affiliations' : 'ready-affiliations'} />
  )
}

const STORAGE_KEY = 'para_political_affiliation'
const affiliation = (name: string) => inferPoliticalAffiliation(name)!

async function openAffiliations(initial: PoliticalAffiliation[] = []) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
  const result = render(
    <I18nProvider i18n={i18n}>
      <ThemeProvider theme="light">
        <PoliticalAffiliationProvider>
          <AffiliationLoadStatus />
          <MyAffiliationsScreen />
        </PoliticalAffiliationProvider>
      </ThemeProvider>
    </I18nProvider>,
  )
  await screen.findByTestId('ready-affiliations')
  await waitFor(() => {
    for (const item of initial) {
      expect(screen.getAllByRole('button', {name: item.name})[0]).toBeSelected()
    }
  })
  return result
}

async function saveAffiliations() {
  fireEvent.press(screen.getByRole('button', {name: 'Save changes'}))
  await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1))
  return JSON.parse(
    (await AsyncStorage.getItem(STORAGE_KEY))!,
  ) as PoliticalAffiliation[]
}

beforeEach(async () => {
  jest.clearAllMocks()
  await AsyncStorage.clear()
  i18n.loadAndActivate({locale: 'en', messages: {}})
})

it('preserves a ninth selected before the party and saves the same choices for My Communities', async () => {
  await openAffiliations()
  fireEvent.press(screen.getAllByRole('button', {name: 'Lib Right'})[0])
  fireEvent.press(screen.getByRole('button', {name: 'Morena'}))
  expect(screen.getAllByRole('button', {name: 'Lib Right'})[0]).toBeSelected()
  const saved = await saveAffiliations()
  expect(saved).toEqual([affiliation('Morena'), affiliation('Lib Right')])

  const board = (name: string, quadrant: string): CommunityBoardView => ({
    uri: `at://did:plc:test/com.para.community.board/${name}`,
    cid: '',
    creatorDid: 'did:plc:test',
    communityId: name,
    slug: name,
    name,
    quadrant,
    delegatesChatId: '',
    subdelegatesChatId: '',
    memberCount: 1,
    viewerMembershipState: 'none',
    createdAt: '',
  })
  const party = board('Morena', 'national')
  const ninth = board('Lib Right', 'lib-right')
  expect(
    selectMyCommunityBoards(
      [
        party,
        ninth,
        board('Center Left', 'center-left'),
        board('PAN', 'national'),
      ],
      saved,
    ),
  ).toEqual([party, ninth])
})

it('preserves the saved ninth when replacing a party after reopening the screen', async () => {
  await openAffiliations([affiliation('Morena'), affiliation('Lib Right')])
  expect(screen.queryByText('Suggested by')).toBeNull()
  fireEvent.press(screen.getByRole('button', {name: 'PAN'}))
  expect(screen.getAllByRole('button', {name: 'Lib Right'})[0]).toBeSelected()
  expect(await saveAffiliations()).toEqual([
    affiliation('PAN'),
    affiliation('Lib Right'),
  ])
})

it('does not automatically add a ninth when selecting only a party', async () => {
  await openAffiliations()
  expect(screen.getByText('Set position')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Morena'}))
  expect(screen.queryByText('Center Left • Morena')).toBeNull()
  expect(await saveAffiliations()).toEqual([affiliation('Morena')])
})

it('saves the chosen ninth after selecting a party first', async () => {
  await openAffiliations()
  fireEvent.press(screen.getByRole('button', {name: 'Morena'}))
  fireEvent.press(screen.getAllByRole('button', {name: 'Lib Right'})[0])
  expect(await saveAffiliations()).toEqual([
    affiliation('Morena'),
    affiliation('Lib Right'),
  ])
})

it('preserves the party when changing or removing a ninth', async () => {
  await openAffiliations([affiliation('Morena'), affiliation('Lib Right')])
  fireEvent.press(screen.getAllByRole('button', {name: 'Auth Right'})[0])
  expect(screen.getByRole('button', {name: 'Morena'})).toBeSelected()
  fireEvent.press(screen.getByRole('button', {name: 'Remove 9th affiliation'}))
  expect(await saveAffiliations()).toEqual([affiliation('Morena')])
})

it('preserves the ninth when clearing the party', async () => {
  await openAffiliations([affiliation('Morena'), affiliation('Lib Right')])
  fireEvent.press(screen.getByRole('button', {name: 'Morena'}))
  expect(await saveAffiliations()).toEqual([affiliation('Lib Right')])
})
