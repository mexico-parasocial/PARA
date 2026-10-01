import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type CommonNavigatorParams} from '#/lib/routes/types'
import {DetailsScreenBase} from './DetailsScreenBase'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'MatterDetails'>

export function MatterDetailsScreen(props: Props) {
  return <DetailsScreenBase {...props} />
}
