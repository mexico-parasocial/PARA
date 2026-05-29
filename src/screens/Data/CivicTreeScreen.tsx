import {useCallback, useMemo, useState} from 'react'
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {CIVIC_TREE_LABELS} from '#/lib/civic-tree-labels'
import {type NavigationProp} from '#/lib/routes/types'
import {
  getCivicTreeItemKey,
  useCollectionsQuery,
  useCreateCollectionMutation,
  useDeleteCollectionMutation,
} from '#/state/queries/collections'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import {AddTreeItemDialog} from '#/components/AddTreeItemDialog'
import * as Dialog from '#/components/Dialog'
import {GraphCanvas} from '#/components/graph/GraphCanvas'
import {Bookmark as BookmarkIcon} from '#/components/icons/Bookmark'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {DotGrid_Stroke2_Corner0_Rounded as GridIcon} from '#/components/icons/DotGrid'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import * as Layout from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'

// ─── Types ─────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'graph'

// ─── Component ─────────────────────────────────────────────────────────────

export function CivicTreeScreen() {
  const {_} = useLingui()
  const deletePrompt = Prompt.usePromptControl()
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null)
  const deleteMutation = useDeleteCollectionMutation()

  const requestDelete = useCallback(
    (id: string) => {
      setCollectionToDelete(id)
      deletePrompt.open()
    },
    [deletePrompt],
  )

  const onConfirmDelete = useCallback(() => {
    if (collectionToDelete) {
      deleteMutation.mutate(
        {id: collectionToDelete},
        {
          onError: (err: Error) => {
            Toast.show(err.message || _(msg`Failed to delete collection`), {
              type: 'error',
            })
          },
        },
      )
      setCollectionToDelete(null)
    }
  }, [collectionToDelete, deleteMutation, _])

  return (
    <>
      <CivicTreeInner onRequestDelete={requestDelete} />
      <Prompt.Basic
        control={deletePrompt}
        title={_(msg`Delete collection?`)}
        description={_(msg`This will permanently delete the collection and all its items.`)}
        onConfirm={onConfirmDelete}
        confirmButtonCta={_(msg`Delete`)}
        confirmButtonColor="negative"
        isPending={deleteMutation.isPending}
      />
    </>
  )
}

