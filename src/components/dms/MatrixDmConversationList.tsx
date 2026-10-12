import {View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type VerifiedDmRoom} from '#/lib/matrix/dmRooms'
import {type NavigationProp} from '#/lib/routes/types'
import {useProfileQuery} from '#/state/queries/profile'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

/** Encrypted direct conversations this device has verified. */
export function MatrixDmConversationList({
  rooms,
  canOpen,
}: {
  rooms: VerifiedDmRoom[]
  canOpen: boolean
}) {
  const t = useTheme()
  return (
    <View style={[a.px_lg, a.pt_lg, a.gap_sm]}>
      <Text style={[a.text_md, a.font_bold]}>
        <Trans>Conversaciones</Trans>
      </Text>
      {rooms.length === 0 ? (
        <Text style={[t.atoms.text_contrast_medium]}>
          <Trans>Todavía no tienes conversaciones cifradas.</Trans>
        </Text>
      ) : (
        rooms.map(room => (
          <ConversationRow key={room.roomId} room={room} canOpen={canOpen} />
        ))
      )}
    </View>
  )
}

function ConversationRow({
  room,
  canOpen,
}: {
  room: VerifiedDmRoom
  canOpen: boolean
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {data: profile} = useProfileQuery({did: room.did})
  const name = profile?.displayName || profile?.handle || room.did
  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_md,
        a.p_md,
        a.rounded_md,
        t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.flex_1]}>
        <Text style={[a.font_bold]} numberOfLines={1}>
          {name}
        </Text>
        {profile?.handle ? (
          <Text style={[t.atoms.text_contrast_medium]} numberOfLines={1}>
            @{profile.handle}
          </Text>
        ) : null}
      </View>
      <Button
        label={l`Abrir conversación con ${name}`}
        size="small"
        color="primary"
        disabled={!canOpen}
        onPress={() =>
          navigation.navigate('MatrixDmConversation', {
            roomId: room.roomId,
            did: room.did,
          })
        }>
        <ButtonText>
          <Trans>Abrir</Trans>
        </ButtonText>
      </Button>
    </View>
  )
}
