import {i18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, fireEvent, render, screen} from '@testing-library/react-native'

import {
  ECONOMIC_ACTIVITY_FUNDRAISER,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
  SOCIAL_ACTIVITY_ASSEMBLY,
  SOCIAL_ACTIVITY_CABILDEO,
  SOCIAL_ACTIVITY_PEACEFUL_MARCH,
  SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
} from '#/lib/api/para-lexicons'
import {messages as spanish} from '#/locale/locales/es/messages'
import {type CreateCommunityActivityInput} from '#/state/queries/community-activities'
import {CreateCommunityActivityScreen} from '#/screens/Communities/CreateCommunityActivityScreen'

const mockMutate = jest.fn()
const mockNavigation = {replace: jest.fn(), dispatch: jest.fn()}
let mockPending = false
let mockCanOrganize = true
let mockPreventRemove: {enabled: boolean; callback: (event: any) => void}

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: (enabled: boolean, callback: (event: any) => void) => {
    mockPreventRemove = {enabled, callback}
  },
}))
jest.mock('#/state/queries/community-activities', () => ({
  useCommunityOrganizers: () => ({canOrganize: mockCanOrganize}),
  useCreateCommunityActivityMutation: () => ({
    isPending: mockPending,
    mutate: mockMutate,
  }),
}))
jest.mock('#/components/Toast', () => ({show: jest.fn()}))
jest.mock('#/lib/strings/errors', () => ({
  cleanError: (error: Error) => error.message,
}))
jest.mock('#/alf', () => ({
  atoms: {},
  useTheme: () => ({
    atoms: {},
    palette: {
      negative_600: '#c00',
      primary_500: '#00c',
      positive_600: '#060',
      contrast_100: '#ddd',
    },
  }),
}))
jest.mock('#/components/Typography', () => ({
  Text: jest.requireActual('react-native').Text,
}))
jest.mock('#/components/Layout', () => {
  const {View, Text} = jest.requireActual('react-native')
  return {
    Screen: View,
    Center: View,
    Header: {
      Outer: View,
      Content: View,
      TitleText: Text,
      SubtitleText: Text,
      Slot: View,
      BackButton: () => null,
    },
  }
})
jest.mock('#/components/Button', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Button: ({
      label,
      children,
      onPress,
      disabled,
      accessibilityRole,
      accessibilityState,
    }: any) => (
      <Pressable
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={label}
        accessibilityHint=""
        accessibilityState={Object.assign({}, accessibilityState, {disabled})}
        disabled={disabled}
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})
jest.mock('#/components/forms/TextField', () => {
  const {View, Text, TextInput} = jest.requireActual('react-native')
  return {
    Root: View,
    LabelText: Text,
    Input: ({label, onChangeText, ...props}: any) => (
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityHint={props.accessibilityHint ?? ''}
        onChangeText={onChangeText}
      />
    ),
  }
})
jest.mock('#/components/forms/DateField', () => {
  const {TextInput} = jest.requireActual('react-native')
  return {
    DateField: ({label, value, onChangeDate, onBlur, disabled}: any) => (
      <TextInput
        accessibilityLabel={label}
        accessibilityHint=""
        value={value}
        onChangeText={onChangeDate}
        onBlur={onBlur}
        editable={!disabled}
      />
    ),
  }
})
jest.mock('#/components/forms/TimeField', () => {
  const {TextInput} = jest.requireActual('react-native')
  return {
    TimeField: ({label, value, onChangeTime, onConfirm, disabled}: any) => (
      <TextInput
        accessibilityLabel={label}
        accessibilityHint=""
        value={value}
        onChangeText={onChangeTime}
        onBlur={onConfirm}
        editable={!disabled}
      />
    ),
  }
})
jest.mock('#/components/forms/Toggle', () => {
  const {Pressable, Text} = jest.requireActual('react-native')
  return {
    Item: ({label, value, onChange, disabled, children}: any) => (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityHint=""
        accessibilityState={{checked: value, disabled}}
        disabled={disabled}
        onPress={() => onChange(!value)}>
        {children}
      </Pressable>
    ),
    Checkbox: () => null,
    LabelText: Text,
  }
})
jest.mock('#/components/Prompt', () => {
  const {useState} = jest.requireActual('react')
  const {View, Text, Pressable} = jest.requireActual('react-native')
  return {
    usePromptControl: () => {
      const [isOpen, setOpen] = useState(false)
      return {isOpen, open: () => setOpen(true), close: () => setOpen(false)}
    },
    Basic: ({
      control,
      title,
      onConfirm,
      confirmButtonCta,
      cancelButtonCta,
    }: any) =>
      control.isOpen ? (
        <View>
          <Text>{title}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmButtonCta}
            accessibilityHint=""
            onPress={onConfirm}>
            <Text>{confirmButtonCta}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelButtonCta}
            accessibilityHint=""
            onPress={control.close}>
            <Text>{cancelButtonCta}</Text>
          </Pressable>
        </View>
      ) : null,
  }
})