function CivicTreeInner({onRequestDelete}: {onRequestDelete: (id: string) => void}) {
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()
  const {currentAccount} = useSession()
  const myDid = currentAccount?.did

  const {data: collections = [], isLoading} = useCollectionsQuery()
  const createMutation = useCreateCollectionMutation()
  const addItemControl = Dialog.useDialogControl()

  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')

  const onCreate = useCallback(() => {
    if (!newName.trim()) return
    createMutation.mutate(
      {
        name: newName.trim(),
        description: newDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNewName('')
          setNewDescription('')
          setShowCreate(false)
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to create collection`), {
            type: 'error',
          })
        },
      },
    )
  }, [newName, newDescription, createMutation, _])

  const selectedCollection =
    collections.find(c => c.id === selectedNodeId) || collections[0]

  const onPressAddItem = useCallback(() => {
    if (collections.length === 0) {
      setViewMode('list')
      setShowCreate(true)
      return
    }
    if (!selectedNodeId) {
      setSelectedNodeId(collections[0].id)
    }
    addItemControl.open()
  }, [addItemControl, collections, selectedNodeId])

  const onBrowsePolicies = useCallback(() => {
    navigation.navigate('Agora')
  }, [navigation])

  // Build graph data from collections
  const graphNodes = useMemo(() => {
    return collections.map(c => ({
      id: c.id,
      title: c.name,
      color: t.palette.primary_500,
      borderColor: t.palette.contrast_200,
      radius: 12 + Math.min(c.items.length * 0.5, 8),
      group: 'collection',
    }))
  }, [collections, t.palette.contrast_200, t.palette.primary_500])

  const graphEdges = useMemo(() => {
    // Connect collections that share saved items.
    const edges: {id: string; source: string; target: string; color?: string}[] = []
    const itemToCollections = new Map<string, string[]>()
    
    for (const c of collections) {
      for (const item of c.items) {
        const itemKey = getCivicTreeItemKey(item)
        const existing = itemToCollections.get(itemKey) || []
        itemToCollections.set(itemKey, [...existing, c.id])
      }
    }
    
    let edgeId = 0
    for (const [, collectionIds] of itemToCollections) {
      if (collectionIds.length > 1) {
        for (let i = 0; i < collectionIds.length - 1; i++) {
          for (let j = i + 1; j < collectionIds.length; j++) {
            edges.push({
              id: `edge-${edgeId++}`,
              source: collectionIds[i],
              target: collectionIds[j],
              color: '#94a3b8',
            })
          }
        }
      }
    }
    
    return edges
  }, [collections])

  if (!myDid) {
    return (
      <Layout.Screen>
        <Layout.Center>
          <Text style={t.atoms.text}>
            <Trans>Sign in to view your personal civic tree</Trans>
          </Text>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {CIVIC_TREE_LABELS.personal}
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <View style={styles.modeSwitch}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Toggle list view`)}
              accessibilityHint={_(msg`Shows collections in a list format`)}
              accessibilityState={{selected: viewMode === 'list'}}
              onPress={() => setViewMode('list')}
              style={[
                styles.modeBtn,
                viewMode === 'list' && {backgroundColor: t.palette.primary_500},
              ]}>
              <ListIcon
                size="sm"
                style={{
                  color: viewMode === 'list' ? '#fff' : t.palette.contrast_500,
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Toggle graph view`)}
              accessibilityHint={_(msg`Shows collections in an interactive tree format`)}
              accessibilityState={{selected: viewMode === 'graph'}}
              onPress={() => setViewMode('graph')}
              style={[
                styles.modeBtn,
                viewMode === 'graph' && {backgroundColor: t.palette.primary_500},
              ]}>
              <GridIcon
                size="sm"
                style={{
                  color: viewMode === 'graph' ? '#fff' : t.palette.contrast_500,
                }}
              />
            </TouchableOpacity>
          </View>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={styles.contentCenter}>
        {isLoading ? (
          <View style={styles.centeredState}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Loading your civic tree...</Trans>
            </Text>
          </View>
        ) : viewMode === 'graph' ? (
          <View style={styles.graphPane}>
            <View style={styles.searchBar}>
              <TextInput
                accessibilityLabel={_(msg`Search collections`)}
                accessibilityHint={_(msg`Filters the civic tree collections by name`)}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={_(msg`Search collections...`)}
                placeholderTextColor={t.palette.contrast_400}
                style={[
                  styles.searchInput,
                  t.atoms.text,
                  {borderColor: t.palette.contrast_100, backgroundColor: t.palette.contrast_25},
                ]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Clear search`)}
                  accessibilityHint={_(msg`Clears the current search query`)}
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}>
                  <Text style={{color: t.palette.contrast_500, fontSize: 16}}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            {graphNodes.length === 0 ? (
              <EmptyTreeCanvas
                onAddItem={onPressAddItem}
                onBrowsePolicies={onBrowsePolicies}
              />
            ) : (
              <GraphCanvas
                nodes={graphNodes}
                edges={graphEdges}
                onNodePress={(nodeId) => {
                  setSelectedNodeId(nodeId)
                  navigation.navigate('CollectionDetail', {collectionId: nodeId})
                }}
                selectedNodeId={selectedNodeId}
                searchQuery={searchQuery}
                emptyTitle={_(msg`Your personal civic tree is empty`)}
                emptySubtitle={_(msg`Create collections to organize policies, topics, evidence, links, and notes under your own control.`)}
                simulationConfig={{groupGravity: 300, springLength: 150}}
              />
            )}
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={collections}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, t.atoms.text]}>
                  <Trans>Your personal civic tree is empty</Trans>
                </Text>
                <Text
                  style={[styles.emptySubtitle, t.atoms.text_contrast_medium]}>
                  <Trans>Create collections to organize policies, topics, evidence, links, and notes under your own control.</Trans>
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={{paddingTop: 16}}>
                {showCreate ? (
                  <View
                    style={[
                      styles.createCard,
                      t.atoms.bg_contrast_25,
                      {borderWidth: 1, borderColor: t.palette.contrast_100},
                    ]}>
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      accessibilityLabel={_(msg`Collection name`)}
                      accessibilityHint={_(msg`Write the name of the new collection`)}
                      placeholder={_(msg`Collection name`)}
                      placeholderTextColor={t.palette.contrast_400}
                      style={[
                        styles.nameInput,
                        t.atoms.text,
                        {borderWidth: 1, borderColor: t.palette.contrast_100},
                      ]}
                    />
                    <TextInput
                      value={newDescription}
                      onChangeText={setNewDescription}
                      accessibilityLabel={_(msg`Collection description`)}
                      accessibilityHint={_(msg`Describe what this collection is for`)}
                      placeholder={_(msg`Description (optional)`)}
                      placeholderTextColor={t.palette.contrast_400}
                      style={[
                        styles.descriptionInput,
                        t.atoms.text,
                        {borderWidth: 1, borderColor: t.palette.contrast_100},
                      ]}
                      multiline
                      numberOfLines={2}
                    />
                    <View style={styles.createActions}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={_(msg`Cancel collection creation`)}
                        accessibilityHint={_(msg`Closes the new collection form`)}
                        onPress={() => {
                          setShowCreate(false)
                          setNewName('')
                          setNewDescription('')
                        }}
                        style={styles.cancelBtn}>
                        <Text style={t.atoms.text_contrast_medium}>
                          <Trans>Cancel</Trans>
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={_(msg`Create collection`)}
                        accessibilityHint={_(msg`Creates a new collection in your personal civic tree`)}
                        onPress={onCreate}
                        disabled={!newName.trim() || createMutation.isPending}
                        style={[
                          styles.createBtn,
                          {backgroundColor: t.palette.primary_500},
                          (!newName.trim() || createMutation.isPending) && {
                            opacity: 0.5,
                          },
                        ]}>
                        <Text style={{color: 'white', fontWeight: '700'}}>
                          <Trans>Create</Trans>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={_(msg`New collection`)}
                    accessibilityHint={_(msg`Opens the form to create a collection`)}
                    onPress={() => setShowCreate(true)}
                    style={[
                      styles.addBtn,
                      t.atoms.bg_contrast_25,
                      {borderWidth: 1, borderColor: t.palette.contrast_100},
                    ]}>
                    <PlusIcon size="md" style={{color: t.palette.primary_500}} />
                    <Text style={[styles.addBtnText, {color: t.palette.primary_500}]}>
                      <Trans>New collection</Trans>
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({item}) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={_(msg`Open collection ${item.name}`)}
                accessibilityHint={_(msg`Opens this collection from your personal civic tree`)}
                onPress={() =>
                  navigation.navigate('CollectionDetail', {collectionId: item.id})
                }
                activeOpacity={0.7}
                style={[
                  styles.collectionCard,
                  t.atoms.bg_contrast_25,
                  {borderWidth: 1, borderColor: t.palette.contrast_100},
                ]}>
                <View
                  style={[
                    styles.collectionIcon,
                    {backgroundColor: t.palette.contrast_50},
                  ]}>
                  <BookmarkIcon
                    size="md"
                    style={{color: t.palette.primary_500}}
                  />
                </View>
                <View style={styles.collectionInfo}>
                  <Text style={[styles.collectionName, t.atoms.text]}>
                    {item.name}
                  </Text>
                  {item.description ? (
                    <Text
                      style={[
                        styles.collectionDesc,
                        t.atoms.text_contrast_medium,
                      ]}
                      numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={[styles.collectionCount, t.atoms.text_contrast_low]}>
                    {item.items.length}{' '}
                    {item.items.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Delete collection ${item.name}`)}
                  accessibilityHint={_(msg`Opens the confirmation to delete this collection`)}
                  onPress={() => onRequestDelete(item.id)}
                  hitSlop={12}
                  style={styles.deleteBtn}>
                  <TrashIcon size="sm" style={{color: t.palette.contrast_400}} />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </Layout.Center>
      <AddTreeItemDialog control={addItemControl} collection={selectedCollection} />
    </Layout.Screen>
  )
}

function EmptyTreeCanvas({
  onAddItem,
  onBrowsePolicies,
}: {
  onAddItem: () => void
  onBrowsePolicies: () => void
}) {
  const t = useTheme()
  return (
    <View
      style={[
        styles.emptyTreeCanvas,
        {borderColor: t.palette.contrast_100},
      ]}>
      <View style={styles.emptyTreeNode} />
      <View style={[styles.emptyTreeLine, {backgroundColor: t.palette.contrast_100}]} />
      <View style={styles.emptyTreeNodeSmall} />
      <Text style={[styles.emptyTitle, t.atoms.text]}>
        <Trans>Your personal civic tree is empty</Trans>
      </Text>
      <Text style={[styles.emptySubtitle, t.atoms.text_contrast_medium]}>
        <Trans>Add an evidence card or browse policies to start connecting knowledge, votes, and references.</Trans>
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Add item"
          accessibilityHint="Starts adding an item to your personal civic tree"
          onPress={onAddItem}
          style={[styles.primaryAction, {backgroundColor: t.palette.primary_500}]}>
          <Text style={styles.primaryActionText}>
            <Trans>Add item</Trans>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Browse policies"
          accessibilityHint="Opens Agora to find policies to save"
          onPress={onBrowsePolicies}
          style={[
            styles.secondaryAction,
            {borderColor: t.palette.contrast_100},
          ]}>
          <Text style={[styles.secondaryActionText, t.atoms.text]}>
            <Trans>Browse policies</Trans>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  modeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  graphPane: {
    flex: 1,
    width: '100%',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 10,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTreeCanvas: {
    minHeight: 420,
    margin: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTreeNode: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#8b9bb4',
    opacity: 0.7,
  },
  emptyTreeLine: {
    width: 2,
    height: 28,
    opacity: 0.7,
  },
  emptyTreeNodeSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8b9bb4',
    opacity: 0.45,
    marginBottom: 18,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: 18,
  },
  primaryAction: {
    minHeight: 40,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontWeight: '700',
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  collectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionInfo: {
    flex: 1,
    minWidth: 0,
  },
  collectionName: {
    fontSize: 15,
    fontWeight: '700',
  },
  collectionDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  collectionCount: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  createCard: {
    padding: 16,
    borderRadius: 10,
    gap: 12,
  },
  nameInput: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  descriptionInput: {
    minHeight: 68,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  createBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: 'relative',
  },
  searchInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingRight: 36,
    fontSize: 15,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 24,
    top: 18,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
