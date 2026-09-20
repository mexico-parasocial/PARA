/**
 * The error vocabulary shared by the engine adapter, the room hook and the
 * screen.
 *
 * Kept in its own module with no SDK imports: the adapter is native-only, and
 * anything that pulls it in cannot be unit-tested or loaded on web.
 */

/**
 * Normalises a thrown value into a stable code.
 *
 * The adapter signals with `Error.message` codes rather than prose so the UI
 * can map them to translated copy. Anything that does not look like one of our
 * codes collapses to `CHAT_UNAVAILABLE` — an SDK error string may name
 * internal paths or identifiers, and is not something to render to a user.
 */
export function chatErrorCode(err: unknown): string {
  const message = err instanceof Error ? err.message : ''
  return /^[A-Z_]{3,40}$/.test(message) ? message : 'CHAT_UNAVAILABLE'
}

/** Copy for a failure that stopped the room from opening. */
export function connectionErrorCopy(code?: string): string {
  switch (code) {
    case 'ENCRYPTED_ROOM_REQUIRED':
      // Fail-closed, stated plainly: the engine will not open a room whose
      // protection it cannot guarantee.
      return 'Esta sala no está cifrada de extremo a extremo, y el motor cifrado no abre salas sin cifrar.'
    case 'CHAT_SESSION_MISMATCH':
      return 'La sesión guardada no corresponde a esta cuenta. Cierra sesión en el chat y vuelve a autorizar el dispositivo.'
    case 'CHAT_ALREADY_OPEN':
      return 'El chat ya está abierto en otra pantalla.'
    case 'CHAT_ENGINE_NOT_NATIVE':
      return 'El motor de chat nativo está desactivado en esta compilación.'
    case 'INVALID_HOMESERVER':
    case 'INVALID_CHAT_IDENTITY':
      return 'La identidad de chat de esta cuenta no es válida.'
    default:
      return 'No se pudo abrir el chat cifrado.'
  }
}

/** Copy for a message that did not leave the composer. */
export function sendErrorCopy(code: string): string {
  switch (code) {
    case 'ENCRYPTED_ROOM_REQUIRED':
      return 'No se envió: el cifrado de esta sala no está disponible.'
    case 'INVALID_MESSAGE':
      return 'No se envió: el mensaje está vacío o es demasiado largo.'
    case 'CHAT_CLOSED':
    case 'CHAT_NOT_READY':
      return 'No se envió: la conexión se cerró. Reintenta.'
    default:
      return 'No se pudo enviar el mensaje.'
  }
}
