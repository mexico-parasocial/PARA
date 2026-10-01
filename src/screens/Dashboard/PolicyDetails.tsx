import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {DetailsScreenBase} from './DetailsScreenBase'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PolicyDetails'>

export function PolicyDetailsScreen(props: Props) {
  return <DetailsScreenBase {...props} />
}
