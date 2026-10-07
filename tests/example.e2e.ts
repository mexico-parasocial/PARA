import {test} from '@e2e-dev/mobile'
import {expect} from 'e2e'

test('PARA opens on iOS', {requires: ['device']}, async ({app, screen}) => {
  await app.open()
  await expect(screen.getByTestId('signInButton')).toBeVisible()
})
