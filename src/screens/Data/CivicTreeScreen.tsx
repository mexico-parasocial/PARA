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

import {type NavigationProp} from '#/lib/routes/types'
import {
  getCivicTreeItemKey,
  useCollectionsQuery,
  useDeleteCollectionMutation,
  useRemoveFromCollectionMutation,
} from '#/state/queries/collections'
import {useSession} from '#/state/session'
import {Text} from '#/view/com/util/text/Text'
import {useTheme} from '#/alf'
import * as Dialog from '#/components/Dialog'
import {GraphCanvas} from '#/components/graph/GraphCanvas'
import {Bookmark as BookmarkIcon} from '#/components/icons/Bookmark'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {
  DotGrid_Stroke2_Corner0_Rounded as GridIcon,
  DotGrid3x1_Stroke2_Corner0_Rounded as EllipsisIcon,
} from '#/components/icons/DotGrid'
import {Earth_Stroke2_Corner0_Rounded as EarthIcon} from '#/components/icons/Globe'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import * as Layout from '#/components/Layout'
import * as Menu from '#/components/Menu'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {CIVIC_TREE_LABELS} from '#/features/civicTree/labels'
import {AddTreeItemDialog} from '#/features/personalCivicTree/components/AddTreeItemDialog'
import {CollectionActionsDialog} from '#/features/personalCivicTree/components/CollectionActionsDialog'
import {CollectionShelf} from '#/features/personalCivicTree/components/CollectionShelf'
import {EditTreeItemDialog} from '#/features/personalCivicTree/components/EditTreeItemDialog'
import {ExploreView} from '#/features/personalCivicTree/components/ExploreView'
import {NewCollectionDialog} from '#/features/personalCivicTree/components/NewCollectionDialog'
import {
  PersonalTreeLegend,
  PersonalTreeUnconnectedNotice,
} from '#/features/personalCivicTree/components/PersonalTreeLegend'
import {PersonalTreeNodeSheet} from '#/features/personalCivicTree/components/PersonalTreeNodeSheet'
import {buildPersonalTreeGraph} from '#/features/personalCivicTree/graph'

// ─── Types ─────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'graph' | 'explore'

// ─── Component ─────────────────────────────────────────────────────────────

export function CivicTreeScreen() {
  const {_} = useLingui()
  const deletePrompt = Prompt.usePromptControl()
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  )
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
        description={_(
          msg`This will permanently delete the collection and all its items.`,
        )}
        onConfirm={onConfirmDelete}
        confirmButtonCta={_(msg`Delete`)}
        confirmButtonColor="negative"
        isPending={deleteMutation.isPending}
      />
    </>
  )
}

