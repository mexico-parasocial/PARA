import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg, plural} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useSembleLibraryQuery} from '#/state/queries/sembe'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import {
  planSembleExport,
  type SembleExportCollection,
  type SembleExportPlan,
} from '#/features/civicTree/sembleExport'
import {reconcileSembleExport} from '#/features/civicTree/sembleLibrary'

/*
 * The confirmation for a Semble export is a preview of the records, not a
 * sentence about them. The user sees every card, note and connection that
 * will become public before anything is written, and notes are opt-in.
 */
export function ExportToSembleDialog({
  control,
  collection,
  isPending,
  onConfirm,
}: {
  control: Dialog.DialogControlProps
  collection: SembleExportCollection
  isPending: boolean
  onConfirm: (plan: SembleExportPlan) => void
}) {
  return (
    <Dialog.Outer control={control} testID="exportToSembleDialog">
      <Dialog.Handle />
      <ExportToSembleDialogInner
        collection={collection}
        isPending={isPending}
        onConfirm={plan => control.close(() => onConfirm(plan))}
        onCancel={() => control.close()}
      />
    </Dialog.Outer>
  )
}

function ExportToSembleDialogInner({
  collection,
  isPending,
  onConfirm,
  onCancel,
}: {
  collection: SembleExportCollection
  isPending: boolean
  onConfirm: (plan: SembleExportPlan) => void
  onCancel: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const [includeNotes, setIncludeNotes] = useState(false)

  const plan = useMemo(
    () => planSembleExport(collection, {includeNotes}),
    [collection, includeNotes],
  )
  const empty = plan.cards.length === 0

  /*
   * What is already on Semble decides whether this export adds anything.
   * Until that is known the user cannot publish: publishing blind is what
   * duplicated collections before.
   */
  const library = useSembleLibraryQuery({enabled: true})
  const actions = useMemo(
    () =>
      library.data ? reconcileSembleExport(plan, library.data) : undefined,
    [plan, library.data],
  )
  const cardStatus = new Map(
    actions?.cards.map(c => [c.card.itemKey, c] as const) ?? [],
  )
  const canPublish = !!actions && !empty && !actions.upToDate && !isPending

  return (
    <Dialog.ScrollableInner label={_(msg`Export to Semble.so`)}>
      <View style={[a.gap_md]}>
        <Text style={[a.text_xl, a.font_bold, t.atoms.text]}>
          <Trans>Publish to Semble.so?</Trans>
        </Text>
        <Text style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
          <Trans>
            These records will be written to your public account, where anyone
            can read and copy them. Deleting them later does not remove copies
            others have made. The rest of your civic tree stays private.
          </Trans>
        </Text>

        {plan.notesAvailable > 0 ? (
          <Toggle.Item
            name="includeNotes"
            type="checkbox"
            label={_(msg`Include my notes`)}
            value={includeNotes}
            onChange={setIncludeNotes}>
            {({selected}) => (
              <Toggle.Panel active={selected}>
                <Toggle.PanelText>
                  {plural(plan.notesAvailable, {
                    one: 'Include my # note',
                    other: 'Include my # notes',
                  })}
                </Toggle.PanelText>
                <Toggle.Switch />
              </Toggle.Panel>
            )}
          </Toggle.Item>
        ) : null}

        <View
          style={[
            a.rounded_md,
            a.p_md,
            a.gap_sm,
            {borderWidth: 1, borderColor: t.palette.contrast_100},
          ]}>
          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
            {plan.collection.name}
          </Text>
          {actions ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {actions.collection ? (
                <Trans>Adds to your Semble collection with this name.</Trans>
              ) : (
                <Trans>Creates a new Semble collection.</Trans>
              )}
            </Text>
          ) : null}
          {plan.collection.description ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {plan.collection.description}
            </Text>
          ) : null}
          {empty ? (
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Nothing in this collection can be published.</Trans>
            </Text>
          ) : (
            plan.cards.map(card => {
              const status = cardStatus.get(card.itemKey)
              const label = !status
                ? undefined
                : !status.existing
                  ? _(msg`New`)
                  : status.link
                    ? _(msg`In your Semble library; adds it here`)
                    : _(msg`Already on Semble`)
              return (
                <View
                  key={card.itemKey}
                  style={[
                    a.gap_2xs,
                    card.type === 'NOTE' && card.parentItemKey ? a.pl_md : null,
                  ]}>
                  {card.type === 'URL' ? (
                    <>
                      <Text style={[a.text_sm, t.atoms.text]} numberOfLines={2}>
                        {card.title || card.url}
                        {card.author ? ` — ${card.author}` : ''}
                      </Text>
                      <Text
                        style={[a.text_xs, t.atoms.text_contrast_medium]}
                        numberOfLines={1}>
                        {card.url}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={[
                        a.text_sm,
                        card.parentItemKey ? a.italic : null,
                        t.atoms.text,
                      ]}
                      numberOfLines={3}>
                      {card.text}
                    </Text>
                  )}
                  {label ? (
                    <Text
                      style={[
                        a.text_2xs,
                        status?.existing
                          ? t.atoms.text_contrast_medium
                          : {color: t.palette.primary_500},
                      ]}>
                      {label}
                    </Text>
                  ) : null}
                </View>
              )
            })
          )}
          {plan.connections.length > 0 ? (
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              {plural(plan.connections.length, {
                one: '# connection between these cards',
                other: '# connections between these cards',
              })}
              {actions && actions.counts.existingConnections > 0
                ? ` · ${plural(actions.counts.existingConnections, {
                    one: '# already on Semble',
                    other: '# already on Semble',
                  })}`
                : ''}
            </Text>
          ) : null}
        </View>

        {library.isLoading ? (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Checking what is already on Semble…</Trans>
          </Text>
        ) : library.isError ? (
          <View style={[a.gap_xs]}>
            <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
              <Trans>
                Could not check what is already on Semble, so nothing will be
                published. Publishing without checking would duplicate earlier
                exports.
              </Trans>
            </Text>
            <Button
              label={_(msg`Try again`)}
              color="secondary"
              size="small"
              onPress={() => library.refetch()}>
              <ButtonText>
                <Trans>Try again</Trans>
              </ButtonText>
            </Button>
          </View>
        ) : actions?.upToDate ? (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Everything here is already on Semble.</Trans>
          </Text>
        ) : null}

        {library.data?.truncated ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Your Semble library is too large to check completely, so a few
              items may be published twice.
            </Trans>
          </Text>
        ) : null}

        {actions?.collection ? (
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            <Trans>
              Items you have removed in PARA stay on Semble. Remove them there
              if you no longer want them public.
            </Trans>
          </Text>
        ) : null}

        <View style={[a.gap_sm]}>
          <Button
            label={_(msg`Publish to Semble.so`)}
            color="primary"
            size="large"
            disabled={!canPublish}
            onPress={() => onConfirm(plan)}>
            <ButtonText>
              <Trans>Publish</Trans>
            </ButtonText>
          </Button>
          <Button
            label={_(msg`Cancel`)}
            color="secondary"
            size="large"
            onPress={onCancel}>
            <ButtonText>
              <Trans>Cancel</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>
      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}
