import {test} from '@e2e-dev/web'
import {expect} from 'e2e'

// The standard MapLibre view needs no tile-provider key or signed-in account.
// Exercise the same shared sheets at desktop and phone widths.
for (const viewport of [
  {width: 1280, height: 900},
  {width: 390, height: 844},
]) {
  test(
    `map provenance and retry at ${viewport.width}px`,
    {requires: ['browser'], tags: ['map'], timeout: 90_000},
    async ({app, browser, screen}) => {
      await browser.setViewport(viewport)
      let unavailable = true
      await browser.route(
        '**/xrpc/com.para.civic.listCabildeos*',
        async route => {
          if (unavailable)
            await route.fulfill({
              status: 503,
              json: {error: 'ServiceUnavailable'},
            })
          else await route.fulfill({json: {cabildeos: []}})
        },
      )
      await app.open('/map?state=Sinaloa&layer=districts')
      if (viewport.width >= 1024) {
        await expect(
          screen.getByRole('tab', 'Districts Federal electoral districts 300'),
        ).toHaveAttribute('aria-selected', 'true')
      }
      await expect(
        screen.getByText(
          'Illustrative district shapes — not official boundaries.',
        ),
      ).toBeVisible()
      await expect(
        screen.getByText(
          'Demo statistics and officeholders — not verified civic facts.',
        ),
      ).toBeVisible()
      await expect(
        screen.getByText(
          'Demo civic activity: the service is unavailable. These are sample results.',
        ),
      ).toBeVisible()

      unavailable = false
      await screen.getByRole('button', 'Retry civic activity').tap()
      await expect(
        screen.getByText(
          'Demo civic activity: the service returned no records. These are sample results.',
        ),
      ).toBeVisible()
      await screen.getByText('Distrito 1', {exact: true}).tap()
      await expect(
        screen.getByText('Discussions explicitly linked to this district.'),
      ).toBeVisible()
      await expect(
        screen.getByText(
          'Illustrative district shapes — not official boundaries.',
        ),
      ).toBeVisible()
      await app.screenshot(`map-district-${viewport.width}px`)
    },
  )
}
