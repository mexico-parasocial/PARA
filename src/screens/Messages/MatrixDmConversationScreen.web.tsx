import {Trans} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * Encrypted Matrix direct conversations on web need the chat iframe's
 * matrix-js-sdk client, which does not host direct rooms yet.
 */
export function MatrixDmConversationScreen() {
  return (
    <Layout.Screen testID="matrixDmConversationScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Conversación cifrada</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={[a.p_xl]}>
        <Text>
          <Trans>
            Por ahora, las conversaciones cifradas se abren desde la app de iOS
            o Android.
          </Trans>
        </Text>
      </Layout.Center>
    </Layout.Screen>
  )
}
