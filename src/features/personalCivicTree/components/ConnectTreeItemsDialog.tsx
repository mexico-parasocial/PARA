import {useCallback, useMemo, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  type CivicTreeCollection,
  type CivicTreeItem,
  type CivicTreeRelation,
  createCivicTreeRelationId,
  getCivicTreeItemKey,
  getCivicTreeItemTitle,
  useAddCivicTreeRelationMutation,
} from '#/state/queries/collections'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'
import {
  PERSONAL_RELATION_COLORS,
  PERSONAL_RELATION_LABELS,
} from '#/features/civicTree/colors'

type RelationKind = CivicTreeRelation['kind']

/*
 * Order is deliberate: the two kinds a user reaches for most sit first, and the
 * symmetric pair (duplicates, related_to) sits last. Colours and phrasing come
 * from deliberation-colors so the dialog, the graph and the legend cannot drift.
 */
const RELATION_KINDS: RelationKind[] = [
  'supports',
  'opposes',
  'evidence_for',
  'context_for',
  'depends_on',
  'duplicates',
  'related_to',
]

export function ConnectTreeItemsDialog({
  control,
  collection,
  sourceItem,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
  sourceItem?: CivicTreeItem
}) {
  return (
    <Dialog.Outer control={control} testID="connectTreeItemsDialog">
      <Dialog.Handle />
      <ConnectTreeItemsDialogInner
        control={control}
        collection={collection}
        sourceItem={sourceItem}
      />
    </Dialog.Outer>
  )
}

function ConnectTreeItemsDialogInner({
  control,
  collection,
  sourceItem,
}: {
  control: Dialog.DialogControlProps
  collection?: CivicTreeCollection
  sourceItem?: CivicTreeItem
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const addRelation = useAddCivicTreeRelationMutation()

  const [kind, setKind] = useState<RelationKind>('supports')
  const [targetKey, setTargetKey] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()

  const sourceKey = sourceItem ? getCivicTreeItemKey(sourceItem) : undefined

  /** Everything in the collection except the item being connected from. */
  const targets = useMemo(() => {
    return (collection?.items ?? []).filter(
      item => getCivicTreeItemKey(item) !== sourceKey,
    )
  }, [collection, sourceKey])

  const existingKeys = useMemo(() => {
    const set = new Set<string>()
    for (const rel of collection?.relations ?? []) {
      if (rel.fromItemId === sourceKey) set.add(rel.toItemId)
    }
    return set
  }, [collection, sourceKey])

  const onConnect = useCallback(() => {
    if (!collection || !sourceKey) return
    if (!targetKey) {
      setError(l`Choose what to connect this to.`)
      return
    }

    const relation: CivicTreeRelation = {
      id: createCivicTreeRelationId(),
      fromItemId: sourceKey,
      toItemId: targetKey,
      kind,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    addRelation.mutate(
      {collectionId: collection.id, relation},
      {
        onSuccess: () => {
          control.close(() => {
            setTargetKey(undefined)
            setNote('')
            setError(undefined)
            Toast.show(l`Connected`)
          })
        },
        onError: (err: Error) => {
          Toast.show(err.message || l`Could not connect these items`, {
            type: 'error',
          })
        },
      },
    )
  }, [addRelation, collection, control, kind, note, sourceKey, targetKey, l])

  if (!sourceItem || !collection) {
    return (
      <Dialog.Inner label={l`Connect items`}>
        <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
          <Trans>Nothing selected to connect.</Trans>
        </Text>
      </Dialog.Inner>
    )
  }

  const sourceTitle = getCivicTreeItemTitle(sourceItem)

  return (
    <Dialog.Inner label={l`Connect items`}>
      <Text style={[a.text_lg, a.font_bold, a.mb_2xs, t.atoms.text]}>
        <Trans>Connect</Trans>
      </Text>
      <Text style={[a.text_sm, a.mb_md, t.atoms.text_contrast_medium]}>
        <Trans>
          Say how {sourceTitle} relates to something else in this collection.
          These links are what your tree is drawn from.
        </Trans>
      </Text>

      <Text
        style={[a.text_xs, a.font_bold, a.mb_xs, t.atoms.text_contrast_medium]}>
        <Trans>Relationship</Trans>
      </Text>
      <View style={[a.flex_row, a.flex_wrap, a.gap_xs, a.mb_md]}>
        {RELATION_KINDS.map(option => {
          const active = kind === option
          const color = PERSONAL_RELATION_COLORS[option]
          const label = PERSONAL_RELATION_LABELS[option]
          return (
            <TouchableOpacity
              key={option}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{selected: active}}
              onPress={() => setKind(option)}
              style={[
                styles.kindBtn,
                {
                  borderColor: active ? color : t.palette.contrast_100,
                  backgroundColor: active ? color + '22' : 'transparent',
                },
              ]}>
              <View
                style={[
                  a.rounded_full,
                  {width: 7, height: 7, backgroundColor: color},
                ]}
              />
              <Text
                style={[
                  a.text_sm,
                  {color: active ? color : t.palette.contrast_700},
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      <Text
        style={[a.text_xs, a.font_bold, a.mb_xs, t.atoms.text_contrast_medium]}>
        <Trans>To</Trans>
      </Text>
      {targets.length === 0 ? (
        <Text style={[a.text_sm, a.mb_md, t.atoms.text_contrast_medium]}>
          <Trans>
            Add a second item to this collection before connecting anything.
          </Trans>
        </Text>
      ) : (
        <ScrollView style={styles.targetList} nestedScrollEnabled>
          {targets.map(item => {
            const key = getCivicTreeItemKey(item)
            const active = targetKey === key
            const already = existingKeys.has(key)
            return (
              <TouchableOpacity
                key={key}
                accessibilityRole="button"
                accessibilityLabel={getCivicTreeItemTitle(item)}
                accessibilityState={{selected: active, disabled: already}}
                disabled={already}
                onPress={() => {
                  setTargetKey(key)
                  setError(undefined)
                }}
                style={[
                  styles.target,
                  {borderColor: t.palette.contrast_100},
                  active && {
                    borderColor: t.palette.primary_500,
                    backgroundColor: t.palette.primary_25,
                  },
                  already && {opacity: 0.5},
                ]}>
                <Text
                  style={[a.text_sm, a.flex_1, t.atoms.text]}
                  numberOfLines={2}>
                  {getCivicTreeItemTitle(item)}
                </Text>
                {already ? (
                  <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
                    <Trans>Linked</Trans>
                  </Text>
                ) : null}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <TextInput
        accessibilityLabel={l`Why these are connected`}
        accessibilityHint={l`Optional note explaining the connection`}
        value={note}
        onChangeText={setNote}
        placeholder={l`Why? (optional)`}
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        multiline
      />

      {error ? (
        <Text style={[a.text_sm, a.mt_xs, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={l`Connect`}
        onPress={onConnect}
        disabled={addRelation.isPending || targets.length === 0}
        style={[
          styles.submit,
          {backgroundColor: t.palette.primary_500},
          (addRelation.isPending || targets.length === 0) && {opacity: 0.5},
        ]}>
        <Text style={[a.text_md, a.font_bold, {color: 'white'}]}>
          <Trans>Connect</Trans>
        </Text>
      </TouchableOpacity>
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  kindBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetList: {
    maxHeight: 180,
    marginBottom: 12,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
})
