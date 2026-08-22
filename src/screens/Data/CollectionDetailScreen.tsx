import {useCallback, useState} from 'react'
import {
  FlatList,
  Linking,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation, useRoute} from '@react-navigation/native'

import {
  canContributeItem,
  contributionFromItem,
} from '#/features/civicTree/contribution'
import {buildPersonalCivicTreeVaultManifest} from '#/lib/civic-export/obsidian'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type CivicTreeItem,
  getCivicTreeItemKey,
  getCivicTreeItemKind,
  getCivicTreeItemTitle,
  useCollectionQuery,
  useDuplicateCollectionMutation,
  useRemoveFromCollectionMutation,
  useUpdateCollectionMutation,
} from '#/state/queries/collections'
import {useExportCollectionToSembleMutation} from '#/state/queries/sembe'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {AddTreeItemDialog} from '#/features/personalCivicTree/components/AddTreeItemDialog'
import {ConnectTreeItemsDialog} from '#/features/personalCivicTree/components/ConnectTreeItemsDialog'
import {ContributeToCommunityTreeDialog} from '#/features/communityCivicTree/components/ContributeToCommunityTreeDialog'
import * as Dialog from '#/components/Dialog'
import {ArrowCornerDownRight_Stroke2_Corner2_Rounded as ConnectIcon} from '#/components/icons/ArrowCornerDownRight'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as DownIcon,
  ChevronTop_Stroke2_Corner0_Rounded as UpIcon,
} from '#/components/icons/Chevron'
import {Pencil_Stroke2_Corner0_Rounded as PencilIcon} from '#/components/icons/Pencil'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {SquareArrowTopRight_Stroke2_Corner0_Rounded as ExportIcon} from '#/components/icons/SquareArrowTopRight'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import * as Layout from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'

