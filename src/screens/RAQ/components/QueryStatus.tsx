import {type ReactNode} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'

export function QueryStatus({
  loading,
  error,
  empty,
  emptyMessageText,
  retry,
  refreshing,
}: {
  loading?: boolean
  error?: boolean
  empty?: boolean
  emptyMessageText?: ReactNode
  retry: () => Promise<unknown>
  refreshing?: boolean
}) {
  const t = useTheme()
  const {_} = useLingui()
  if (loading)
    return (
      <View style={[a.py_md, a.align_center]}>
        <Loader size="lg" />
      </View>
    )
  if (error)
    return (
      <View style={[a.gap_sm, a.align_start]}>
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Something went wrong!</Trans>
        </Text>
        <Button
          label={_(msg`Press to retry`)}
          size="small"
          variant="solid"
          color="secondary"
          disabled={refreshing}
          onPress={() => void retry()}>
          <ButtonText>
            <Trans>Retry</Trans>
          </ButtonText>
        </Button>
      </View>
    )
  return empty ? (
    <Text style={t.atoms.text_contrast_medium}>{emptyMessageText}</Text>
  ) : null
}
