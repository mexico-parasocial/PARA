import {useContext} from 'react'
import {Dimensions, Text} from 'react-native'
import {act, render, screen} from '@testing-library/react-native'

import {BreakpointWidthContext} from '#/alf'
import {CENTER_COLUMN_WIDTH} from '#/components/Layout'
import {LoggedOutLayout} from './LoggedOutLayout'

jest.mock('#/components/Layout', () => ({CENTER_COLUMN_WIDTH: 600}))
jest.mock('#/lib/hooks/useIsKeyboardVisible', () => ({
  useIsKeyboardVisible: () => [false],
}))
jest.mock('#/lib/hooks/usePalette', () => ({
  usePalette: () => ({view: {}, viewLight: {}, colors: {}}),
}))
jest.mock('#/lib/hooks/useColorSchemeStyle', () => ({
  useColorSchemeStyle: (style: unknown) => style,
}))

const initialWindow = Dimensions.get('window')

afterEach(() => {
  act(() => Dimensions.set({window: initialWindow}))
})

function WidthProbe() {
  const width = useContext(BreakpointWidthContext)
  return <Text testID="columnWidth">{width}</Text>
}

it('keeps the native header and form in the same responsive column', () => {
  act(() => {
    Dimensions.set({
      window: {width: 1024, height: 768, scale: 2, fontScale: 1},
    })
  })
  render(
    <LoggedOutLayout
      leadin=""
      title="Sign in"
      description=""
      nativeHeader={<Text testID="header">Header</Text>}
      scrollable>
      <WidthProbe />
    </LoggedOutLayout>,
  )

  expect(screen.getByTestId('header')).toBeTruthy()
  expect(screen.getByTestId('columnWidth').props.children).toBe(
    CENTER_COLUMN_WIDTH,
  )
  act(() => {
    Dimensions.set({
      window: {width: 375, height: 768, scale: 2, fontScale: 1},
    })
  })
  expect(screen.getByTestId('columnWidth').props.children).toBe(375)
})
