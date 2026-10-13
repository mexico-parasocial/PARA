import {Trans} from '@lingui/react/macro'
import {useRoute} from '@react-navigation/native'

import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {NativeChatRoom} from '#/screens/Communities/NativeChatRoom'
import {atoms as a} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {E2EE_ENGINE_ENABLED} from '#/features/encryptedChat/types'

/** An encrypted Matrix direct conversation (native engine). */
export function MatrixDmConversationScreen() {
  const route = useRoute<{
    key: string
    name: 'MatrixDmConversation'
    params: {roomId: string; did: string}
  }>()
  const {roomId, did} = route.params
  const {currentAccount} = useSession()
  const {data: profile} = useProfileQuery({did})

  return (
    <Layout.Screen testID="matrixDmConversationScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {profile?.displayName || profile?.handle || did}
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      {E2EE_ENGINE_ENABLED ? (
        <NativeChatRoom
          key={JSON.stringify([currentAccount?.did, roomId])}
          roomId={roomId}
        />
      ) : (
        <Layout.Center style={[a.p_xl]}>
          <Text>
            <Trans>
              Esta versión de la app necesita el chat cifrado nativo.
            </Trans>
          </Text>
        </Layout.Center>
      )}
    </Layout.Screen>
  )
}
