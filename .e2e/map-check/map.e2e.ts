import {test} from '@e2e-dev/mobile'
import {expect} from 'e2e'
test('selected city has exactly one marker', async ({app, screen}) => {
  await expect(screen.getByText('CIUDAD ACTIVA', {exact: true})).toBeVisible()
  await expect(
    screen.getByLabel('Mazatlán, 501,000 · Morena', {exact: true}),
  ).toHaveCount(1)
  await expect(screen.getByLabel('Map pin', {exact: true})).toHaveCount(0)
  await app.screenshot('selected-city')
})
