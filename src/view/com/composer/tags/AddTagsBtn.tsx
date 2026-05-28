import {useEffect, useMemo, useState} from 'react'
import {TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type ComposerFlair, isPolicyFlair} from '#/lib/post-flairs'
import {
  FLAIR_GROUPS,
  POST_TYPES,
  type PostFlair,
  type PostType,
} from '#/lib/tags'
import {atoms as a, useTheme, web} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Toggle from '#/components/forms/Toggle'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {Hashtag_Stroke2_Corner0_Rounded as HashtagIcon} from '#/components/icons/Hashtag'
import * as Select from '#/components/Select'
import {Text} from '#/components/Typography'

export function AddTagsBtn({
  postType,
  setPostType,
  selectedFlairs,
  setSelectedFlairs,
  isOfficial,
  setIsOfficial,
  isAdultContent,
  setIsAdultContent,
}: {
  postType: PostType | null
  setPostType: (type: PostType | null) => void
  selectedFlairs: ComposerFlair[]
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  isOfficial: boolean
  setIsOfficial: (v: boolean) => void
  isAdultContent: boolean
  setIsAdultContent: (v: boolean) => void
}) {
  const control = Dialog.useDialogControl()
  const {_} = useLingui()
  const t = useTheme()

  // Summary for the button
  const hasSelection = postType?.id !== 'none' || selectedFlairs.length > 0

  return (
    <>
      <TouchableOpacity
        onPress={() => control.open()}
        style={[a.flex_row, a.align_center, a.gap_xs]}
        accessibilityRole="button"
        accessibilityLabel={_(msg`Add tags and flairs`)}
        accessibilityHint={_(
          msg`Opens a dialog to add tags and flairs to your post`,
        )}>
        <View
          style={[
            {
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: hasSelection ? t.palette.primary_500 : '#9ca3af',
              justifyContent: 'center',
              alignItems: 'center',
            },
          ]}>
          <HashtagIcon size="sm" style={{color: 'white'}} />
        </View>
        {hasSelection && (
          <View
            style={[
              a.px_sm,
              a.py_xs,
              a.rounded_full,
              {
                backgroundColor: t.palette.primary_500,
                height: 34,
                justifyContent: 'center',
              },
            ]}>
            <Text style={[a.font_bold, {color: 'white', fontSize: 13}]}>
              {postType && postType.id !== 'none'
                ? postType.label
                : selectedFlairs[0]?.label || 'Tags'}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
        <Dialog.Handle />
        <DialogInner
          postType={postType}
          setPostType={setPostType}
          selectedFlairs={selectedFlairs}
          setSelectedFlairs={setSelectedFlairs}
          isOfficial={isOfficial}
          setIsOfficial={setIsOfficial}
          isAdultContent={isAdultContent}
          setIsAdultContent={setIsAdultContent}
          control={control}
        />
      </Dialog.Outer>
    </>
  )
}

function DialogInner({
  postType,
  setPostType,
  selectedFlairs,
  setSelectedFlairs,
  isOfficial,
  setIsOfficial,
  isAdultContent,
  setIsAdultContent,
  control,
}: {
  postType: PostType | null
  setPostType: (type: PostType | null) => void
  selectedFlairs: ComposerFlair[]
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  isOfficial: boolean
  setIsOfficial: (v: boolean) => void
  isAdultContent: boolean
  setIsAdultContent: (v: boolean) => void
  control: Dialog.DialogOuterProps['control']
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  // Combine all post types and flairs for search
  const allItems = useMemo(() => {
    const postTypeItems = Object.values(POST_TYPES).map(pt => ({
      ...pt,
      itemType: 'postType' as const,
    }))
    const flairItems = [
      ...Object.values(FLAIR_GROUPS.POLICY).flat(),
      ...Object.values(FLAIR_GROUPS.MATTER).flat(),
    ].map(f => ({
      ...f,
      itemType: 'flair' as const,
    }))
    return [...postTypeItems, ...flairItems]
  }, [])

  const filteredItems = useMemo(() => {
    if (!searchQuery) return null // Show sections when not searching
    return allItems.filter(item =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [allItems, searchQuery])

  const handleSelectPostType = (pt: PostType) => {
    if (pt.id === 'none') {
      setPostType(null)
    } else {
      setPostType(pt)
    }
  }

  const toggleFlair = (flair: PostFlair) => {
    const isSelected = selectedFlairs.some(f => f.id === flair.id)
    const isPolicy = isPolicyFlair(flair)
    if (isSelected) {
      setSelectedFlairs(selectedFlairs.filter(f => f.id !== flair.id))
    } else {
      const next = selectedFlairs.filter(f => {
        const candidateIsPolicy = isPolicyFlair(f)
        return isPolicy ? !candidateIsPolicy : candidateIsPolicy
      })
      setSelectedFlairs([...next, flair])
    }
  }

  return (
    <Dialog.ScrollableInner
      label={_(msg`Add Tags & Flairs`)}
      style={[{maxWidth: 500}, a.w_full]}>
      <View style={[a.gap_md, a.pb_xl]}>
        {/* Header */}
        <Text style={[a.text_2xl, a.font_bold]}>
          <Trans>Añadir marcas y flair</Trans>
        </Text>

        {/* Search */}
        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClearText={() => setSearchQuery('')}
        />

        {/* Content */}
        {filteredItems ? (
          // Search Results
          <View style={[a.gap_sm]}>
            {filteredItems.length > 0 ? (
              filteredItems.map(item =>
                item.itemType === 'postType' ? (
                  <PostTypeItem
                    key={item.id}
                    postType={item as PostType}
                    isSelected={postType?.id === item.id}
                    onPress={() => handleSelectPostType(item as PostType)}
                  />
                ) : (
                  <FlairItem
                    key={item.id}
                    flair={item as PostFlair}
                    isSelected={selectedFlairs.some(f => f.id === item.id)}
                    onPress={() => toggleFlair(item as PostFlair)}
                  />
                ),
              )
            ) : (
              <Text style={[a.text_center, t.atoms.text_contrast_medium]}>
                <Trans>No results found</Trans>
              </Text>
            )}
          </View>
        ) : (
          // Sectioned View
          <View style={[a.gap_lg]}>
            {/* Post Types Section */}
            <View style={[a.gap_sm]}>
              <Text
                style={[a.font_bold, a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>Tipo de publicación</Trans>
              </Text>
              {Object.values(POST_TYPES).map(pt => (
                <PostTypeItem
                  key={pt.id}
                  postType={pt}
                  isSelected={
                    pt.id === 'none'
                      ? postType === null
                      : postType?.id === pt.id
                  }
                  onPress={() => handleSelectPostType(pt)}
                />
              ))}
            </View>
            {/* Flairs Section */}
            <View style={[a.gap_sm]}>
              <Text
                style={[a.font_bold, a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>Flairs</Trans>
              </Text>
              <FlairSelector
                selectedFlairs={selectedFlairs}
                toggleFlair={toggleFlair}
              />
            </View>
            {/* Universal Marks Section */}
            <View style={[a.gap_sm]}>
              <Text
                style={[a.font_bold, a.text_md, t.atoms.text_contrast_medium]}>
                <Trans>Marcas universales</Trans>
              </Text>

              {/* Official Toggle */}
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_between,
                  a.p_md,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <View style={[a.gap_2xs]}>
                  <Text style={[a.font_bold]}>
                    <Trans>Official Status</Trans>
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    {isOfficial
                      ? _(msg`This post is marked as Official`)
                      : _(msg`This post is Unofficial`)}
                  </Text>
                </View>
                <Toggle.Item
                  name="is_official"
                  label={_(msg`Mark as Official`)}
                  value={isOfficial}
                  onChange={() => setIsOfficial(!isOfficial)}>
                  <Toggle.Switch />
                </Toggle.Item>
              </View>

              {/* Adult Content Toggle */}
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.justify_between,
                  a.p_md,
                  a.rounded_sm,
                  t.atoms.bg_contrast_25,
                ]}>
                <View style={[a.gap_2xs]}>
                  <Text style={[a.font_bold]}>
                    <Trans>Contenido para adultos (18+)</Trans>
                  </Text>
                  <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                    <Trans>Marcar posts con contenido delicado</Trans>
                  </Text>
                </View>
                <Toggle.Item
                  name="is_adult_content"
                  label={_(msg`Mark as Adult Content`)}
                  value={isAdultContent}
                  onChange={() => setIsAdultContent(!isAdultContent)}>
                  <Toggle.Switch />
                </Toggle.Item>
              </View>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={[a.mt_lg, web([a.flex_row, a.ml_auto])]}>
          <Button
            label={_(msg`Aplicar`)}
            onPress={() => control.close()}
            color="primary"
            size={web('small') || 'large'}
            variant="solid">
            <ButtonText>
              <Trans>Aplicar</Trans>
            </ButtonText>
          </Button>
        </View>
      </View>
    </Dialog.ScrollableInner>
  )
}

function PostTypeItem({
  postType,
  isSelected,
  onPress,
}: {
  postType: PostType
  isSelected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{checked: isSelected}}
      onPress={onPress}
      style={[
        a.flex_row,
        a.align_center,
        a.gap_md,
        a.p_md,
        a.rounded_sm,
        isSelected ? t.atoms.bg_contrast_50 : t.atoms.bg_contrast_25,
      ]}>
      {/* Radio Circle */}
      <View
        style={[
          {
            width: 20,
            height: 20,
            borderRadius: 10,
            borderWidth: 2,
            borderColor: isSelected ? t.palette.primary_500 : '#888',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}>
        {isSelected && (
          <View
            style={[
              {
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: t.palette.primary_500,
              },
            ]}
          />
        )}
      </View>
      {/* Label Pill */}
      {postType.id !== 'none' ? (
        <View
          style={[
            a.px_sm,
            a.py_xs,
            a.rounded_full,
            {backgroundColor: postType.color},
          ]}>
          <Text style={[a.font_bold, {color: 'white'}]}>{postType.label}</Text>
        </View>
      ) : (
        <Text style={[a.font_semi_bold]}>{postType.label}</Text>
      )}
    </TouchableOpacity>
  )
}

function FlairSelector({
  selectedFlairs,
  toggleFlair,
}: {
  selectedFlairs: ComposerFlair[]
  toggleFlair: (flair: PostFlair) => void
}) {
  const {_} = useLingui()
  const t = useTheme()
  const [activeGroup, setActiveGroup] = useState<string>(
    Object.keys(FLAIR_GROUPS.MATTER)[0] || '',
  )
  const [flairType, setFlairType] = useState<'matter' | 'policy'>('matter')

  const groups =
    flairType === 'matter' ? FLAIR_GROUPS.MATTER : FLAIR_GROUPS.POLICY
  const groupKeys = Object.keys(groups)

  useEffect(() => {
    setActiveGroup(Object.keys(groups)[0] || '')
  }, [flairType, groups])

  const currentList: ComposerFlair[] =
    (groups as Record<string, ComposerFlair[]>)[activeGroup] || []

  return (
    <View style={[a.gap_sm]}>
      {/* Flair Type Tabs */}
      <View style={[a.flex_row, a.gap_sm]}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setFlairType('matter')}
          style={[
            a.px_md,
            a.py_sm,
            a.rounded_full,
            flairType === 'matter'
              ? {backgroundColor: t.palette.primary_500}
              : t.atoms.bg_contrast_25,
          ]}>
          <Text
            style={[
              a.font_bold,
              {color: flairType === 'matter' ? 'white' : undefined},
            ]}>
            |#Materia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setFlairType('policy')}
          style={[
            a.px_md,
            a.py_sm,
            a.rounded_full,
            flairType === 'policy'
              ? {backgroundColor: t.palette.primary_500}
              : t.atoms.bg_contrast_25,
          ]}>
          <Text
            style={[
              a.font_bold,
              {color: flairType === 'policy' ? 'white' : undefined},
            ]}>
            ||#Politica
          </Text>
        </TouchableOpacity>
      </View>

      {/* Group Dropdown */}
      <Select.Root
        value={activeGroup}
        onValueChange={val => setActiveGroup(val)}>
        <Select.Trigger label={_(msg`Filter by group`)}>
          {({props}) => (
            <Button
              {...props}
              label={props.accessibilityLabel}
              size="small"
              variant="ghost"
              color="secondary"
              shape="rectangular"
              style={[
                a.w_full,
                a.justify_between,
                a.px_sm,
                a.py_sm,
                t.atoms.bg_contrast_25,
                a.rounded_sm,
              ]}>
              <Select.ValueText
                style={[a.font_bold, t.atoms.text_contrast_medium]}
              />
              <Select.Icon />
            </Button>
          )}
        </Select.Trigger>
        <Select.Content
          items={groupKeys.map(key => ({label: key, value: key}))}
          renderItem={({label, value}) => (
            <Select.Item value={value} label={label}>
              <Select.ItemIndicator />
              <Select.ItemText>{label}</Select.ItemText>
            </Select.Item>
          )}
        />
      </Select.Root>

      {/* Flair List */}
      <View style={[a.gap_xs]}>
        {currentList.length > 0 ? (
          currentList.map((flair: PostFlair) => (
            <FlairItem
              key={flair.id}
              flair={flair}
              isSelected={selectedFlairs.some(f => f.id === flair.id)}
              onPress={() => toggleFlair(flair)}
            />
          ))
        ) : (
          <Text style={[a.text_sm, t.atoms.text_contrast_low, a.italic]}>
            <Trans>No options available</Trans>
          </Text>
        )}
      </View>
    </View>
  )
}

function FlairItem({
  flair,
  isSelected,
  onPress,
}: {
  flair: PostFlair
  isSelected: boolean
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <TouchableOpacity
      accessibilityRole="checkbox"
      accessibilityState={{checked: isSelected}}
      onPress={onPress}
      style={[
        a.p_md,
        a.rounded_sm,
        a.flex_row,
        a.align_center,
        a.justify_between,
        isSelected ? t.atoms.bg_contrast_50 : t.atoms.bg_contrast_25,
        {borderColor: isSelected ? flair.color : 'transparent', borderWidth: 1},
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_md]}>
        <View
          style={[
            {width: 16, height: 16, borderRadius: 8},
            {backgroundColor: flair.color},
          ]}
        />
        <Text style={[a.text_md, a.font_semi_bold]}>{flair.label}</Text>
      </View>
      {isSelected && <CheckIcon size="sm" fill={t.palette.primary_500} />}
    </TouchableOpacity>
  )
}
