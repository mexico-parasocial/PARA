import {View} from 'react-native'

import {useOpenLink} from '#/lib/hooks/useOpenLink'
import {atoms as a} from '#/alf'
import {Button, ButtonText} from '#/components/Button'

export function GermContactButton({
  url,
  label = 'Germ',
  disabled = false,
}: {
  url: string
  label?: string
  disabled?: boolean
}) {
  const openLink = useOpenLink()

  return (
    <View>
      <Button
        accessibilityRole="button"
        testID="germContactButton"
        size="small"
        color="secondary"
        label="Open private Germ DM"
        disabled={disabled}
        style={[a.justify_center]}
        onPress={() => {
          void openLink(url, true)
        }}>
        <ButtonText>{label}</ButtonText>
      </Button>
    </View>
  )
}
