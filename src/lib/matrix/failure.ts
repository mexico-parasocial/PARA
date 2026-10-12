import {msg} from '@lingui/core/macro'

import {BridgeAuthError, BridgeResponseError} from './bridge'

export function chatFailureMessage(error: unknown) {
  if (error instanceof BridgeAuthError) {
    return error.statusCode === 401
      ? msg`Conecta tu identidad M8 para abrir el chat.`
      : msg`No tienes permiso para entrar en esta sala.`
  }
  if (
    error instanceof Error &&
    error.message === 'CHAT_SECURE_BROWSER_REQUIRED'
  )
    return msg`Abre PARA con HTTPS o en localhost para usar el chat cifrado.`
  if (error instanceof Error && error.message.startsWith('Firma no aprobada'))
    return msg`Aprueba la firma pendiente en iM8 y vuelve a intentar.`
  if (error instanceof BridgeResponseError && error.statusCode === 404)
    return msg`La sala aún no está lista. Vuelve a intentarlo en un momento.`
  return msg`No se pudo conectar con el chat. Comprueba tu conexión y vuelve a intentarlo.`
}
