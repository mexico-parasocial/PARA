/* eslint-disable import-x/namespace */
import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {
  useFollowedElementsQuery,
  useRemoveFollowedElementMutation,
  useUpdateFollowedElementMutation,
} from '#/state/queries/followed-elements'
import {
  FOLLOWED_ITEM_CATEGORIES,
  type FollowedItem,
  type FollowedItemType,
} from '#/state/topics/topicTypes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Toggle from '#/components/forms/Toggle'
import {Bell_Stroke2_Corner0_Rounded as BellIcon} from '#/components/icons/Bell'
import {ChainLink_Stroke2_Corner0_Rounded as ChainLinkIcon} from '#/components/icons/ChainLink'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Prompt from '#/components/Prompt'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'FollowedElementsSettings'
>

const TYPE_ORDER: FollowedItemType[] = [
  'hashtag',
  'policy',
  'matter',
  'post',
  'thread',
]

const TYPE_ICONS = {
  hashtag: HashtagIcon,
  policy: TreeIcon,
  matter: TreeIcon,
  post: ChainLinkIcon,
  thread: ChainLinkIcon,
}

export function FollowedElementsSettingsScreen({route}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const selectedId = route.params?.selectedId
  const [query, setQuery] = useState('')
  const [pendingRemove, setPendingRemove] = useState<FollowedItem | null>(null)
  const removePromptControl = Prompt.usePromptControl()
  const {data: items = [], isLoading, isError} = useFollowedElementsQuery()
  const updateMutation = useUpdateFollowedElementMutation()
  const removeMutation = useRemoveFollowedElementMutation()

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items

    return items.filter(item => {
      return [
        item.displayName,
        item.identifier,
        item.community,
        FOLLOWED_ITEM_CATEGORIES[item.type].label,
      ]
        .filter(Boolean)
        .some(value => value?.toLowerCase().includes(needle))
    })
  }, [items, query])

  const grouped = useMemo(() => {
    return TYPE_ORDER.map(type => ({
      type,
      items: filteredItems.filter(item => item.type === type),
    }))
  }, [filteredItems])

  const onToggleNotifications = (item: FollowedItem, value: boolean) => {
    updateMutation.mutate(
      {item, updates: {notificationsEnabled: value}},
      {
        onError: () => {
          Toast.show(_(msg`There was an issue updating notifications`), {
            type: 'error',
          })
        },
      },
    )
  }

  const onRemove = () => {
    const item = pendingRemove
    if (!item) return

    removeMutation.mutate(item, {
      onSuccess: () => {
        Toast.show(_(msg`Removed from Followed Elements`), {type: 'success'})
        setPendingRemove(null)
        removePromptControl.close()
      },
      onError: () => {
        Toast.show(_(msg`There was an issue removing this item`), {
          type: 'error',
        })
      },
    })
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Followed Elements</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <Layout.Center>
          <View style={[a.w_full, a.p_lg, a.gap_lg]}>
            <SearchInput
              label={_(msg`Search followed elements`)}
              value={query}
              onChangeText={setQuery}
              onClearText={() => setQuery('')}
            />

            {isError && (
              <View
                style={[
                  a.p_md,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                  t.atoms.border_contrast_low,
                  {borderWidth: 1},
                ]}>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>Showing cached Followed Elements.</Trans>
                </Text>
              </View>
            )}

            {isLoading && items.length === 0 ? (
              <View
                style={[a.align_center, a.justify_center, {minHeight: 180}]}>
                <Loader size="lg" />
              </View>
            ) : items.length === 0 ? (
              <EmptyState
                title={_(msg`No followed elements yet`)}
                description={_(
                  msg`Follow hashtags, policies, matters, posts, and threads to keep them close at hand.`,
                )}
              />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                title={_(msg`No matches`)}
                description={_(msg`Try a different search term.`)}
              />
            ) : (
              grouped.map(group => (
                <FollowedElementGroup
                  key={group.type}
                  type={group.type}
                  items={group.items}
                  selectedId={selectedId}
                  onToggleNotifications={onToggleNotifications}
                  onRemove={item => {
                    setPendingRemove(item)
                    removePromptControl.open()
                  }}
                />
              ))
            )}
          </View>
        </Layout.Center>
      </Layout.Content>

      <Prompt.Basic
        control={removePromptControl}
        title={_(msg`Remove followed element?`)}
        description={
          pendingRemove
            ? _(
                msg`Remove ${pendingRemove.displayName} from Followed Elements?`,
              )
            : undefined
        }
        onConfirm={onRemove}
        confirmButtonCta={_(msg`Remove`)}
        cancelButtonCta={_(msg`Cancel`)}
        confirmButtonColor="negative"
        isPending={removeMutation.isPending}
      />
    </Layout.Screen>
  )
}

