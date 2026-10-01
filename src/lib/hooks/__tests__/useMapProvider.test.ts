import {act, renderHook} from '@testing-library/react-native'

import * as persisted from '#/state/persisted'
import {useSession} from '#/state/session'
import {useMapProvider} from '../useMapProvider'

jest.mock('#/state/persisted', () => ({
  get: jest.fn(),
  write: jest.fn().mockResolvedValue(undefined),
  onUpdate: jest.fn(() => () => {}),
}))

jest.mock('#/state/session', () => ({useSession: jest.fn()}))

beforeEach(() => {
  jest.clearAllMocks()
  jest
    .mocked(useSession)
    .mockReturnValue({hasSession: true} as ReturnType<typeof useSession>)
  jest.mocked(persisted.get).mockReturnValue(undefined)
})

it('updates the selection and saves it without a storage broadcast', () => {
  const {result} = renderHook(() => useMapProvider())
  expect(result.current.provider).toBe('google')

  act(() => result.current.setProvider('maplibre'))

  expect(result.current.provider).toBe('maplibre')
  expect(persisted.write).toHaveBeenCalledWith('mapProvider', 'maplibre')
})

it('restores the saved provider when the setting mounts again', () => {
  jest
    .mocked(persisted.get)
    .mockImplementation(key => (key === 'mapProvider' ? 'maplibre' : undefined))
  const {result} = renderHook(() => useMapProvider())

  expect(result.current.provider).toBe('maplibre')
  expect(result.current.canChangeProvider).toBe(true)
})

it('updates a map that stays mounted while the settings selection changes', () => {
  const map = renderHook(() => useMapProvider())
  const settings = renderHook(() => useMapProvider())

  act(() => settings.result.current.setProvider('maplibre'))

  expect(map.result.current.provider).toBe('maplibre')
  expect(settings.result.current.provider).toBe('maplibre')
})

it('keeps anonymous viewers on MapLibre without changing their saved choice', () => {
  jest
    .mocked(useSession)
    .mockReturnValue({hasSession: false} as ReturnType<typeof useSession>)
  jest
    .mocked(persisted.get)
    .mockImplementation(key => (key === 'mapProvider' ? 'google' : undefined))
  const {result} = renderHook(() => useMapProvider())

  act(() => result.current.setProvider('google'))

  expect(result.current.provider).toBe('maplibre')
  expect(result.current.canChangeProvider).toBe(false)
  expect(persisted.write).not.toHaveBeenCalled()
})