function open(category: 'social' | 'economic' = 'social') {
  const props = {
    route: {
      params: {
        category,
        communityUri: 'at://did:plc:test/com.para.community.board/test',
        communityName: 'Comunidad',
      },
    },
    navigation: mockNavigation,
  } as unknown as Parameters<typeof CreateCommunityActivityScreen>[0]
  const ui = () => (
    <I18nProvider i18n={i18n}>
      <CreateCommunityActivityScreen {...props} />
    </I18nProvider>
  )
  const result = render(ui())
  return {...result, refresh: () => result.rerender(ui())}
}
function next() {
  fireEvent.press(screen.getByRole('button', {name: 'Next'}))
}
function fillBasics() {
  fireEvent.changeText(screen.getByLabelText('Title'), 'Community activity')
  fireEvent.changeText(screen.getByLabelText('Starts'), '2026-10-10')
  next()
}
function saleReview() {
  const view = open('economic')
  fireEvent.press(screen.getByRole('radio', {name: '🛍️ Sale'}))
  next()
  fillBasics()
  fireEvent.changeText(screen.getByLabelText('Item'), 'Book')
  fireEvent.changeText(screen.getByLabelText('Price (MXN)'), '20.50')
  next()
  next()
  return view
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPending = false
  mockCanOrganize = true
  i18n.loadAndActivate({locale: 'en', messages: {}})
})

