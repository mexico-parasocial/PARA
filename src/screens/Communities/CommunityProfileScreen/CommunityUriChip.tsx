import {TouchableOpacity} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {useCommunityBoardQuery} from '#/state/queries/community-boards'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'

export function CommunityUriChip({
  communityUri,
  onPress,
}: {
  communityUri: string
  onPress?: () => void
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {data, isLoading} = useCommunityBoardQuery({uri: communityUri})
  const board = data?.board

  const handlePress = () => {
    if (onPress) {
      onPress()
      return
    }
    if (board?.communityId) {
      navigation.navigate('CommunityProfile', {
        communityId: board.communityId,
        communityName: board.name || board.communityId,
      })
    }
  }

  const displayName = board?.name || communityUri.split('/').pop() || communityUri

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open community ${displayName}`}
      accessibilityHint="Navigates to the community profile page"
      onPress={handlePress}
      disabled={isLoading || !board}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: t.palette.primary_500 + '15',
        borderWidth: 1,
        borderColor: t.palette.primary_500 + '30',
        marginRight: 6,
        marginBottom: 6,
        opacity: isLoading ? 0.6 : 1,
      }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: t.palette.primary_600,
        }}
        numberOfLines={1}>
        {isLoading ? '…' : displayName}
      </Text>
    </TouchableOpacity>
  )
}
