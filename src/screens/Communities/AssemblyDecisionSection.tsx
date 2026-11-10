import {StyleSheet, TouchableOpacity, View} from 'react-native'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {
  type AssemblyDecisionReadView,
  publishAssemblyDecision,
} from '#/lib/api/cabildeo'
import {type ProtectedAction} from '#/lib/api/para-lexicons'
import {
  ASSEMBLY_ACTIONS,
  ASSEMBLY_MIN_VOTING_HOURS,
  assemblyDecisionState,
  assemblyProblemText,
  assemblyReasonText,
  isBoardUri,
} from '#/lib/assembly-decision'
import {cabildeoDetailQueryKey} from '#/state/queries/cabildeo'
import {useCommunityBoardQuery} from '#/state/queries/community-boards'
import {useAgent} from '#/state/session'
import {useTheme} from '#/alf'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

/**
 * A decision cabildeo asks its community's assembly to vote on one action.
 * Open, it says what is being decided; resolved, it shows how the AppView
 * counted and lets anyone publish the authority event that carries it out.
 * Nothing here decides: the AppView recounts when the event arrives.
 */
export function AssemblyDecisionSection({
  cabildeoUri,
  community,
  phase,
  protectedAction,
  decision,
}: {
  cabildeoUri: string
  community: string
  phase: string
  protectedAction: ProtectedAction
  decision?: AssemblyDecisionReadView
}) {
  const t = useTheme()
  const agent = useAgent()
  const queryClient = useQueryClient()
  const meta = ASSEMBLY_ACTIONS.find(item => item.id === protectedAction.action)

  const publish = useMutation({
    mutationFn: async () => {
      if (!decision) throw new Error('Esta decisión aún no tiene resultado.')
      return publishAssemblyDecision(agent, {community, decision})
    },
    onSuccess: () => {
      Toast.show('Decisión publicada')
      void queryClient.invalidateQueries({
        queryKey: cabildeoDetailQueryKey(cabildeoUri, agent.session?.did),
      })
    },
    onError: (e: unknown) => {
      Toast.show(
        'No se pudo publicar: ' + (e instanceof Error ? e.message : String(e)),
      )
    },
  })

  const outcome = decision?.outcome
  const state = decision ? assemblyDecisionState(decision) : undefined

  return (
    <View
      style={[styles.card, t.atoms.bg_contrast_25]}
      testID="assemblyDecisionSection">
      <Text style={[styles.title, t.atoms.text]}>Decisión de asamblea</Text>
      <Text style={[styles.body, t.atoms.text]}>
        {meta?.title ?? protectedAction.action}
      </Text>
      <Text style={[styles.mono, t.atoms.text_contrast_medium]} selectable>
        {protectedAction.subject}
      </Text>

      {phase !== 'resolved' && (
        <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
          Vota la asamblea de la comunidad. La votación debe durar al menos{' '}
          {ASSEMBLY_MIN_VOTING_HOURS} horas; si se alcanza el quórum y la
          mayoría necesaria, cualquier persona podrá publicar la decisión.
        </Text>
      )}

      {phase === 'resolved' && outcome && (
        <>
          <Text style={[styles.body, t.atoms.text, {marginTop: 10}]}>
            {assemblyReasonText(outcome.reason)}
          </Text>
          <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
            {outcome.approvals} a favor · {outcome.rejections} en contra ·{' '}
            {outcome.participants} de {outcome.electorate} miembros votaron
            (quórum: {outcome.quorumTarget})
          </Text>
        </>
      )}

      {phase === 'resolved' && state?.kind === 'invalid' && (
        <Text style={[styles.hint, {color: t.palette.negative_500}]}>
          {assemblyProblemText(state.problem)}
        </Text>
      )}

      {phase === 'resolved' && state?.kind === 'applied' && (
        <Text style={[styles.hint, {color: t.palette.positive_600}]}>
          La decisión ya se aplicó.
        </Text>
      )}

      {phase === 'resolved' && state?.kind === 'publishable' && (
        <>
          <Text style={[styles.hint, t.atoms.text_contrast_medium]}>
            La asamblea aprobó. Falta publicar la decisión para que surta
            efecto; el servidor vuelve a contar los votos antes de aceptarla.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Publicar la decisión de la asamblea"
            accessibilityHint="Publica el evento que aplica la decisión aprobada"
            disabled={publish.isPending || !agent.session}
            onPress={() => publish.mutate()}
            style={[
              styles.button,
              {
                backgroundColor:
                  publish.isPending || !agent.session
                    ? t.palette.contrast_300
                    : t.palette.primary_500,
              },
            ]}>
            <Text style={[styles.buttonText, {color: t.palette.white}]}>
              {publish.isPending ? 'Publicando...' : 'Publicar decisión'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

/**
 * A decision cabildeo names its community by board URI; show the board's name
 * and open its profile, instead of the raw identifier.
 */
export function useCabildeoCommunity(community: string) {
  const byUri = isBoardUri(community)
  const board = useCommunityBoardQuery({uri: community, enabled: byUri})
  if (!byUri) {
    return {label: community, profileId: community}
  }
  const view = board.data?.board
  return {
    label: view?.name ?? 'Comunidad',
    profileId: view?.communityId ?? community,
  }
}

const styles = StyleSheet.create({
  card: {borderRadius: 14, padding: 16, marginTop: 20},
  title: {fontSize: 16, fontWeight: '900', marginBottom: 6},
  body: {fontSize: 14, fontWeight: '700'},
  mono: {fontSize: 11, marginTop: 2},
  hint: {fontSize: 12, lineHeight: 18, marginTop: 8},
  button: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {fontSize: 14, fontWeight: '900'},
})
