import {ScrollView} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {atoms as a} from '#/alf'
import {MatrixDmRequestList} from '#/components/dms/MatrixDmRequestList'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

/**
 * Matrix DM requests (web). Asking, declining and cancelling work here.
 * Accepting must send the encrypted DM intro (lib/matrix/dmIntro), and on web
 * only the chat iframe's matrix-js-sdk client encrypts; it arrives with the
 * web DM conversation view. A room created without the intro would be left by
 * the requester, so this page does not create one. When it does: matrix-js-sdk
 * (without lazy-loaded members) shares the megolm key only with members it
 * already knows, so wait for the invitee's invite before sending the intro, or
 * the requester cannot decrypt it. matrix-rust-sdk fetches /members first.
 */
export function MatrixDmRequestsScreen() {
  return (
    <Layout.Screen testID="matrixDmRequestsScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Mensajes cifrados</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={[a.flex_1]}>
        <ScrollView>
          <MatrixDmRequestList
            notice={
              <Text>
                <Trans>
                  Por ahora, las solicitudes se aceptan desde la app de iOS o
                  Android.
                </Trans>
              </Text>
            }
          />
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}
