import {type PropsWithChildren} from 'react'
import {AppState, type AppStateStatus} from 'react-native'
import {setupI18n} from '@lingui/core'
import {I18nProvider} from '@lingui/react'
import {act, fireEvent, render, waitFor} from '@testing-library/react-native'

import {type ChatRecovery} from '#/features/encryptedChat/types'
import {ChatRecoveryPanel} from './ChatRecoveryPanel'

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

function api(): jest.Mocked<ChatRecovery> {
  return {
    getSecurityStatus: jest
      .fn()
      .mockResolvedValue({
        recovery: 'incomplete',
        verification: 'unverified',
        backupExists: true,
        backupEnabled: false,
      }),
    getPendingRecoveryKey: jest.fn().mockResolvedValue(undefined),
    enableRecovery: jest.fn(),
    acknowledgeRecoveryKey: jest.fn().mockResolvedValue(undefined),
    recover: jest.fn().mockResolvedValue(undefined),
    syncKeyBackup: jest.fn().mockResolvedValue(undefined),
  }
}
function panel(recovery: ChatRecovery) {
  const i18n = setupI18n({locale: 'es', messages: {es: {}}})
  return render(
    <I18nProvider i18n={i18n}>
      <ChatRecoveryPanel
        recovery={recovery}
        deviceId="device-test"
        onClose={jest.fn()}
      />
    </I18nProvider>,
  )
}

afterEach(() => jest.restoreAllMocks())

it('hides a pending key until requested and hides it again in the background', async () => {
  const recovery = api()
  recovery.getPendingRecoveryKey.mockResolvedValue({
    key: 'secret-test-key',
    persisted: true,
  })
  let appState!: (state: AppStateStatus) => void
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, listener) => {
      appState = listener
      return {remove: jest.fn()}
    })
  const screen = panel(recovery)
  await waitFor(() =>
    expect(screen.getByLabelText('Mostrar clave')).toBeTruthy(),
  )
  expect(screen.queryByText('secret-test-key')).toBeNull()
  fireEvent.press(screen.getByLabelText('Mostrar clave'))
  expect(screen.getByText('secret-test-key')).toBeTruthy()
  act(() => appState('background'))
  expect(screen.queryByText('secret-test-key')).toBeNull()
  fireEvent.press(screen.getByLabelText('Ya guardé mi clave de recuperación'))
  await waitFor(() =>
    expect(recovery.acknowledgeRecoveryKey).toHaveBeenCalledTimes(1),
  )
  expect(recovery.enableRecovery).not.toHaveBeenCalled()
})

it('clears input on submit and shows actual verification status after recovery', async () => {
  const recovery = api()
  const screen = panel(recovery)
  await waitFor(() =>
    expect(screen.getByText('Dispositivo sin verificar')).toBeTruthy(),
  )
  expect(screen.queryByLabelText('Crear clave de recuperación')).toBeNull()
  fireEvent.changeText(
    screen.getByTestId('chatRecoveryKeyInput'),
    'saved-test-key',
  )
  recovery.getSecurityStatus.mockResolvedValue({
    recovery: 'enabled',
    verification: 'verified',
    backupExists: true,
    backupEnabled: true,
  })
  fireEvent.press(screen.getByLabelText('Recuperar claves en este dispositivo'))
  expect(screen.getByTestId('chatRecoveryKeyInput').props.value).toBe('')
  await waitFor(() =>
    expect(screen.getByText('Dispositivo verificado')).toBeTruthy(),
  )
  expect(recovery.recover).toHaveBeenCalledWith('saved-test-key')
})

it('keeps a generated key visible for saving even if the status refresh fails', async () => {
  const recovery = api()
  recovery.getSecurityStatus
    .mockResolvedValueOnce({
      recovery: 'disabled',
      verification: 'unverified',
      backupExists: false,
      backupEnabled: false,
    })
    .mockRejectedValue(new Error('offline'))
  recovery.enableRecovery.mockResolvedValue({
    key: 'only-copy',
    persisted: false,
  })
  const screen = panel(recovery)
  await waitFor(() =>
    expect(screen.getByLabelText('Crear clave de recuperación')).toBeTruthy(),
  )
  fireEvent.press(screen.getByLabelText('Crear clave de recuperación'))
  await waitFor(() =>
    expect(screen.getByLabelText('Mostrar clave')).toBeTruthy(),
  )
  fireEvent.press(screen.getByLabelText('Mostrar clave'))
  expect(screen.getByText('only-copy')).toBeTruthy()
  expect(screen.getByLabelText('Volver al chat')).toBeDisabled()
})