it('requires a type, validates fields on blur/Next and retains data across steps', () => {
  open()
  next()
  expect(screen.getByText('Choose an activity type.')).toBeTruthy()
  expect(screen.queryByRole('button', {name: 'Publish activity'})).toBeNull()
  fireEvent.press(screen.getByRole('radio', {name: '🕊️ Peaceful march'}))
  next()
  fireEvent(screen.getByLabelText('Title'), 'blur')
  expect(screen.getByText('Add a title.')).toBeTruthy()
  fireEvent.changeText(screen.getByLabelText('Title'), 'March')
  expect(screen.queryByText('Add a title.')).toBeNull()
  fireEvent(screen.getByLabelText('Starts'), 'blur')
  expect(screen.getByText('Choose a valid date and time.')).toBeTruthy()
  fireEvent.changeText(screen.getByLabelText('Starts'), '2026-10-10')
  next()
  next()
  expect(screen.getByText('Say where people meet.')).toBeTruthy()
  fireEvent.changeText(screen.getByLabelText('Meeting point'), 'Plaza')
  next()
  expect(screen.getByRole('button', {name: 'Publish activity'})).toBeTruthy()
  expect(screen.getByText('Plaza')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Edit Basics'}))
  expect(screen.getByLabelText('Title').props.value).toBe('March')
  fireEvent.press(screen.getByRole('button', {name: 'Back'}))
  fireEvent.press(screen.getByRole('radio', {name: '🏛️ Assembly'}))
  next()
  next()
  expect(screen.getByLabelText('Agenda (one item per line)')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Back'}))
  fireEvent.press(screen.getByRole('button', {name: 'Back'}))
  fireEvent.press(screen.getByRole('radio', {name: '🕊️ Peaceful march'}))
  next()
  next()
  expect(screen.getByLabelText('Meeting point').props.value).toBe('Plaza')
})

it('requires online access and allows empty cabildeo documentation', () => {
  open()
  fireEvent.press(screen.getByRole('radio', {name: '🗣️ Cabildeo'}))
  next()
  fillBasics()
  expect(screen.getByText('Meeting documentation (optional)')).toBeTruthy()
  fireEvent.press(screen.getByRole('radio', {name: 'Online'}))
  next()
  expect(screen.getByText('Enter a complete http or https link.')).toBeTruthy()
  fireEvent.changeText(
    screen.getByLabelText('Link to join'),
    'https://example.org/join',
  )
  next()
  expect(screen.getByRole('button', {name: 'Publish activity'})).toBeTruthy()
})

it.each([
  [
    'social',
    '🕊️ Peaceful march',
    SOCIAL_ACTIVITY_PEACEFUL_MARCH,
    {'Meeting point': 'Plaza'},
  ],
  [
    'social',
    '✍️ Signature drive',
    SOCIAL_ACTIVITY_SIGNATURE_DRIVE,
    {
      'Name of the bill, law or initiative': 'Petition',
      'Signatures needed': '100',
    },
  ],
  ['social', '🏛️ Assembly', SOCIAL_ACTIVITY_ASSEMBLY, {}],
  ['social', '🗣️ Cabildeo', SOCIAL_ACTIVITY_CABILDEO, {}],
  [
    'economic',
    '🛍️ Sale',
    ECONOMIC_ACTIVITY_SALE,
    {Item: 'Book', 'Price (MXN)': '20.50'},
  ],
  [
    'economic',
    '🎟️ Raffle',
    ECONOMIC_ACTIVITY_RAFFLE,
    {
      'Ticket price (MXN)': '10',
      'Tickets for sale': '100',
      Prize: 'Bicycle',
      'Draw date': '2026-10-11',
      'How the winner is drawn': 'Sealed urn',
    },
  ],
  [
    'economic',
    '🤝 Fundraiser',
    ECONOMIC_ACTIVITY_FUNDRAISER,
    {'What the money is for': 'Library'},
  ],
] as const)(
  'guides %s %s through review and publication',
  (category, label, kind, fields) => {
    open(category)
    fireEvent.press(screen.getByRole('radio', {name: label}))
    next()
    fillBasics()
    for (const [field, value] of Object.entries(fields))
      fireEvent.changeText(screen.getByLabelText(field), value)
    next()
    if (category === 'economic') {
      next()
      fireEvent.press(
        screen.getByRole('checkbox', {name: 'I commit to this business model'}),
      )
    }
    fireEvent.press(screen.getByRole('button', {name: 'Publish activity'}))
    expect(mockMutate).toHaveBeenCalledTimes(1)
    expect(mockMutate.mock.calls[0][0].record.details.$type).toBe(kind)
  },
)

it('reviews money terms and clears commitment after editing prices', () => {
  saleReview()
  expect(screen.getByText('$20.50 MXN')).toBeTruthy()
  expect(screen.getAllByText('100%')[0]).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Publish activity'}))
  expect(mockMutate).not.toHaveBeenCalled()
  expect(
    screen.getByText('Confirm that you commit to this business model.'),
  ).toBeTruthy()
  fireEvent.press(
    screen.getByRole('checkbox', {name: 'I commit to this business model'}),
  )
  fireEvent.press(screen.getByRole('button', {name: 'Edit Activity details'}))
  fireEvent.changeText(screen.getByLabelText('Price (MXN)'), '25')
  next()
  next()
  expect(screen.getByRole('checkbox').props.accessibilityState.checked).toBe(
    false,
  )
  expect(screen.getByText('$25.00 MXN')).toBeTruthy()
})

it('blocks double submission, preserves a failed publication and retries the same activity', () => {
  const view = saleReview()
  fireEvent.press(
    screen.getByRole('checkbox', {name: 'I commit to this business model'}),
  )
  const publish = screen.getByRole('button', {name: 'Publish activity'})
  fireEvent.press(publish)
  fireEvent.press(publish)
  expect(mockMutate).toHaveBeenCalledTimes(1)
  const input: CreateCommunityActivityInput = mockMutate.mock.calls[0][0]
  expect(input.record.title).toBe('Community activity')
  mockPending = true
  view.refresh()
  expect(
    screen.getByRole('button', {name: 'Publish activity'}).props
      .accessibilityState.disabled,
  ).toBe(true)
  expect(
    screen.getByLabelText('Edit Basics', {
      includeHiddenElements: true,
    }).props.accessibilityState.disabled,
  ).toBe(true)
  expect(
    screen.getByLabelText('Edit Activity details', {
      includeHiddenElements: true,
    }).props.accessibilityState.disabled,
  ).toBe(true)
  mockPending = false
  act(() =>
    mockMutate.mock.calls[0][1].onError(new Error('Network unavailable')),
  )
  view.refresh()
  expect(screen.getByText('Network unavailable')).toBeTruthy()
  expect(screen.getByText('$20.50 MXN')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Publish activity'}))
  expect(mockMutate).toHaveBeenCalledTimes(2)
  expect(mockMutate.mock.calls[1][0].record.details).toEqual(
    input.record.details,
  )
  act(() => mockMutate.mock.calls[1][1].onSuccess({uri: 'at://activity'}))
  expect(mockNavigation.replace).toHaveBeenCalledWith('CommunityActivity', {
    activityUri: 'at://activity',
  })
  expect(mockPreventRemove.enabled).toBe(false)
})

it('confirms before discarding through app navigation', () => {
  open()
  expect(mockPreventRemove.enabled).toBe(false)
  fireEvent.press(screen.getByRole('radio', {name: '🏛️ Assembly'}))
  const action = {type: 'GO_BACK'}
  act(() => mockPreventRemove.callback({data: {action}}))
  expect(screen.getByText('Discard activity?')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Keep editing'}))
  expect(mockNavigation.dispatch).not.toHaveBeenCalled()
  act(() => mockPreventRemove.callback({data: {action}}))
  fireEvent.press(screen.getByRole('button', {name: 'Discard'}))
  expect(mockNavigation.dispatch).toHaveBeenCalledWith(action)
})

it('does not offer creation to unauthorized members', () => {
  mockCanOrganize = false
  open()
  expect(screen.queryByRole('button', {name: 'Next'})).toBeNull()
})
it('renders Spanish guidance and errors from the compiled catalog', () => {
  i18n.loadAndActivate({locale: 'es', messages: spanish})
  open()
  expect(screen.getByText('Registrar actividad cívica')).toBeTruthy()
  fireEvent.press(screen.getByRole('button', {name: 'Siguiente'}))
  expect(screen.getByText('Elige un tipo de actividad.')).toBeTruthy()
  expect(screen.getByRole('radio', {name: '🕊️ Marcha pacífica'})).toBeTruthy()
})
