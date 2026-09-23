import {useMemo} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

export function useMatrixClientStrings() {
  const {_} = useLingui()

  return useMemo(
    () => ({
      loading: _(msg`Cargando...`),
      connecting: _(msg`Conectando al chat...`),
      connectionFailed: _(msg`No se pudo conectar al chat`),
      retry: _(msg`Reintentar`),
      someoneTyping: _(msg`Alguien está escribiendo...`),
      typingSuffix: _(msg`está escribiendo...`),
      messagePlaceholder: _(msg`Escribe un mensaje...`),
      sendMessage: _(msg`Enviar mensaje`),
      today: _(msg`Hoy`),
      yesterday: _(msg`Ayer`),
      imageLoading: _(msg`Cargando imagen...`),
      image: _(msg`Imagen`),
      imageLower: _(msg`imagen`),
      file: _(msg`archivo`),
      downloadImage: _(msg`Descargar imagen`),
      download: _(msg`Descargar`),
      downloadFailed: _(msg`No se pudo descargar - reintentar`),
      chat: _(msg`Chat`),
      missingAuth: _(msg`Falta configuración de autenticación`),
      joinFailed: _(msg`No se pudo unir a la sala`),
      connectionError: _(msg`Error de conexión:`),
      unknown: _(msg`desconocido`),
    }),
    [_],
  )
}
