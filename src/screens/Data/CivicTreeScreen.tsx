import {useCallback, useEffect, useMemo, useState} from 'react'
import {
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {
  getCivicTreeItemKey,
  isOptimisticCollectionId,
  useCollectionsQuery,
  useDeleteCollectionMutation,
  useRemoveFromCollectionMutation,
} from '#/state/queries/collections'
import {useSession} from '#/state/session'
import {useExpandCivicTreeWorkspace} from '#/state/shell/civic-tree-workspace'
import {Text} from '#/view/com/util/text/Text'
import {atoms as a, useBreakpoints, useLayoutBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Bookmark as BookmarkIcon} from '#/components/icons/Bookmark'
import {BulletList_Stroke2_Corner0_Rounded as ListIcon} from '#/components/icons/BulletList'
import {DotGrid3x1_Stroke2_Corner0_Rounded as EllipsisIcon} from '#/components/icons/DotGrid'
import {Earth_Stroke2_Corner0_Rounded as EarthIcon} from '#/components/icons/Globe'
import {Leaf_Stroke2_Corner0_Rounded as LeafIcon} from '#/components/icons/Leaf'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import * as Layout from '#/components/Layout'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {IS_WEB} from '#/env'
import {CIVIC_TREE_LABELS} from '#/features/civicTree/labels'
import {AddTreeItemDialog} from '#/features/personalCivicTree/components/AddTreeItemDialog'
import {CivicTreeMap} from '#/features/personalCivicTree/components/CivicTreeMap'
import {CollectionActionsDialog} from '#/features/personalCivicTree/components/CollectionActionsDialog'
import {CollectionShelf} from '#/features/personalCivicTree/components/CollectionShelf'
import {EditTreeItemDialog} from '#/features/personalCivicTree/components/EditTreeItemDialog'
import {NewCollectionDialog} from '#/features/personalCivicTree/components/NewCollectionDialog'
import {PersonalCivicTreeCards} from '#/features/personalCivicTree/components/PersonalCivicTreeCards'
import {PersonalTreeUnconnectedNotice} from '#/features/personalCivicTree/components/PersonalTreeLegend'
import {PersonalTreeNodeSheet} from '#/features/personalCivicTree/components/PersonalTreeNodeSheet'
import {buildPersonalTreeGraph} from '#/features/personalCivicTree/graph'
import {matchesCivicTreeSearch} from '#/features/personalCivicTree/map'

// ─── Types ─────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'graph' | 'map'

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

  const {
    data: collections = [],
    isLoading,
    isError,
    refetch,
  } = useCollectionsQuery()
  const addItemControl = Dialog.useDialogControl()
  const newCollectionControl = Dialog.useDialogControl()
  const collectionActionsControl = Dialog.useDialogControl()
  const editItemControl = Dialog.useDialogControl()
  const cardDetailsControl = Dialog.useDialogControl()
  const removeItemPrompt = Prompt.usePromptControl()
  const removeItemMutation = useRemoveFromCollectionMutation()

  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const {width: windowWidth, height: windowHeight} = useWindowDimensions()
  const {gtMobile} = useBreakpoints()
  const {centerColumnOffset} = useLayoutBreakpoints()
  const expanded =
    IS_WEB &&
    gtMobile &&
    (viewMode === 'map' || viewMode === 'graph') &&
    !!myDid
  useExpandCivicTreeWorkspace(expanded)
  const workspaceLeft =
    windowWidth / 2 -
    300 +
    (centerColumnOffset ? Layout.CENTER_COLUMN_OFFSET : 0)
  const [addCollectionId, setAddCollectionId] = useState<string>()
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
  const filteredGraph = useMemo(() => {
    const nodes = graph.nodes.filter(node =>
      matchesCivicTreeSearch(node, searchQuery),
    )
    const ids = new Set(nodes.map(node => node.id))
    return {
      nodes,
      edges: graph.edges.filter(
        edge => ids.has(edge.source) && ids.has(edge.target),
      ),
    }
  }, [graph, searchQuery])

  /*
   * selectedNodeId identifies an item node, not a collection, so the add-item
   * dialog resolves its target through the selected node's collection and
   * falls back to the first collection when nothing is selected.
   */
  const selectedCollection = useMemo(() => {
    const explicit = collections.find(c => c.id === addCollectionId)
    if (explicit) return explicit
    const node = graph.nodes.find(n => n.id === selectedNodeId)
    if (node) {
      const owner = collections.find(c => c.id === node.metadata.collectionId)
      if (owner) return owner
    }
    /*
     * A collection whose create is still in flight has no server id yet, so it
     * cannot take an item; default to the first one that does.
     */
    return collections.find(c => !isOptimisticCollectionId(c.id))
  }, [collections, graph.nodes, selectedNodeId, addCollectionId])

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

  /*
   * Drop a selection or filter whose target no longer exists. A deleted
   * collection (or an optimistic id replaced by the real one) would otherwise
   * leave a filter the shelf has no chip to clear, dimming every node.
   */
  useEffect(() => {
    if (selectedNodeId && !graph.nodes.some(n => n.id === selectedNodeId)) {
      setSelectedNodeId(undefined)
    }
  }, [graph.nodes, selectedNodeId])

  useEffect(() => {
    setActiveGroups(prev => {
      if (prev.size === 0) return prev
      const live = new Set(collections.map(c => c.id))
      const next = new Set([...prev].filter(id => live.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [collections])

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
    <Layout.Screen
      hideBorders={expanded}
      style={
        IS_WEB && viewMode === 'graph'
          ? {
              height: windowHeight,
              minHeight: 0,
              paddingBottom: gtMobile ? 0 : 60,
            }
          : undefined
      }>
      <Layout.Center
        style={[
          styles.contentCenter,
          expanded && {
            maxWidth: windowWidth - workspaceLeft - 24,
            width: windowWidth - workspaceLeft - 24,
            marginLeft: workspaceLeft,
            marginRight: 24,
            transform: [],
          },
        ]}>
        <View
          style={[
            a.flex_row,
            a.align_center,
            a.gap_sm,
            a.p_md,
            a.border_b,
            t.atoms.border_contrast_low,
          ]}>
          <Layout.Header.BackButton />
          <View style={[a.flex_1, a.gap_xs]}>
            <Text style={[a.text_lg, a.font_bold, t.atoms.text]}>
              {CIVIC_TREE_LABELS.personal}
            </Text>
            <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
              <Trans>
                {collections.length} collections · {graph.totalItems} items ·{' '}
                {graph.totalRelations} connections
              </Trans>
            </Text>
          </View>
          <Button
            label={_(msg`New collection`)}
            variant="solid"
            color="primary"
            size="small"
            onPress={() => newCollectionControl.open()}>
            <ButtonIcon icon={PlusIcon} />
            <ButtonText>
              <Trans>New collection</Trans>
            </ButtonText>
          </Button>
        </View>
        <View
          style={[a.p_md, a.gap_sm, a.border_b, t.atoms.border_contrast_low]}>
          <View
            style={[
              a.flex_row,
              a.flex_wrap,
              a.align_center,
              a.justify_between,
              a.gap_sm,
            ]}>
            <View
              style={[
                a.flex_row,
                a.gap_xs,
                a.p_xs,
                a.rounded_md,
                t.atoms.bg_contrast_25,
              ]}>
              {(
                [
                  {id: 'list', label: _(msg`Collections`), icon: ListIcon},
                  {id: 'graph', label: _(msg`Tree`), icon: LeafIcon},
                  {id: 'map', label: _(msg`Interactive Map`), icon: EarthIcon},
                ] as const
              ).map(mode => (
                <Button
                  key={mode.id}
                  label={mode.label}
                  variant={viewMode === mode.id ? 'solid' : 'ghost'}
                  color={viewMode === mode.id ? 'primary' : 'secondary'}
                  size="small"
                  accessibilityState={{selected: viewMode === mode.id}}
                  onPress={() => setViewMode(mode.id)}>
                  <ButtonIcon icon={mode.icon} />
                  <ButtonText style={!gtMobile && a.text_xs}>
                    {mode.label}
                  </ButtonText>
                </Button>
              ))}
            </View>
            {collections.length > 0 ? (
              <Button
                label={_(msg`Add item`)}
                variant="outline"
                color="secondary"
                size="small"
                onPress={onPressAddItem}>
                <ButtonIcon icon={PlusIcon} />
                <ButtonText>
                  <Trans>Add item</Trans>
                </ButtonText>
              </Button>
            ) : null}
          </View>
          <View style={[a.relative]}>
            <TextInput
              accessibilityLabel={_(msg`Search civic tree`)}
              accessibilityHint={_(msg`Filters collections and saved items`)}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={_(msg`Find a collection or saved item…`)}
              placeholderTextColor={t.palette.contrast_400}
              style={[
                a.border,
                a.rounded_md,
                a.px_md,
                a.text_sm,
                t.atoms.text,
                t.atoms.border_contrast_low,
                {height: 40, paddingRight: 40},
              ]}
            />
            {searchQuery ? (
              <View style={[a.absolute, {right: 4, top: 4}]}>
                <Button
                  label={_(msg`Clear search`)}
                  variant="ghost"
                  color="secondary"
                  size="small"
                  onPress={() => setSearchQuery('')}>
                  <ButtonText>×</ButtonText>
                </Button>
              </View>
            ) : null}
          </View>
        </View>
        {isLoading ? (
          <View style={styles.centeredState}>
            <Text style={t.atoms.text_contrast_medium}>
              <Trans>Loading your civic tree...</Trans>
            </Text>
          </View>
        ) : isError && collections.length === 0 ? (
          <View style={[a.p_xl, a.align_center, a.gap_md]}>
            <Text style={t.atoms.text}>
              <Trans>Your civic tree could not be loaded.</Trans>
            </Text>
            <Button
              label={_(msg`Try again`)}
              variant="solid"
              color="primary"
              onPress={() => refetch()}>
              <ButtonText>
                <Trans>Try again</Trans>
              </ButtonText>
            </Button>
          </View>
        ) : viewMode === 'map' ? (
          <CivicTreeMap
            graph={graph}
            collections={collections}
            onSelectCollection={setAddCollectionId}
            searchQuery={searchQuery}
            onOpenCollection={collectionId =>
              navigation.navigate('CollectionDetail', {collectionId})
            }
            onEditItem={onEditItem}
            onRemoveItem={onRequestRemoveItem}
            onAddToCollection={collectionId => {
              setAddCollectionId(collectionId)
              addItemControl.open()
            }}
          />
        ) : viewMode === 'graph' ? (
          <View style={styles.graphPane}>
            {graph.groups.length > 0 ? (
              <CollectionShelf
                compact
                groups={graph.groups}
                activeGroups={activeGroups}
                onToggleGroup={toggleGroup}
                onOpenCollection={onPressCollectionActions}
              />
            ) : null}
            {graph.nodes.length === 0 ? (
              <EmptyTreeCanvas hasCollections={collections.length > 0} />
            ) : (
              <>
                <PersonalTreeUnconnectedNotice
                  count={graph.unconnectedCount}
                  total={graph.totalItems}
                />
                <PersonalCivicTreeCards
                  graph={{...graph, ...filteredGraph}}
                  activeGroups={activeGroups}
                  onOpenDetails={nodeId => {
                    setAddCollectionId(undefined)
                    setSelectedNodeId(nodeId)
                    cardDetailsControl.open()
                  }}
                />
              </>
            )}
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={collections.filter(
              c =>
                !searchQuery.trim() ||
                [
                  c.name,
                  c.description,
                  ...c.items.map(i =>
                    [i.title, i.policyTitle, i.note].join(' '),
                  ),
                ]
                  .join(' ')
                  .toLowerCase()
                  .includes(searchQuery.trim().toLowerCase()),
            )}
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
                  accessibilityLabel={_(
                    msg`Collection options for ${item.name}`,
                  )}
                  accessibilityHint={_(msg`Opens actions for this collection`)}
                  onPress={() => onPressCollectionActions(item.id)}
                  hitSlop={12}
                  style={styles.deleteBtn}>
                  <EllipsisIcon
                    size="sm"
                    style={{color: t.palette.contrast_400}}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        )}
      </Layout.Center>
      <Dialog.Outer
        control={cardDetailsControl}
        onClose={() => setSelectedNodeId(undefined)}>
        <Dialog.Handle />
        <Dialog.Inner label={_(msg`Card details`)}>
          {selectedNodeId ? (
            <PersonalTreeNodeSheet
              graph={graph}
              nodeId={selectedNodeId}
              onClose={() => cardDetailsControl.close()}
              onOpenCollection={collectionId =>
                cardDetailsControl.close(() =>
                  navigation.navigate('CollectionDetail', {collectionId}),
                )
              }
              onEdit={nodeId =>
                cardDetailsControl.close(() => onEditItem(nodeId))
              }
              onRemove={nodeId =>
                cardDetailsControl.close(() => onRequestRemoveItem(nodeId))
              }
            />
          ) : null}
        </Dialog.Inner>
      </Dialog.Outer>
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

function EmptyTreeCanvas({hasCollections}: {hasCollections: boolean}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_1,
        a.p_xl,
        a.align_center,
        a.justify_center,
        a.gap_md,
        {minHeight: 320},
      ]}>
      <BookmarkIcon size="xl" style={{color: t.palette.primary_500}} />
      <Text style={[a.text_lg, a.font_bold, a.text_center, t.atoms.text]}>
        {hasCollections ? (
          <Trans>Your collections have no items yet</Trans>
        ) : (
          <Trans>Start your personal civic tree</Trans>
        )}
      </Text>
      <Text
        style={[
          a.text_sm,
          a.text_center,
          t.atoms.text_contrast_medium,
          {maxWidth: 360},
        ]}>
        {hasCollections ? (
          <Trans>
            Use Add item above to save a topic, policy, evidence, link or note.
            Connect items to give your tree its shape.
          </Trans>
        ) : (
          <Trans>
            Create your first collection above to give your topics, evidence and
            ideas a home.
          </Trans>
        )}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
})
