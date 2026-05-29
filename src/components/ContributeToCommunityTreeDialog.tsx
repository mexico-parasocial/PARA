import {useMemo, useState} from 'react'
import {StyleSheet, TextInput, TouchableOpacity, View} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {CIVIC_TREE_COPY, CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {
  CIVIC_TREE_SOURCE_TYPES,
  type CivicTreeSourceType,
  inferCivicTreeSourceType,
} from '#/lib/civic-tree-source-types'
import {type NavigationProp} from '#/lib/routes/types'
import {useCommunityBoardsQuery} from '#/state/queries/community-boards'
import {useCreateCommunityTreeContributionMutation} from '#/state/queries/community-civic-tree'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import * as Toast from '#/components/Toast'

export function ContributeToCommunityTreeDialog({
  control,
  sourceUri,
  title,
  category,
}: {
  control: Dialog.DialogControlProps
  sourceUri: string
  title: string
  category?: string
}) {
  return (
    <Dialog.Outer control={control} testID="contributeToCommunityTreeDialog">
      <Dialog.Handle />
      <ContributeToCommunityTreeDialogInner
        control={control}
        sourceUri={sourceUri}
        title={title}
        category={category}
      />
    </Dialog.Outer>
  )
}

function ContributeToCommunityTreeDialogInner({
  control,
  sourceUri,
  title,
  category,
}: {
  control: Dialog.DialogControlProps
  sourceUri: string
  title: string
  category?: string
}) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const {data: boardsData, isLoading} = useCommunityBoardsQuery({limit: 50})
  const createContribution = useCreateCommunityTreeContributionMutation()
  const [selectedCommunityUri, setSelectedCommunityUri] = useState<string>()
  const [sourceType, setSourceType] = useState<CivicTreeSourceType>(() =>
    inferCivicTreeSourceType(`${sourceUri} ${category ?? ''} ${title}`),
  )
  const [note, setNote] = useState('')

  const activeBoards = useMemo(
    () =>
      (boardsData?.boards ?? []).filter(
        board =>
          board.viewerMembershipState === 'active' ||
          board.viewerMembershipState === 'pending',
      ),
    [boardsData],
  )

  const selectedBoard = activeBoards.find(
    board => board.uri === selectedCommunityUri,
  )

  const onContribute = () => {
    if (!currentAccount?.did || !selectedBoard) return

    createContribution.mutate(
      {
        communityUri: selectedBoard.uri,
        authorDid: currentAccount.did,
        title,
        content:
          note.trim() ||
          (category
            ? `Aporte desde una política o tema guardado: ${category}`
            : 'Aporte desde una política o tema guardado.'),
        sourceUrl: sourceUri,
        sourceType,
        metadata: JSON.stringify({
          sourceType,
          contributionContext: 'community_civic_tree',
          origin: 'personal_civic_tree_item',
          personalCollectionShared: false,
        }),
      },
      {
        onSuccess: data => {
          Toast.show('Aporte enviado a revisión comunitaria')
          control.close()
          setNote('')
          setSelectedCommunityUri(undefined)
          navigation.navigate('CommunityCivicTree', {
            communityUri: selectedBoard.uri,
            communityName: selectedBoard.name,
            pendingContributionId: data.contribution.id,
            entryPoint: 'contribution_submitted',
          })
        },
        onError: (err: Error) => {
          Toast.show(err.message || 'No se pudo publicar el aporte', {
            type: 'error',
          })
        },
      },
    )
  }

  return (
    <Dialog.Inner label={CIVIC_TREE_LABELS.contributeCommunity}>
      <Text style={[styles.title, t.atoms.text]}>
        <Trans>Aportar al Árbol Cívico Comunitario</Trans>
      </Text>
      <Text style={[styles.description, t.atoms.text_contrast_medium]}>
        {CIVIC_TREE_COPY.contributionPrivacy}
      </Text>

      <View style={[styles.preview, t.atoms.bg_contrast_25]}>
        <Text style={[styles.previewTitle, t.atoms.text]} numberOfLines={2}>
          {title}
        </Text>
        {category ? (
          <Text style={[styles.previewMeta, t.atoms.text_contrast_medium]}>
            {category}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, t.atoms.text]}>
          <Trans>Comunidad</Trans>
        </Text>
        {isLoading ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Cargando comunidades...</Trans>
          </Text>
        ) : activeBoards.length === 0 ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>Únete a una comunidad para aportar a su árbol cívico.</Trans>
          </Text>
        ) : (
          activeBoards.map(board => {
            const selected = board.uri === selectedCommunityUri
            return (
              <TouchableOpacity
                key={board.uri}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ${board.name}`}
                accessibilityHint="Elige la comunidad donde se publicará este aporte"
                accessibilityState={{selected}}
                onPress={() => setSelectedCommunityUri(board.uri)}
                style={[
                  styles.communityRow,
                  t.atoms.bg_contrast_25,
                  {
                    borderColor: selected
                      ? t.palette.primary_500
                      : t.palette.contrast_100,
                  },
                ]}>
                <Text style={[styles.communityName, t.atoms.text]}>
                  {board.name}
                </Text>
                {selected ? (
                  <Text style={{color: t.palette.primary_500}}>✓</Text>
                ) : null}
              </TouchableOpacity>
            )
          })
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionLabel, t.atoms.text]}>
          <Trans>Tipo de fuente</Trans>
        </Text>
        <View style={styles.typeGrid}>
          {CIVIC_TREE_SOURCE_TYPES.map(type => {
            const selected = type.value === sourceType
            return (
              <TouchableOpacity
                key={type.value}
                accessibilityRole="button"
                accessibilityLabel={`Tipo de fuente: ${type.label}`}
                accessibilityHint="Clasifica el formato del aporte para el árbol cívico comunitario"
                accessibilityState={{selected}}
                onPress={() => setSourceType(type.value)}
                style={[
                  styles.typePill,
                  {
                    borderColor: selected
                      ? t.palette.primary_500
                      : t.palette.contrast_100,
                    backgroundColor: selected
                      ? t.palette.primary_25
                      : t.palette.contrast_25,
                  },
                ]}>
                <Text
                  style={[
                    styles.typePillText,
                    {
                      color: selected
                        ? t.palette.primary_500
                        : t.palette.contrast_700,
                    },
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        accessibilityLabel="Nota pública"
        accessibilityHint="Agrega contexto público para este aporte"
        placeholder="Agrega contexto público opcional"
        placeholderTextColor={t.palette.contrast_400}
        multiline
        style={[
          styles.noteInput,
          t.atoms.text,
          {borderColor: t.palette.contrast_100},
        ]}
      />

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Enviar aporte a revisión"
        accessibilityHint="Envía este elemento a revisión comunitaria para el árbol seleccionado"
        disabled={!selectedCommunityUri || createContribution.isPending}
        onPress={onContribute}
        style={[
          styles.submitButton,
          {backgroundColor: t.palette.primary_500},
          (!selectedCommunityUri || createContribution.isPending) && {
            opacity: 0.5,
          },
        ]}>
        <Text style={styles.submitText}>
          <Trans>Enviar a revisión</Trans>
        </Text>
      </TouchableOpacity>

      <Dialog.Close />
    </Dialog.Inner>
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  preview: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  previewMeta: {
    fontSize: 13,
    marginTop: 4,
  },
  section: {
    gap: 8,
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  communityRow: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  communityName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  submitButton: {
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
})