export function CollectionDetailScreen() {
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<{
    key: string
    name: 'CollectionDetail'
    params: {collectionId: string}
  }>()
  const t = useTheme()
  const {currentAccount} = useSession()
  const collectionId = route.params.collectionId

  const {data: collection, isLoading} = useCollectionQuery(collectionId)
  const removeMutation = useRemoveFromCollectionMutation()
  const updateMutation = useUpdateCollectionMutation()
  const duplicateMutation = useDuplicateCollectionMutation()
  const exportMutation = useExportCollectionToSembleMutation()
  const addItemControl = Dialog.useDialogControl()
  const connectControl = Dialog.useDialogControl()
  const contributeControl = Dialog.useDialogControl()
  const [contributeSourceKey, setContributeSourceKey] = useState<
    string | undefined
  >()
  const [connectSourceKey, setConnectSourceKey] = useState<string | undefined>()
  const exportPrompt = Prompt.usePromptControl()

  const deletePrompt = Prompt.usePromptControl()
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const startEditing = useCallback(() => {
    if (!collection) return
    setEditName(collection.name)
    setEditDescription(collection.description || '')
    setIsEditing(true)
  }, [collection])

  const cancelEditing = useCallback(() => {
    setIsEditing(false)
  }, [])

  const saveEditing = useCallback(() => {
    if (!collection || !editName.trim()) return
    updateMutation.mutate(
      {
        id: collectionId,
        collection: {
          id: collection.id,
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          color: collection.color,
          items: collection.items,
          relations: collection.relations || [],
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false)
          Toast.show(_(msg`Collection updated`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to update`), {type: 'error'})
        },
      },
    )
  }, [collection, collectionId, editName, editDescription, updateMutation, _])

  const requestDelete = useCallback(
    (itemKey: string) => {
      setItemToDelete(itemKey)
      deletePrompt.open()
    },
    [deletePrompt],
  )

  const onRemove = useCallback(() => {
    if (!itemToDelete) return
    removeMutation.mutate(
      {collectionId, itemKey: itemToDelete},
      {
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to remove`), {type: 'error'})
        },
      },
    )
    setItemToDelete(null)
  }, [collectionId, itemToDelete, removeMutation, _])

  const onMove = useCallback(
    (index: number, direction: -1 | 1) => {
      if (!collection) return
      const newIndex = index + direction
      if (newIndex < 0 || newIndex >= collection.items.length) return

      const items = [...collection.items]
      const [moved] = items.splice(index, 1)
      items.splice(newIndex, 0, moved)

      updateMutation.mutate({
        id: collectionId,
        collection: {
          id: collection.id,
          name: collection.name,
          description: collection.description,
          color: collection.color,
          items,
          relations: collection.relations || [],
        },
      })
    },
    [collection, collectionId, updateMutation],
  )

  const onDuplicate = useCallback(() => {
    if (!collection) return
    const newName = `${collection.name} (${_(msg`copy`)})`
    duplicateMutation.mutate(
      {sourceId: collectionId, newName},
      {
        onSuccess: data => {
          Toast.show(_(msg`Collection duplicated`))
          navigation.navigate('CollectionDetail', {collectionId: data.id})
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to duplicate`), {
            type: 'error',
          })
        },
      },
    )
  }, [collection, collectionId, duplicateMutation, navigation, _])

  /*
   * Browsing used to navigate to Agora and lose the user's place. A policy is
   * a node in this collection, so the picker brings it here instead - and the
   * same picker names topics, which are the nodes with no artifact behind them.
   */
  const onBrowsePolicies = useCallback(() => {
    addItemControl.open()
  }, [addItemControl])

  const onExportToSemble = useCallback(() => {
    if (!collection) return
    exportMutation.mutate(
      {collection},
      {
        onSuccess: data => {
          Toast.show(_(msg`Exported to Semble.so`))
          // Open the collection on Semble.so
          const rkey = data.collectionUri.split('/').pop()
          if (rkey) {
            Linking.openURL(
              `https://semble.so/profile/${currentAccount?.handle}/collections/${rkey}`,
            ).catch(() => {
              // silently fail
            })
          }
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to export to Semble.so`), {
            type: 'error',
          })
        },
      },
    )
  }, [collection, exportMutation, currentAccount?.handle, _])

  const onExportToObsidian = useCallback(() => {
    if (!collection) return
    const manifest = buildPersonalCivicTreeVaultManifest([collection])
    Clipboard.setStringAsync(JSON.stringify(manifest, null, 2))
      .then(() => {
        Toast.show(_(msg`Obsidian vault manifest copied`))
      })
      .catch((err: Error) => {
        Toast.show(err.message || _(msg`Failed to copy export`), {
          type: 'error',
        })
      })
  }, [collection, _])

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          {isEditing ? (
            <View style={styles.headerEdit}>
              <TextInput
                accessibilityLabel={_(msg`Collection name`)}
                accessibilityHint={_(msg`Edit the collection name`)}
                value={editName}
                onChangeText={setEditName}
                placeholder={_(msg`Collection name`)}
                placeholderTextColor={t.palette.contrast_400}
                style={[styles.editNameInput, t.atoms.text]}
                autoFocus
              />
            </View>
          ) : (
            <Layout.Header.TitleText>
              {collection?.name || _(msg`Collection`)}
            </Layout.Header.TitleText>
          )}
          {!isEditing && collection ? (
            <Text style={[styles.headerSubtitle, t.atoms.text_contrast_medium]}>
              {collection.items.length}{' '}
              {collection.items.length === 1 ? _(msg`item`) : _(msg`items`)}
              {collection.description ? ` - ${collection.description}` : ''}
            </Text>
          ) : null}
        </Layout.Header.Content>

        {isEditing ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Cancel editing`)}
              accessibilityHint={_(
                msg`Closes collection editing without saving`,
              )}
              onPress={cancelEditing}>
              <Text style={t.atoms.text_contrast_medium}>
                <Trans>Cancel</Trans>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Save collection`)}
              accessibilityHint={_(msg`Saves collection changes`)}
              onPress={saveEditing}
              disabled={!editName.trim() || updateMutation.isPending}>
              <Text
                style={[
                  t.atoms.text,
                  {fontWeight: '700'},
                  (!editName.trim() || updateMutation.isPending) && {
                    opacity: 0.5,
                  },
                ]}>
                <Trans>Save</Trans>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.headerActions}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Edit collection`)}
              accessibilityHint={_(msg`Opens collection editing`)}
              onPress={startEditing}
              hitSlop={8}>
              <PencilIcon size="sm" style={{color: t.palette.contrast_400}} />
            </TouchableOpacity>
          </View>
        )}
      </Layout.Header.Outer>

      {isEditing && (
        <Layout.Center>
          <View style={[styles.editPanel, t.atoms.bg_contrast_25]}>
            <TextInput
              accessibilityLabel={_(msg`Collection description`)}
              accessibilityHint={_(msg`Edit the collection description`)}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={_(msg`Description (optional)`)}
              placeholderTextColor={t.palette.contrast_400}
              style={[styles.editDescInput, t.atoms.text]}
              multiline
              numberOfLines={2}
            />
          </View>
        </Layout.Center>
      )}

      <Layout.Center style={styles.contentCenter}>
        {isLoading ? (
          <View style={styles.centeredState}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Loading...</Trans>
            </Text>
          </View>
        ) : !collection ? (
          <View style={styles.centeredState}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Collection not found</Trans>
            </Text>
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={collection.items}
            keyExtractor={getCivicTreeItemKey}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.detailHeader}>
                <Text style={[styles.detailTitle, t.atoms.text]}>
                  {collection.name}
                </Text>
                {collection.description ? (
                  <Text
                    style={[
                      styles.detailDescription,
                      t.atoms.text_contrast_medium,
                    ]}>
                    {collection.description}
                  </Text>
                ) : null}
                <View style={styles.toolbar}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Add item`)}
                    accessibilityHint={_(
                      msg`Opens the form to add an item to this collection`,
                    )}
                    onPress={addItemControl.open}
                    style={[
                      styles.primaryBtn,
                      {backgroundColor: t.palette.primary_500},
                    ]}>
                    <PlusIcon size="sm" style={{color: 'white'}} />
                    <Text style={styles.primaryBtnText}>
                      <Trans>Add item</Trans>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Browse policies`)}
                    accessibilityHint={_(
                      msg`Finds a policy or topic to add to this collection`,
                    )}
                    onPress={onBrowsePolicies}
                    style={[
                      styles.secondaryBtn,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <Text style={[styles.secondaryBtnText, t.atoms.text]}>
                      <Trans>Add policy or topic</Trans>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Duplicate collection`)}
                    accessibilityHint={_(
                      msg`Creates a copy of this collection`,
                    )}
                    onPress={onDuplicate}
                    disabled={duplicateMutation.isPending}
                    style={[
                      styles.secondaryBtn,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <Text style={[styles.secondaryBtnText, t.atoms.text]}>
                      <Trans>Duplicate</Trans>
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Export to Semble.so`)}
                    accessibilityHint={_(
                      msg`Exports this collection to Semble.so as a research trail`,
                    )}
                    onPress={() => exportPrompt.open()}
                    disabled={
                      exportMutation.isPending || collection.items.length === 0
                    }
                    style={[
                      styles.secondaryBtn,
                      {borderColor: t.palette.contrast_100},
                    ]}>
                    <ExportIcon
                      size="sm"
                      style={{color: t.palette.contrast_400}}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`Export to Obsidian`)}
                    accessibilityHint={_(
                      msg`Copies an Obsidian-ready vault manifest for this collection`,
                    )}
                    onPress={onExportToObsidian}
                    disabled={collection.items.length === 0}
                    style={[
                      styles.secondaryBtn,
                      {borderColor: t.palette.contrast_100},
                      collection.items.length === 0 && {opacity: 0.5},
                    ]}>
                    <Text style={[styles.secondaryBtnText, t.atoms.text]}>
                      <Trans>Obsidian</Trans>
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, t.atoms.text]}>
                  <Trans>No items yet</Trans>
                </Text>
                <Text
                  style={[styles.emptySubtitle, t.atoms.text_contrast_medium]}>
                  <Trans>
                    Add evidence, links, notes, or policies to this collection
                    in your personal civic tree.
                  </Trans>
                </Text>
              </View>
            }
            renderItem={({item, index}) => (
              <CivicTreeItemRow
                item={item}
                index={index}
                total={collection.items.length}
                onMove={onMove}
                onRequestDelete={requestDelete}
                relationCount={
                  (collection.relations ?? []).filter(
                    r =>
                      r.fromItemId === getCivicTreeItemKey(item) ||
                      r.toItemId === getCivicTreeItemKey(item),
                  ).length
                }
                onConnect={() => {
                  setConnectSourceKey(getCivicTreeItemKey(item))
                  connectControl.open()
                }}
                canContribute={canContributeItem(item)}
                onContribute={() => {
                  setContributeSourceKey(getCivicTreeItemKey(item))
                  contributeControl.open()
                }}
                onPressItem={() => {
                  if (item.policyUri) {
                    navigation.navigate('PolicyDetails', {
                      cabildeoUri: item.policyUri,
                    })
                  } else if (item.url) {
                    Linking.openURL(item.url).catch(() => {
                      Toast.show(_(msg`Could not open link`), {type: 'error'})
                    })
                  }
                }}
              />
            )}
          />
        )}
      </Layout.Center>

      <Prompt.Basic
        control={exportPrompt}
        title={_(msg`Export to Semble.so?`)}
        description={_(
          msg`This will create a public research collection on Semble.so with your cards and connections.`,
        )}
        onConfirm={onExportToSemble}
        confirmButtonCta={_(msg`Export`)}
        isPending={exportMutation.isPending}
      />
      <Prompt.Basic
        control={deletePrompt}
        title={_(msg`Remove item?`)}
        description={_(msg`This will remove the item from this collection.`)}
        onConfirm={onRemove}
        confirmButtonCta={_(msg`Remove`)}
        confirmButtonColor="negative"
        isPending={removeMutation.isPending}
      />
      <AddTreeItemDialog control={addItemControl} collection={collection} />
      {/*
       * Always mounted, like the connect dialog: control.open() fires in the
       * same handler that sets the key, so a conditionally mounted dialog
       * would not exist yet at the moment it is asked to open.
       */}
      <ContributeToCommunityTreeDialog
        control={contributeControl}
        {...contributionFromItem(
          collection?.items.find(
            i => getCivicTreeItemKey(i) === contributeSourceKey,
          ) ?? {addedAt: ''},
        )}
      />
      <ConnectTreeItemsDialog
        control={connectControl}
        collection={collection}
        sourceItem={collection?.items.find(
          i => getCivicTreeItemKey(i) === connectSourceKey,
        )}
      />
    </Layout.Screen>
  )
}

