import {type MessageDescriptor} from '@lingui/core'
import {msg} from '@lingui/core/macro'

import {type MatrixRoomKind} from '#/state/queries/matrix'

/**
 * Every community chat room has a fixed purpose. The bridge provisions the
 * rooms from the community's `chamberMode`: a unicameral community has only
 * the main room, a bicameral one also gets both chambers and the observer
 * council.
 */
export const ROOM_PURPOSES: Record<
  MatrixRoomKind,
  {label: MessageDescriptor; purpose: MessageDescriptor}
> = {
  main: {
    label: msg`Sala principal`,
    purpose: msg`Conversación abierta de toda la comunidad: anuncios, dudas y debate general.`,
  },
  'chamber-a': {
    label: msg`Cámara A`,
    purpose: msg`Deliberación de la primera cámara: propuestas y debate previo a las votaciones.`,
  },
  'chamber-b': {
    label: msg`Cámara B`,
    purpose: msg`Deliberación de la segunda cámara: revisión y contrapesos sobre lo que propone la cámara A.`,
  },
  observers: {
    label: msg`Consejo observador`,
    purpose: msg`Seguimiento de ambas cámaras en modo lectura, para observadores sin voto.`,
  },
}

export const ROOM_ORDER: MatrixRoomKind[] = [
  'main',
  'chamber-a',
  'chamber-b',
  'observers',
]
