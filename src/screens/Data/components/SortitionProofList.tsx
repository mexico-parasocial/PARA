import {useMemo, useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {sha256} from 'js-sha256'

import {
  type SortitionCandidate,
  type SortitionRun,
} from '#/state/queries/matrix'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

function hexToBytes(hex: string) {
  const bytes = []
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return bytes
}

function verifyCandidate(candidate: SortitionCandidate) {
  const digest = sha256.create()
  digest.update(hexToBytes(candidate.hashInput))
  return digest.hex() === candidate.hashOutput
}

export function SortitionProofList({
  run,
  selected,
  viewerCandidate,
}: {
  run: SortitionRun
  selected: SortitionCandidate[]
  viewerCandidate?: SortitionCandidate | null
}) {
  const t = useTheme()
  const [expanded, setExpanded] = useState(false)
  const proofs = useMemo(() => {
    const viewer = viewerCandidate
      ? [viewerCandidate]
      : []
    const rest = selected.filter(candidate => candidate.did !== viewerCandidate?.did)
    return [...viewer, ...rest].slice(0, expanded ? 200 : 4)
  }, [expanded, selected, viewerCandidate])

  if (run.status !== 'active') return null

  return (
    <View style={[a.mt_lg, a.p_md, a.rounded_md, t.atoms.bg_contrast_25]}>
      <View style={[a.flex_row, a.justify_between, a.align_center, a.mb_sm]}>
        <View>
          <Text style={[a.font_bold, t.atoms.text]}>
            <Trans>Cryptographic proofs</Trans>
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>SHA-256 local contra el hash publicado del sorteo.</Trans>
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setExpanded(value => !value)}>
          <Text style={{color: t.palette.primary_500, fontWeight: '700'}}>
            {expanded ? <Trans>Ocultar</Trans> : <Trans>Ver JSON</Trans>}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[a.flex_row, a.gap_sm]}>
          {proofs.map(candidate => {
            const valid = verifyCandidate(candidate)
            const proof = {
              $type: 'com.para.sortition.proof',
              runId: run.id,
              did: candidate.did,
              community: candidate.communityUri,
              cabildeo: candidate.cabildeoUri,
              drandRound: run.drandRound,
              drandRandomness: run.drandRandomness,
              hashInput: candidate.hashInput,
              hashOutput: candidate.hashOutput,
              threshold: candidate.threshold,
              selected: candidate.selected,
            }
            return (
              <View
                key={`${candidate.runId}-${candidate.did}`}
                style={[
                  a.p_md,
                  a.rounded_sm,
                  a.border,
                  {
                    width: 280,
                    borderColor: valid
                      ? t.palette.positive_500
                      : t.palette.negative_500,
                    backgroundColor: t.palette.contrast_0,
                  },
                ]}>
                <Text style={[a.font_bold, t.atoms.text]} numberOfLines={1}>
                  {candidate.did}
                </Text>
                <Text
                  style={[
                    a.text_xs,
                    {
                      color: valid
                        ? t.palette.positive_500
                        : t.palette.negative_500,
                      fontWeight: '800',
                    },
                  ]}>
                  {valid ? (
                    <Trans>Cryptographically verified</Trans>
                  ) : (
                    <Trans>No coincide</Trans>
                  )}
                </Text>
                <Text
                  style={[
                    a.text_xs,
                    t.atoms.text_contrast_medium,
                    {fontFamily: 'monospace', marginTop: 8},
                  ]}
                  selectable>
                  {JSON.stringify(proof, null, 2)}
                </Text>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </View>
  )
}