function CivicTreeItemRow({
  item,
  index,
  total,
  onMove,
  onRequestDelete,
  onPressItem,
  onConnect,
  onContribute,
  canContribute,
  relationCount,
}: {
  item: CivicTreeItem
  index: number
  total: number
  onMove: (index: number, direction: -1 | 1) => void
  onRequestDelete: (itemKey: string) => void
  onPressItem: () => void
  onConnect: () => void
  onContribute: () => void
  canContribute: boolean
  relationCount: number
}) {
  const t = useTheme()
  const itemKey = getCivicTreeItemKey(item)
  const kind = getCivicTreeItemKind(item)
  const title = getCivicTreeItemTitle(item)
  const hasTarget = Boolean(item.policyUri || item.url)

  return (
    <View
      style={[
        styles.itemCard,
        t.atoms.bg_contrast_25,
        {borderWidth: 1, borderColor: t.palette.contrast_100},
      ]}>
      <View
        style={[styles.colorStripe, {backgroundColor: t.palette.contrast_200}]}
      />
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.itemInfo}
        onPress={onPressItem}
        disabled={!hasTarget}
        activeOpacity={0.7}>
        <Text style={[styles.itemTitle, t.atoms.text]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.itemCategory, t.atoms.text_contrast_medium]}>
          {kind}
          {item.policyCategory ? ` - ${item.policyCategory}` : ''}
          {item.sourceLabel ? ` - ${item.sourceLabel}` : ''}
        </Text>
        {item.description ? (
          <Text
            style={[styles.itemDescription, t.atoms.text_contrast_medium]}
            numberOfLines={3}>
            {item.description}
          </Text>
        ) : null}
        {item.url ? (
          <Text style={[styles.itemCategory, t.atoms.text_contrast_medium]}>
            {item.url}
          </Text>
        ) : null}
        {item.note ? (
          <Text
            style={[styles.itemNote, t.atoms.text_contrast_medium]}
            numberOfLines={3}>
            {item.note}
          </Text>
        ) : null}
      </TouchableOpacity>
      <View style={styles.actions}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onMove(index, -1)}
          disabled={index === 0}
          style={[styles.actionBtn, index === 0 && styles.actionBtnDisabled]}>
          <UpIcon size="xs" style={{color: t.palette.contrast_400}} />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onMove(index, 1)}
          disabled={index === total - 1}
          style={[
            styles.actionBtn,
            index === total - 1 && styles.actionBtnDisabled,
          ]}>
          <DownIcon size="xs" style={{color: t.palette.contrast_400}} />
        </TouchableOpacity>
        {canContribute ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Contribute to a community tree"
            accessibilityHint="Shares only this item with a community for review; your collection stays private"
            onPress={onContribute}
            style={styles.actionBtn}>
            <TreeIcon size="xs" style={{color: t.palette.contrast_400}} />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Connect this item"
          accessibilityHint="Links this item to another item in the collection"
          onPress={onConnect}
          style={styles.actionBtn}>
          <ConnectIcon
            size="xs"
            style={{
              color:
                relationCount > 0
                  ? t.palette.primary_500
                  : t.palette.contrast_400,
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => onRequestDelete(itemKey)}
          style={styles.actionBtn}>
          <TrashIcon size="xs" style={{color: t.palette.contrast_400}} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  headerEdit: {
    flex: 1,
    justifyContent: 'center',
  },
  editNameInput: {
    fontSize: 17,
    fontWeight: '700',
    padding: 0,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editPanel: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    gap: 10,
  },
  editDescInput: {
    fontSize: 14,
    padding: 0,
    minHeight: 40,
  },
  contentCenter: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: 16,
    gap: 10,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  detailHeader: {
    paddingBottom: 10,
    gap: 10,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  detailDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  primaryBtn: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontWeight: '700',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  colorStripe: {
    width: 4,
    alignSelf: 'stretch',
  },
  itemInfo: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  itemCategory: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  itemDescription: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  itemNote: {
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    gap: 2,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 6,
  },
  actionBtnDisabled: {
    opacity: 0.2,
  },
})
