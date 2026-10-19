import {type PropsWithChildren} from 'react'
import {setupI18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, fireEvent, render, waitFor} from '@testing-library/react-native'

import {
  type ChatDeviceVerification,
  type ChatVerificationState,
} from '#/features/encryptedChat/types'
import {ChatVerificationPanel} from './ChatVerificationPanel'

jest.mock('#/alf', () => ({
  atoms: {},
  useTheme: () => ({atoms: {}, palette: {negative_500: 'red'}}),
}))
jest.mock('#/components/Typography', () => ({
  Text: (require('react-native') as typeof import('react-native')).Text,
}))
jest.mock('#/components/Button', () => {
  const {Pressable, Text} =
    require('react-native') as typeof import('react-native')
  return {
    Button: ({
      label,
      disabled,
      onPress,
      children,
    }: PropsWithChildren<{
      label: string
      disabled?: boolean
      onPress?: () => void
    }>) => (
      <Pressable
        accessibilityLabel={label}
        accessibilityHint={label}
        disabled={disabled}
        onPress={onPress}>
        {children}
      </Pressable>
    ),
    ButtonText: Text,
  }
})

function fixture() {
  let listener!: (state: ChatVerificationState) => void
  const unsubscribe = jest.fn()
  const api: jest.Mocked<ChatDeviceVerification> = {
    watch: jest.fn(next => {
      listener = next
      return unsubscribe
    }),
    request: jest.fn().mockResolvedValue(undefined),
    accept: jest.fn().mockResolvedValue(undefined),
    confirm: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  }
  const i18n = setupI18n({locale: 'es', messages: {es: {}}})
  const screen = render(
    <I18nProvider i18n={i18n}>
      <ChatVerificationPanel verification={api} />
    </I18nProvider>,
  )
  return {
    screen,
    api,
    unsubscribe,
    update: (state: ChatVerificationState) => act(() => listener(state)),
  }
}

it('waits for an explicit comparison before confirming and permits rejection', async () => {
  const {screen, api, update} = fixture()
  update({
    status: 'comparing',
    deviceId: 'OTHER',
    symbols: ['1234', '5678', '9012'],
  })
  expect(api.confirm).not.toHaveBeenCalled()
  expect(screen.getByText('1234 · 5678 · 9012')).toBeTruthy()
  fireEvent.press(screen.getByLabelText('Los símbolos no coinciden'))
  await waitFor(() => expect(api.confirm).toHaveBeenCalledWith(false))
  expect(api.confirm).not.toHaveBeenCalledWith(true)
})

it('does not report verification just because the user approved, and cancels on exit', async () => {
  const {screen, api, update, unsubscribe} = fixture()
  update({status: 'comparing', symbols: ['1234', '5678', '9012']})
  fireEvent.press(
    screen.getByLabelText('Los símbolos coinciden en ambos dispositivos'),
  )
  await waitFor(() => expect(api.confirm).toHaveBeenCalledWith(true))
  expect(screen.queryByText(/Verificación completada/)).toBeNull()
  update({status: 'verified'})
  expect(screen.getByText(/Verificación completada/)).toBeTruthy()
  screen.unmount()
  expect(unsubscribe).toHaveBeenCalledTimes(1)
  expect(api.cancel).toHaveBeenCalledTimes(1)
})
