import {TouchableOpacity, View} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {type MatrixRoomSummary} from '#/state/queries/matrix'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

const roomKindLabel: Record<MatrixRoomSummary['kind'], string> = {
  main: 'Sala principal',
  'chamber-a': 'Cámara A',
  'chamber-b': 'Cámara B',
  observers: 'Consejo observador',
}

export function MatrixRoomListItem({room}: {room: MatrixRoomSummary}) {
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Abrir chat de ${room.slug}`}
      accessibilityHint="Abre la conversación de esta comunidad"
      onPress={() =>
        navigation.navigate('CommunityChat', {
          communityUri: room.communityUri,
          communityName: room.slug,
          roomId: room.roomId,
        })
      }
      style={[
        a.flex_row,
        a.align_center,
        a.px_lg,
        a.py_md,
        a.gap_md,
        {borderBottomWidth: 1, borderBottomColor: t.palette.contrast_100},
      ]}>
      <View
        style={[
          a.justify_center,
          a.align_center,
          {
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: t.palette.primary_500 + '20',
          },
        ]}>
        <Text style={[a.text_xl]}>🏛️</Text>
      </View>

      <View style={[a.flex_1]}>
        <View style={[a.flex_row, a.align_center, a.gap_sm]}>
          <Text
            style={[a.text_md, a.font_bold, t.atoms.text]}
            numberOfLines={1}>
            {room.slug}
          </Text>
          {room.unread > 0 && (
            <View
              style={[
                a.rounded_full,
                {
                  backgroundColor: t.palette.primary_500,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  minWidth: 18,
                },
              ]}>
              <Text
                style={[
                  a.text_xs,
                  a.font_bold,
                  {color: t.palette.white, textAlign: 'center'},
                ]}>
                {room.unread > 99 ? '99+' : room.unread}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={[a.text_sm, t.atoms.text_contrast_medium]}
          numberOfLines={1}>
          {roomKindLabel[room.kind]} · Chat cívico privado
        </Text>
      </View>
    </TouchableOpacity>
  )
}
