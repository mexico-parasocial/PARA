import {Trans} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * Stands in for every chat route when the build has chat off
 * (`EXPO_PUBLIC_CHAT_ENABLED=false`), so a deep link or an old notification
 * lands somewhere that says so instead of a broken chat screen.
 */
export function ChatDisabledScreen() {
  return (
    <Layout.Screen testID="chatDisabledScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Chat</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={[a.p_xl]}>
        <Text>
          <Trans>El chat no está disponible en este servidor por ahora.</Trans>
        </Text>
      </Layout.Center>
    </Layout.Screen>
  )
}
