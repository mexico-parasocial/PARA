import {test} from '@e2e-dev/web'
import {expect} from 'e2e'

test(
  'a visitor can open PARA sign-in',
  {requires: ['browser']},
  async ({app, screen}) => {
    await app.open('/')

    const signIn = screen.getByRole('dialog').getByRole('button', 'Sign in')
    await expect(signIn).toBeVisible()
    await signIn.tap()

    await expect(screen.getByTestId('loginUsernameInput')).toBeVisible()
  },
)