function CivicTreeInner({
  onRequestDelete,
}: {
  onRequestDelete: (id: string) => void
}) {
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const t = useTheme()
  const {currentAccount} = useSession()
  const myDid = currentAccount?.did

  const {data: collections = [], isLoading} = useCollectionsQuery()
  const addItemControl = Dialog.useDialogControl()
  const newCollectionControl = Dialog.useDialogControl()
  const collectionActionsControl = Dialog.useDialogControl()
  const editItemControl = Dialog.useDialogControl()
  const removeItemPrompt = Prompt.usePromptControl()
  const removeItemMutation = useRemoveFromCollectionMutation()

  const [viewMode, setViewMode] = useState<ViewMode>('graph')
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [actionsCollectionId, setActionsCollectionId] = useState<
    string | undefined
  >()
  const [itemActionNodeId, setItemActionNodeId] = useState<string | undefined>()

  /*
   * v1 drew collections as the nodes and synthesised an edge whenever two of
   * them shared an item, which pictured the folders while hiding their
   * contents. The graph is now built from the items themselves and from the
   * relations the user actually authored - see personal-tree-graph.ts.
   */
  const graph = useMemo(
    () => buildPersonalTreeGraph(collections),
    [collections],
  )

  /*
   * selectedNodeId identifies an item node, not a collection, so the add-item
   * dialog resolves its target through the selected node's collection and
   * falls back to the first collection when nothing is selected.
   */
  const selectedCollection = useMemo(() => {
    const node = graph.nodes.find(n => n.id === selectedNodeId)
    if (node) {
      const owner = collections.find(c => c.id === node.metadata.collectionId)
      if (owner) return owner
    }
    return collections[0]
  }, [collections, graph.nodes, selectedNodeId])

  /*
   * Adds into the selected collection, or the first one. With no collection at
   * all there is nowhere to put a node, so fall back to creating one.
   */
  const onPressAddItem = useCallback(() => {
    if (collections.length === 0) {
      newCollectionControl.open()
      return
    }
    addItemControl.open()
  }, [addItemControl, newCollectionControl, collections.length])

  const actionsCollection = collections.find(c => c.id === actionsCollectionId)
  const itemActionNode = graph.nodes.find(n => n.id === itemActionNodeId)
  const itemActionCollection = itemActionNode
    ? collections.find(c => c.id === itemActionNode.metadata.collectionId)
    : undefined

  const onPressCollectionActions = useCallback(
    (collectionId: string) => {
      setActionsCollectionId(collectionId)
      collectionActionsControl.open()
    },
    [collectionActionsControl],
  )

  const onEditItem = useCallback(
    (nodeId: string) => {
      setItemActionNodeId(nodeId)
      editItemControl.open()
    },
    [editItemControl],
  )

  const onRequestRemoveItem = useCallback(
    (nodeId: string) => {
      setItemActionNodeId(nodeId)
      removeItemPrompt.open()
    },
    [removeItemPrompt],
  )

  const onConfirmRemoveItem = useCallback(() => {
    if (!itemActionNode) return
    removeItemMutation.mutate(
      {
        collectionId: itemActionNode.metadata.collectionId,
        itemKey: getCivicTreeItemKey(itemActionNode.metadata.item),
      },
      {
        onSuccess: () => {
          setSelectedNodeId(undefined)
          Toast.show(_(msg`Item removed`))
        },
        onError: (err: Error) => {
          Toast.show(err.message || _(msg`Failed to remove item`), {
            type: 'error',
          })
        },
      },
    )
    setItemActionNodeId(undefined)
  }, [itemActionNode, removeItemMutation, _])

  const [activeGroups, setActiveGroups] = useState<Set<string>>(() => new Set())

  const toggleGroup = useCallback((groupId: string) => {
    setActiveGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

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
              accessibilityHint={_(
                msg`Shows collections in an interactive tree format`,
              )}
              accessibilityState={{selected: viewMode === 'graph'}}
              onPress={() => setViewMode('graph')}
              style={[
                styles.modeBtn,
                viewMode === 'graph' && {
                  backgroundColor: t.palette.primary_500,
                },
              ]}>
              <GridIcon
                size="sm"
                style={{
                  color: viewMode === 'graph' ? '#fff' : t.palette.contrast_500,
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={_(msg`Toggle explore view`)}
              accessibilityHint={_(
                msg`Shows an interactive view for moving through your civic tree`,
              )}
              accessibilityState={{selected: viewMode === 'explore'}}
              onPress={() => setViewMode('explore')}
              style={[
                styles.modeBtn,
                viewMode === 'explore' && {
                  backgroundColor: t.palette.primary_500,
                },
              ]}>
              <EarthIcon
                size="sm"
                style={{
                  color:
                    viewMode === 'explore' ? '#fff' : t.palette.contrast_500,
                }}
              />
            </TouchableOpacity>
          </View>
          <Menu.Root>
            <Menu.Trigger label={_(msg`Civic tree options`)}>
              {({props}) => (
                <TouchableOpacity
                  {...props}
                  accessibilityRole="button"
                  accessibilityHint={_(
                    msg`Opens actions for your personal civic tree`,
                  )}
                  hitSlop={8}
                  style={styles.modeBtn}>
                  <EllipsisIcon
                    size="md"
                    style={{color: t.palette.contrast_500}}
                  />
                </TouchableOpacity>
              )}
            </Menu.Trigger>
            <Menu.Outer>
              <Menu.Group>
                <Menu.Item
                  label={_(msg`New collection`)}
                  onPress={() => newCollectionControl.open()}>
                  <Menu.ItemText>
                    <Trans>New collection</Trans>
                  </Menu.ItemText>
                  <Menu.ItemIcon icon={PlusIcon} />
                </Menu.Item>
                <Menu.Item label={_(msg`Add item`)} onPress={onPressAddItem}>
                  <Menu.ItemText>
                    <Trans>Add item</Trans>
                  </Menu.ItemText>
                  <Menu.ItemIcon icon={BookmarkIcon} />
                </Menu.Item>
              </Menu.Group>
            </Menu.Outer>
          </Menu.Root>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={styles.contentCenter}>
        {isLoading ? (
          <View style={styles.centeredState}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Loading your civic tree...</Trans>
            </Text>
          </View>
        ) : viewMode === 'explore' ? (
          graph.nodes.length === 0 ? (
            <EmptyTreeCanvas
              hasCollections={collections.length > 0}
              onAddItem={onPressAddItem}
              onNewCollection={() => newCollectionControl.open()}
            />
          ) : (
            <ExploreView
              graph={graph}
              collections={collections}
              onOpenCollection={collectionId =>
                navigation.navigate('CollectionDetail', {collectionId})
              }
              onEditItem={onEditItem}
              onRemoveItem={onRequestRemoveItem}
            />
          )
        ) : viewMode === 'graph' ? (
          <View style={styles.graphPane}>
            <View style={styles.searchBar}>
              <TextInput
                accessibilityLabel={_(msg`Search items`)}
                accessibilityHint={_(
                  msg`Filters the items in your civic tree by title`,
                )}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={_(msg`Search items...`)}
                placeholderTextColor={t.palette.contrast_400}
                style={[
                  styles.searchInput,
                  t.atoms.text,
                  {
                    borderColor: t.palette.contrast_100,
                    backgroundColor: t.palette.contrast_25,
                  },
                ]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Clear search`)}
                  accessibilityHint={_(msg`Clears the current search query`)}
                  onPress={() => setSearchQuery('')}
                  style={styles.clearSearchBtn}>
                  <Text style={{color: t.palette.contrast_500, fontSize: 16}}>
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {graph.groups.length > 0 ? (
              <CollectionShelf
                groups={graph.groups}
                activeGroups={activeGroups}
                onToggleGroup={toggleGroup}
                onOpenCollection={onPressCollectionActions}
                onNewCollection={() => newCollectionControl.open()}
              />
            ) : null}
            {graph.nodes.length > 0 ? (
              <PersonalTreeLegend graph={graph} />
            ) : null}
            {graph.nodes.length === 0 ? (
              <EmptyTreeCanvas
                hasCollections={collections.length > 0}
                onAddItem={onPressAddItem}
                onNewCollection={() => newCollectionControl.open()}
              />
            ) : (
              <>
                <PersonalTreeUnconnectedNotice
                  count={graph.unconnectedCount}
                  total={graph.totalItems}
                />
                {selectedNodeId ? (
                  <PersonalTreeNodeSheet
                    graph={graph}
                    nodeId={selectedNodeId}
                    onClose={() => setSelectedNodeId(undefined)}
                    onOpenCollection={collectionId =>
                      navigation.navigate('CollectionDetail', {collectionId})
                    }
                    onEdit={onEditItem}
                    onRemove={onRequestRemoveItem}
                  />
                ) : null}
                <GraphCanvas
                  nodes={graph.nodes}
                  edges={graph.edges}
                  activeGroups={
                    activeGroups.size > 0 ? activeGroups : undefined
                  }
                  onNodePress={nodeId => setSelectedNodeId(nodeId)}
                  selectedNodeId={selectedNodeId}
                  searchQuery={searchQuery}
                  emptyTitle={_(msg`Nothing matches that search`)}
                  emptySubtitle={_(
                    msg`Try another term, or clear the collection filters above.`,
                  )}
                  simulationConfig={{groupGravity: 220, springLength: 110}}
                />
              </>
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
                  <Trans>
                    Create collections to organize policies, topics, evidence,
                    links, and notes under your own control.
                  </Trans>
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={{paddingTop: 16}}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`New collection`)}
                  accessibilityHint={_(
                    msg`Opens the form to create a collection`,
                  )}
                  onPress={() => newCollectionControl.open()}
                  style={[
                    styles.addBtn,
                    t.atoms.bg_contrast_25,
                    {borderWidth: 1, borderColor: t.palette.contrast_100},
                  ]}>
                  <PlusIcon size="md" style={{color: t.palette.primary_500}} />
                  <Text
                    style={[styles.addBtnText, {color: t.palette.primary_500}]}>
                    <Trans>New collection</Trans>
                  </Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({item}) => (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={_(msg`Open collection ${item.name}`)}
                accessibilityHint={_(
                  msg`Opens this collection from your personal civic tree`,
                )}
                onPress={() =>
                  navigation.navigate('CollectionDetail', {
                    collectionId: item.id,
                  })
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
                  <Text
                    style={[styles.collectionCount, t.atoms.text_contrast_low]}>
                    {item.items.length}{' '}
                    {item.items.length === 1 ? 'item' : 'items'}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Delete collection ${item.name}`)}
                  accessibilityHint={_(
                    msg`Opens the confirmation to delete this collection`,
                  )}
                  onPress={() => onRequestDelete(item.id)}
                  hitSlop={12}
                  style={styles.deleteBtn}>
                  <TrashIcon
                    size="sm"
                    style={{color: t.palette.contrast_400}}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </Layout.Center>
      <AddTreeItemDialog
        control={addItemControl}
        collection={selectedCollection}
      />
      <NewCollectionDialog control={newCollectionControl} />
      <CollectionActionsDialog
        control={collectionActionsControl}
        collection={actionsCollection}
        onOpen={collectionId =>
          navigation.navigate('CollectionDetail', {collectionId})
        }
        onDelete={onRequestDelete}
      />
      <EditTreeItemDialog
        control={editItemControl}
        collection={itemActionCollection}
        item={itemActionNode?.metadata.item}
      />
      <Prompt.Basic
        control={removeItemPrompt}
        title={_(msg`Remove item?`)}
        description={_(
          msg`This removes the item from its collection, along with any connections drawn to it.`,
        )}
        onConfirm={onConfirmRemoveItem}
        confirmButtonCta={_(msg`Remove`)}
        confirmButtonColor="negative"
        isPending={removeItemMutation.isPending}
      />
    </Layout.Screen>
  )
}

function EmptyTreeCanvas({
  hasCollections,
  onAddItem,
  onNewCollection,
}: {
  hasCollections: boolean
  onAddItem: () => void
  onNewCollection: () => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  return (
    <View
      style={[styles.emptyTreeCanvas, {borderColor: t.palette.contrast_100}]}>
      <View style={styles.emptyTreeNode} />
      <View
        style={[
          styles.emptyTreeLine,
          {backgroundColor: t.palette.contrast_100},
        ]}
      />
      <View style={styles.emptyTreeNodeSmall} />
      <Text style={[styles.emptyTitle, t.atoms.text]}>
        {hasCollections ? (
          <Trans>Your collections have no items yet</Trans>
        ) : (
          <Trans>Your personal civic tree is empty</Trans>
        )}
      </Text>
      <Text style={[styles.emptySubtitle, t.atoms.text_contrast_medium]}>
        {hasCollections ? (
          <Trans>
            Items appear here as nodes. Add a topic, policy, evidence card, link
            or note to a collection to start connecting them.
          </Trans>
        ) : (
          <Trans>
            Create a collection, then add topics, policies and evidence to start
            connecting knowledge, votes, and references.
          </Trans>
        )}
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            hasCollections ? _(msg`Add item`) : _(msg`New collection`)
          }
          accessibilityHint={
            hasCollections
              ? _(msg`Starts adding an item to your personal civic tree`)
              : _(msg`Opens the form to create a collection`)
          }
          onPress={hasCollections ? onAddItem : onNewCollection}
          style={[
            styles.primaryAction,
            {backgroundColor: t.palette.primary_500},
          ]}>
          <Text style={styles.primaryActionText}>
            {hasCollections ? (
              <Trans>Add item</Trans>
            ) : (
              <Trans>New collection</Trans>
            )}
          </Text>
        </TouchableOpacity>
        {hasCollections ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={_(msg`New collection`)}
            accessibilityHint={_(msg`Opens the form to create a collection`)}
            onPress={onNewCollection}
            style={[
              styles.secondaryAction,
              {borderColor: t.palette.contrast_100},
            ]}>
            <Text style={[styles.secondaryActionText, t.atoms.text]}>
              <Trans>New collection</Trans>
            </Text>
          </TouchableOpacity>
        ) : null}
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
