import {useState} from 'react'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {
  type SanctionEnforcement,
  type SanctionKind,
  useApplySanctionMutation,
  useLiftSanctionMutation,
} from '#/state/queries/matrix'
import {useSession} from '#/state/session'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'

export const SANCTION_PRESETS = [
  {label: '15 min', minutes: 15},
  {label: '1 h', minutes: 60},
  {label: '24 h', minutes: 1440},
  {label: '7 d', minutes: 10080},
]

export type SanctionTarget = {did: string; name: string}
type Preset = (typeof SANCTION_PRESETS)[number]

/**
 * Mute and un-mute a member as a moderator: always confirmed first, and always
 * told what happened. The bridge records a sanction even when the homeserver
 * refuses it, so a success toast has to come from `enforcement`, never from
 * the request merely completing.
 *
 * Render `prompts` once in the screen that uses this.
 */
export function useModeratorActions(communityUri: string) {
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const modDid = currentAccount?.did
  const apply = useApplySanctionMutation()
  const lift = useLiftSanctionMutation()
  const muteControl = Prompt.usePromptControl()
  const liftControl = Prompt.usePromptControl()
  const [muting, setMuting] = useState<{
    target: SanctionTarget
    preset: Preset
  } | null>(null)
  const [lifting, setLifting] = useState<{
    target: SanctionTarget
    kind?: SanctionKind
  } | null>(null)

  const show = (
    status: SanctionEnforcement['status'],
    text: {applied: string; pending: string; problem: string},
  ) => {
    if (status === 'applied') Toast.show(text.applied, {type: 'success'})
    else if (status === 'pending') Toast.show(text.pending, {type: 'warning'})
    else Toast.show(text.problem, {type: 'error', duration: 8000})
  }

  const onMute = async () => {
    if (!muting || !modDid) return
    const {target, preset} = muting
    try {
      const result = await apply.mutateAsync({
        targetDid: target.did,
        sanctionedByDid: modDid,
        communityUri,
        type: 'mute',
        durationMinutes: preset.minutes,
      })
      show(result.enforcement.status, {
        applied: _(msg`${target.name} silenciado por ${preset.label}`),
        pending: _(
          msg`Silencio registrado. Se aplicará cuando ${target.name} entre al chat.`,
        ),
        problem: _(
          msg`El silencio quedó registrado, pero el chat no lo aplicó en todas las salas. Se reintentará cuando ${target.name} vuelva a conectarse.`,
        ),
      })
    } catch (err) {
      Toast.show(
        err instanceof Error ? err.message : _(msg`No se pudo silenciar`),
        {type: 'error'},
      )
    }
  }

  const onLift = async () => {
    if (!lifting) return
    const {target, kind} = lifting
    try {
      const result = await lift.mutateAsync({
        targetDid: target.did,
        communityUri,
        type: kind,
      })
      show(result.enforcement.status, {
        applied: _(msg`Restricción levantada para ${target.name}`),
        pending: _(msg`Restricción levantada para ${target.name}`),
        problem: _(
          msg`No se pudo levantar en todas las salas. Inténtalo de nuevo.`,
        ),
      })
    } catch (err) {
      Toast.show(
        err instanceof Error ? err.message : _(msg`No se pudo levantar`),
        {type: 'error'},
      )
    }
  }

  const prompts = (
    <>
      <Prompt.Basic
        control={muteControl}
        title={_(msg`¿Silenciar a ${muting?.target.name ?? ''}?`)}
        description={_(
          msg`No podrá escribir en las salas de esta comunidad durante ${muting?.preset.label ?? ''}. Puedes levantarlo cuando quieras.`,
        )}
        confirmButtonCta={_(msg`Silenciar`)}
        confirmButtonColor="negative"
        onConfirm={() => {
          void onMute()
        }}
      />
      <Prompt.Basic
        control={liftControl}
        title={_(
          msg`¿Levantar la restricción de ${lifting?.target.name ?? ''}?`,
        )}
        description={_(
          msg`Podrá volver a escribir y a entrar a las salas de esta comunidad.`,
        )}
        confirmButtonCta={_(msg`Levantar`)}
        onConfirm={() => {
          void onLift()
        }}
      />
    </>
  )

  return {
    askMute: (target: SanctionTarget, preset: Preset) => {
      setMuting({target, preset})
      muteControl.open()
    },
    askLift: (target: SanctionTarget, kind?: SanctionKind) => {
      setLifting({target, kind})
      liftControl.open()
    },
    prompts,
    isPending: apply.isPending || lift.isPending,
  }
}
