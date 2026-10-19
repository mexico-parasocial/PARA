import {resolveWebMapProvider} from '../webMapProvider'

it('keeps the civic map usable when Google is selected without a web key', () => {
  expect(resolveWebMapProvider('google', '')).toBe('maplibre')
  expect(resolveWebMapProvider('google', '  ')).toBe('maplibre')
})

it('honors a configured Google preference and explicit MapLibre selection', () => {
  expect(resolveWebMapProvider('google', 'configured-key')).toBe('google')
  expect(resolveWebMapProvider('maplibre', 'configured-key')).toBe('maplibre')
})
