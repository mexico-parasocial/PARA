import {useMemo, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {
  type CivicNodeCandidate,
  type FlairOption,
  searchCivicNodes,
} from '#/features/civicTree/nodeSearch'
import {FLAIR_GROUPS} from '#/lib/tags'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {
  createCivicTreeItemId,
  type CivicTreeItem,
} from '#/state/queries/collection-items'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useTheme} from '#/alf'
import {PERSONAL_ITEM_KIND_COLORS} from '#/features/civicTree/colors'

/**
 * Flattens PARA's curated flair vocabulary into search candidates. These are
 * the shared names for subjects; a user inventing their own splits the graph,
 * so the picker offers these before it offers to create anything.
 */
function useFlairOptions(): FlairOption[] {
  return useMemo(() => {
    const out: FlairOption[] = []
    const groups: [string, Record<string, unknown>][] = [
      ['Policy topics', FLAIR_GROUPS.POLICY],
      ['Matters', FLAIR_GROUPS.MATTER],
    ]
    for (const [group, categories] of groups) {
      for (const [category, flairs] of Object.entries(categories)) {
        for (const flair of flairs as {
          id: string
          label: string
          color?: string
        }[]) {
          out.push({
            id: flair.id,
            label: flair.label,
            color: flair.color,
            group,
            // Categories are numbered for ordering ("1. SERVICIOS PÚBLICOS").
            category: category.replace(/^\d+\.\s*/, ''),
          })
        }
      }
    }
    return out
  }, [])
}

/** Turns a chosen candidate into the item that gets saved to a collection. */
export function candidateToItem(candidate: CivicNodeCandidate): CivicTreeItem {
  return {
    itemId: candidate.key,
    title: candidate.title,
    kind: candidate.kind,
    ...(candidate.uri
      ? {policyUri: candidate.uri, sourceUri: candidate.uri}
      : {}),
    ...(candidate.flairId ? {flairId: candidate.flairId} : {}),
    addedAt: new Date().toISOString(),
  }
}

/**
 * Search over everything that can become a node, rendered inline rather than in
 * its own dialog: picking a policy or a topic is one branch of "add an item",
 * not a separate errand, and splitting it across two entry points made the
 * user choose a mechanism before they had chosen a thing.
 */
export function CivicNodeResults({
  kind,
  onPick,
}: {
  /** Which half of the vocabulary to show. */
  kind: 'policy' | 'topic'
  onPick: (item: CivicTreeItem) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const [query, setQuery] = useState('')

  const {data: cabildeos = []} = useCabildeosQuery()
  const flairs = useFlairOptions()

  const policies = useMemo(
    () =>
      cabildeos.map(c => ({
        uri: c.uri,
        title: c.title,
        community: c.community,
      })),
    [cabildeos],
  )

  const results = useMemo(
    () => searchCivicNodes({query, policies, flairs}),
    [query, policies, flairs],
  )

  const choose = (candidate: CivicNodeCandidate) => {
    onPick(candidateToItem(candidate))
    setQuery('')
  }

  const sections: {title: string; rows: CivicNodeCandidate[]}[] = (
    kind === 'policy'
      ? [{title: l`Live policies`, rows: results.policies}]
      : [{title: l`Topics and matters`, rows: results.topics}]
  ).filter(s => s.rows.length > 0)

  /* Only a topic can be invented; a policy has to already exist. */
  const canCreate = kind === 'topic' && results.canCreate

  return (
    <View>
      <TextInput
        accessibilityLabel={
          kind === 'policy' ? l`Search policies` : l`Search topics`
        }
        accessibilityHint={l`Filters live policies and PARA's shared topic vocabulary`}
        value={query}
        onChangeText={setQuery}
        placeholder={
          kind === 'policy'
            ? l`Search live policies...`
            : l`Search topics and matters...`
        }
        placeholderTextColor={t.palette.contrast_400}
        style={[
          styles.input,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
        autoFocus
      />

      <ScrollView style={styles.results} nestedScrollEnabled>
        {sections.map(section => (
          <View key={section.title} style={a.mb_sm}>
            <Text
              style={[
                a.text_xs,
                a.font_bold,
                a.mb_2xs,
                t.atoms.text_contrast_medium,
              ]}>
              {section.title}
            </Text>
            {section.rows.map(row => (
              <TouchableOpacity
                key={row.key}
                accessibilityRole="button"
                accessibilityLabel={row.title}
                accessibilityHint={l`Adds this as a node in your civic tree`}
                onPress={() => choose(row)}
                style={[styles.row, {borderColor: t.palette.contrast_100}]}>
                <View
                  style={[
                    a.rounded_full,
                    {
                      width: 10,
                      height: 10,
                      backgroundColor:
                        row.color ?? PERSONAL_ITEM_KIND_COLORS[row.kind],
                    },
                  ]}
                />
                <View style={a.flex_1}>
                  <Text style={[a.text_sm, t.atoms.text]} numberOfLines={2}>
                    {row.title}
                  </Text>
                  {row.detail ? (
                    <Text
                      style={[a.text_xs, t.atoms.text_contrast_medium]}
                      numberOfLines={1}>
                      {row.detail}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {canCreate ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={l`Create topic ${query}`}
            accessibilityHint={l`Creates a topic of your own with this name`}
            onPress={() =>
              choose({
                key: createCivicTreeItemId(),
                title: query.trim(),
                kind: 'topic',
                section: 'Topics',
              })
            }
            style={[
              styles.row,
              {
                borderColor: t.palette.primary_500,
                backgroundColor: t.palette.primary_25,
              },
            ]}>
            <View
              style={[
                a.rounded_full,
                {
                  width: 10,
                  height: 10,
                  backgroundColor: PERSONAL_ITEM_KIND_COLORS.topic,
                },
              ]}
            />
            <Text style={[a.text_sm, a.flex_1, t.atoms.text]}>
              <Trans>Create topic “{query.trim()}”</Trans>
            </Text>
          </TouchableOpacity>
        ) : null}

        {sections.length === 0 && !canCreate ? (
          <Text style={[a.text_sm, a.py_md, t.atoms.text_contrast_medium]}>
            {kind === 'policy' ? (
              <Trans>No live policy matches that.</Trans>
            ) : (
              <Trans>Start typing to find or name a topic.</Trans>
            )}
          </Text>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  results: {
    maxHeight: 340,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
})
