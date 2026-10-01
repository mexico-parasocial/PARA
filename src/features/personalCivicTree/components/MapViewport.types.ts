import {type Dispatch, type ReactNode, type SetStateAction} from 'react'

import {type MapCamera} from '../map'

export type MapViewportProps = {
  camera: MapCamera
  setCamera: Dispatch<SetStateAction<MapCamera>>
  children: ReactNode
}