function FollowedElementGroup({
  type,
  items,
  selectedId,
  onToggleNotifications,
  onRemove,
}: {
  type: FollowedItemType
  items: FollowedItem[]
  selectedId?: string
  onToggleNotifications: (item: FollowedItem, value: boolean) => void
  onRemove: (item: FollowedItem) => void
}) {
  const t = useTheme()
  const meta = FOLLOWED_ITEM_CATEGORIES[type]

  return (
    <View style={[a.gap_sm]}>
      <View style={[a.flex_row, a.align_center, a.justify_between]}>
        <Text style={[a.text_md, a.font_semi_bold]}>{meta.label}</Text>
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
          {items.length}
        </Text>
      </View>

      {items.length === 0 ? (
        <View
          style={[
            a.p_md,
            a.rounded_sm,
            t.atoms.bg_contrast_25,
            t.atoms.border_contrast_low,
            {borderWidth: 1},
          ]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>No items in this group.</Trans>
          </Text>
        </View>
      ) : (
        <View style={[a.gap_sm]}>
          {items.map(item => (
            <FollowedElementRow
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onToggleNotifications={onToggleNotifications}
              onRemove={onRemove}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function FollowedElementRow({
  item,
  isSelected,
  onToggleNotifications,
  onRemove,
}: {
  item: FollowedItem
  isSelected: boolean
  onToggleNotifications: (item: FollowedItem, value: boolean) => void
  onRemove: (item: FollowedItem) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const meta = FOLLOWED_ITEM_CATEGORIES[item.type]
  const Icon = TYPE_ICONS[item.type]
  const color = item.color || meta.color

  return (
    <View
      style={[
        a.flex_row,
        a.align_center,
        a.gap_md,
        a.p_md,
        a.rounded_sm,
        t.atoms.bg,
        t.atoms.border_contrast_low,
        {
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected
            ? color
            : t.atoms.border_contrast_low.borderColor,
        },
      ]}>
      <View
        style={[
          a.align_center,
          a.justify_center,
          a.rounded_sm,
          {backgroundColor: color, height: 40, width: 40},
        ]}>
        <Icon size="md" fill="#fff" />
      </View>

      <View style={[a.flex_1, a.gap_2xs]}>
        <Text numberOfLines={1} style={[a.text_md, a.font_semi_bold]}>
          {item.displayName}
        </Text>
        <Text
          numberOfLines={1}
          style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {item.community || item.identifier}
        </Text>
        <View style={[a.flex_row, a.align_center, a.gap_xs]}>
          <BellIcon
            size="xs"
            fill={
              item.notificationsEnabled
                ? color
                : t.atoms.text_contrast_low.color
            }
          />
          <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
            {item.notificationsEnabled ? (
              <Trans>Notifications on</Trans>
            ) : (
              <Trans>Notifications off</Trans>
            )}
          </Text>
        </View>
      </View>

      <Toggle.Item
        name={`${item.id}-notifications`}
        label={_(msg`Toggle notifications`)}
        value={item.notificationsEnabled}
        onChange={value => onToggleNotifications(item, value)}>
        <Toggle.Switch />
      </Toggle.Item>

      <Button
        label={_(msg`Remove`)}
        size="small"
        variant="ghost"
        color="negative"
        shape="round"
        onPress={() => onRemove(item)}>
        <ButtonIcon icon={TrashIcon} size="sm" />
      </Button>
    </View>
  )
}

function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  const t = useTheme()
  return (
    <View
      style={[
        a.align_center,
        a.justify_center,
        a.gap_sm,
        a.p_xl,
        a.rounded_sm,
        t.atoms.bg_contrast_25,
        t.atoms.border_contrast_low,
        {borderWidth: 1, minHeight: 160},
      ]}>
      <Text style={[a.text_lg, a.font_semi_bold, a.text_center]}>{title}</Text>
      <Text style={[a.text_sm, a.text_center, t.atoms.text_contrast_medium]}>
        {description}
      </Text>
    </View>
  )
}
