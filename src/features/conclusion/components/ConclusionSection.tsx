import {useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CitedPositionView, type ConclusionView} from '#/lib/api/conclusion'
import {
  type CabildeoKind,
  type CabildeoPositionRecord,
} from '#/lib/api/para-lexicons'
import {useCommunityOrganizers} from '#/state/queries/community-activities'
import {useConclusionQuery} from '#/state/queries/conclusion'
import {useProfileQuery} from '#/state/queries/profile'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'
import {canHaveConclusion} from '../conclusion'
import {ConclusionComposer} from './ConclusionComposer'
import {useStanceLabel} from './useStanceLabel'

/** "De @handle · ", or nothing until the author's profile resolves. */
function AuthorPrefix({did}: {did: string}) {
  const {_} = useLingui()
  const {data: profile} = useProfileQuery({did})
  if (!profile) return null
  return (
    <>
      {_(msg`De`)} @{profile.handle}
      {' · '}
    </>
  )
}

function CitedPositions({cited}: {cited: readonly CitedPositionView[]}) {
  const t = useTheme()
  const {_} = useLingui()
  const stanceLabel = useStanceLabel()
  if (cited.length === 0) return null
  return (
    <View style={[a.gap_sm]}>
      <Text style={[a.text_sm, a.font_bold]}>
        {_(msg`Posturas en las que se basa`)}
      </Text>
      {cited.map(p => (
        <View key={p.uri} style={[a.border_l, a.pl_md, a.gap_xs]}>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {stanceLabel(p.stance)}
          </Text>
          <Text numberOfLines={4} style={[a.text_sm]}>
            {p.text}
          </Text>
        </View>
      ))}
    </View>
  )
}

function ConclusionBody({conclusion}: {conclusion: ConclusionView}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  return (
    <View style={[a.gap_md]}>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        <AuthorPrefix did={conclusion.author} />
        {i18n.date(new Date(conclusion.createdAt), {dateStyle: 'medium'})}
      </Text>
      <Text style={[a.text_md, a.leading_snug]}>{conclusion.text}</Text>
      {conclusion.edited ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {_(
            msg`Esta conclusión se editó después de publicarse. Se muestra la versión original.`,
          )}
        </Text>
      ) : null}
      <CitedPositions cited={conclusion.cited} />
    </View>
  )
}

/**
 * The conclusion of a forum or persuasion cabildeo: where the conversation
 * landed, in the words of the community's stewards. It renders nothing for any
 * other cabildeo, and nothing when there is no conclusion and the viewer cannot
 * write one. It closes nothing: replies and positions stay open under it.
 */
export function ConclusionSection({
  cabildeoUri,
  community,
  kind,
  phase,
  positions,
}: {
  cabildeoUri: string
  community: string
  kind: CabildeoKind | undefined
  phase: string
  positions: readonly CabildeoPositionRecord[]
}) {
  const t = useTheme()
  const {_} = useLingui()
  const enabled = canHaveConclusion(kind, phase)
  const query = useConclusionQuery(cabildeoUri, {enabled})
  const {canOrganize} = useCommunityOrganizers({
    communityUri: query.data?.communityUri ?? undefined,
    communityName: community,
  })
  const [writing, setWriting] = useState(false)
  const [showEarlier, setShowEarlier] = useState(false)

  if (!enabled) return null
  if (query.isError) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={_(msg`Reintentar`)}
        accessibilityHint={_(msg`Vuelve a cargar la conclusión`)}
        onPress={() => query.refetch()}
        style={[a.mt_lg]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {_(msg`No se pudo cargar la conclusión. Reintentar`)}
        </Text>
      </TouchableOpacity>
    )
  }

  const data = query.data
  const conclusion = data?.conclusion ?? null
  const communityUri = data?.communityUri ?? null
  const canWrite = canOrganize && Boolean(communityUri)
  if (!conclusion && !canWrite) return null

  return (
    <View
      style={[
        a.mt_lg,
        a.p_lg,
        a.gap_md,
        a.rounded_md,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_lg, a.font_bold]}>
          <Trans>Conclusión</Trans>
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            Lo que quienes organizan la comunidad concluyen de esta
            conversación. No es un resultado votado, y las posturas siguen
            abiertas.
          </Trans>
        </Text>
      </View>

      {conclusion ? <ConclusionBody conclusion={conclusion} /> : null}

      {data && data.earlier.length > 0 ? (
        <View style={[a.gap_md]}>
          <Button
            label={_(msg`Conclusiones anteriores`)}
            accessibilityHint={_(msg`Muestra u oculta el historial`)}
            size="small"
            color="secondary"
            style={[a.self_start]}
            onPress={() => setShowEarlier(v => !v)}>
            <ButtonText>
              {showEarlier
                ? _(msg`Ocultar conclusiones anteriores`)
                : _(msg`Ver conclusiones anteriores (${data.earlier.length})`)}
            </ButtonText>
          </Button>
          {showEarlier
            ? data.earlier.map(c => (
                <View key={c.uri} style={[a.border_l, a.pl_md]}>
                  <ConclusionBody conclusion={c} />
                </View>
              ))
            : null}
        </View>
      ) : null}

      {canWrite && communityUri ? (
        writing ? (
          <ConclusionComposer
            cabildeoUri={cabildeoUri}
            communityUri={communityUri}
            positions={positions}
            onDone={() => setWriting(false)}
          />
        ) : (
          <Button
            label={
              conclusion
                ? _(msg`Escribir una nueva conclusión`)
                : _(msg`Escribir una conclusión`)
            }
            accessibilityHint={_(msg`Abre el formulario de conclusión`)}
            size="small"
            color="secondary"
            style={[a.self_start]}
            onPress={() => setWriting(true)}>
            <ButtonText>
              {conclusion
                ? _(msg`Escribir una nueva conclusión`)
                : _(msg`Escribir una conclusión`)}
            </ButtonText>
          </Button>
        )
      ) : null}
    </View>
  )
}
