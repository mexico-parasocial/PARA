import {useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {type CabildeoPositionRecord} from '#/lib/api/para-lexicons'
import {cleanError} from '#/lib/strings/errors'
import {usePublishConclusionMutation} from '#/state/queries/conclusion'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {MAX_CITED, MAX_TEXT} from '../conclusion'
import {useStanceLabel} from './useStanceLabel'

/**
 * A steward writes the conclusion of a forum or persuasion cabildeo. It must
 * stay the steward's reading, so it can cite the positions it rests on, and
 * the form says plainly that it is not a vote result.
 */
export function ConclusionComposer({
  cabildeoUri,
  communityUri,
  positions,
  officialThreadSlug,
  onDone,
}: {
  cabildeoUri: string
  communityUri: string
  officialThreadSlug?: string
  positions: readonly CabildeoPositionRecord[]
  onDone: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const stanceLabel = useStanceLabel()
  const publish = usePublishConclusionMutation()
  const [reviewDate, setReviewDate] = useState('')
  const [text, setText] = useState('')
  const [cited, setCited] = useState<string[]>([])

  const citable = positions.filter(
    (p): p is CabildeoPositionRecord & {uri: string} => Boolean(p.uri),
  )
  const trimmed = text.trim()
  const date = new Date(reviewDate + 'T00:00:00Z')
  const validReviewDate =
    !reviewDate ||
    (/^\d{4}-\d{2}-\d{2}$/.test(reviewDate) &&
      Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === reviewDate)
  const canSubmit = trimmed.length > 0 && !publish.isPending && validReviewDate

  const toggle = (uri: string) =>
    setCited(current =>
      current.includes(uri)
        ? current.filter(u => u !== uri)
        : current.length < MAX_CITED
          ? [...current, uri]
          : current,
    )

  const submit = () => {
    if (!canSubmit) return
    publish.mutate(
      {
        cabildeo: cabildeoUri,
        communityUri,
        text: trimmed,
        cited,
        officialThreadSlug,
        reviewDate: reviewDate || undefined,
      },
      {
        onSuccess: () => {
          Toast.show(
            _(msg`Conclusión enviada. Aparecerá cuando el servidor la indexe.`),
          )
          onDone()
        },
        onError: err => Toast.show(cleanError(err), {type: 'error'}),
      },
    )
  }

  return (
    <View style={[a.gap_md]}>
      <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
        {officialThreadSlug
          ? _(msg`Describe what was decided and what happens next.`)
          : _(
              msg`Resume dónde terminó la conversación. Es la lectura de quienes organizan la comunidad, no un resultado votado, y se muestra así. Si te equivocas, escribe una nueva: la anterior queda en el historial.`,
            )}
      </Text>
      <View style={[a.gap_xs]}>
        <TextField.LabelText>{_(msg`Conclusión`)}</TextField.LabelText>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Conclusión`)}
            value={text}
            onChangeText={setText}
            editable={!publish.isPending}
            multiline
            numberOfLines={5}
            maxLength={MAX_TEXT}
            style={[{minHeight: 120, textAlignVertical: 'top'}]}
          />
        </TextField.Root>
      </View>
      {officialThreadSlug ? (
        <View style={a.gap_xs}>
          <TextField.LabelText>
            {_(msg`Review date (optional)`)}
          </TextField.LabelText>
          <TextField.Root>
            <TextField.Input
              label={_(msg`Review date`)}
              placeholder="YYYY-MM-DD"
              value={reviewDate}
              onChangeText={setReviewDate}
              maxLength={10}
              editable={!publish.isPending}
            />
          </TextField.Root>
          {!validReviewDate ? (
            <Text>{_(msg`Enter a valid date in YYYY-MM-DD format.`)}</Text>
          ) : null}
        </View>
      ) : null}
      {citable.length > 0 ? (
        <View style={[a.gap_sm]}>
          <Text style={[a.text_sm, a.font_bold]}>
            {_(msg`Posturas en las que se basa (opcional)`)}
          </Text>
          {citable.map(p => {
            const selected = cited.includes(p.uri)
            return (
              <Button
                key={p.uri}
                label={`${stanceLabel(p.stance)}: ${p.text}`}
                role="checkbox"
                aria-checked={selected}
                accessibilityRole="checkbox"
                accessibilityState={{checked: selected}}
                size="small"
                color={selected ? 'primary' : 'secondary'}
                onPress={() => toggle(p.uri)}>
                <ButtonText numberOfLines={2}>
                  {`${stanceLabel(p.stance)}: ${p.text}`}
                </ButtonText>
              </Button>
            )
          })}
        </View>
      ) : null}
      <View style={[a.flex_row, a.gap_sm]}>
        <Button
          label={
            officialThreadSlug
              ? _(msg`Publish outcome`)
              : _(msg`Publicar conclusión`)
          }
          size="small"
          color="primary"
          disabled={!canSubmit}
          onPress={submit}>
          <ButtonText>
            {publish.isPending ? _(msg`Enviando…`) : _(msg`Publicar`)}
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Cancelar`)}
          size="small"
          color="secondary"
          disabled={publish.isPending}
          onPress={onDone}>
          <ButtonText>{_(msg`Cancelar`)}</ButtonText>
        </Button>
      </View>
    </View>
  )
}
