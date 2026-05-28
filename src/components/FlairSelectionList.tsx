import {useMemo, useRef, useState} from 'react'
import {ScrollView, TextInput, TouchableOpacity, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type ComposerFlair,
  type CustomPostFlair,
  isPolicyFlair,
} from '#/lib/post-flairs'
import {FLAIR_GROUPS, type POST_FLAIRS} from '#/lib/tags'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {
  ChevronBottom_Stroke2_Corner0_Rounded as ChevronDown,
  ChevronRight_Stroke2_Corner0_Rounded as ChevronRight,
} from '#/components/icons/Chevron'
import {PlusLarge_Stroke2_Corner0_Rounded as PlusIcon} from '#/components/icons/Plus'
import {Text} from '#/components/Typography'

type PostFlair = (typeof POST_FLAIRS)[keyof typeof POST_FLAIRS]

const POLICY_COLOR = '#474652'
const MATTER_COLOR = '#6B7280'

function normalizeNewFlairName(value: string, mode: 'matter' | 'policy') {
  return mode === 'policy' ? value.replace(/\./g, '') : value
}

interface FlairSelectionListProps {
  selectedFlairs: ComposerFlair[]
  setSelectedFlairs: (flairs: ComposerFlair[]) => void
  mode: 'matter' | 'policy'
  allowCreation?: boolean
  onClose?: () => void
}

export function FlairSelectionList({
  selectedFlairs,
  setSelectedFlairs,
  mode,
  allowCreation = false,
  onClose,
}: FlairSelectionListProps) {
  const {_} = useLingui()
  const t = useTheme()

  const [searchQuery, setSearchQuery] = useState('')
  const [sectionsExpanded, setSectionsExpanded] = useState({
    official: true,
    unofficial: true,
  })
  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({})
  const [expandedUnofficialCategories, setExpandedUnofficialCategories] =
    useState<Record<string, boolean>>({})

  // Creation State
  const [isCreating, setIsCreating] = useState(false)
  const [newFlairText, setNewFlairText] = useState('')
  const [newFlairCategory, setNewFlairCategory] = useState<string>('')
  const [isEnteringCustomCategory, setIsEnteringCustomCategory] =
    useState(false)
  const [customCategoryText, setCustomCategoryText] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const customFlairCounter = useRef(0)

  // Determine groups based on mode
  const groups = useMemo(() => {
    return mode === 'matter' ? FLAIR_GROUPS.MATTER : FLAIR_GROUPS.POLICY
  }, [mode])

  const groupKeys = Object.keys(groups)

  // Flatten available official flairs for search
  const availableFlairs = useMemo(() => {
    return Object.values(groups).flat()
  }, [groups])

  // Identify unofficial (user-created) flairs currently selected
  const userCreatedFlairs = useMemo(() => {
    return selectedFlairs.filter(f => {
      // Check if it's already in the predefined list
      const isPredefined = availableFlairs.some(k => k.id === f.id)
      const isModeMatch =
        mode === 'policy' ? isPolicyFlair(f) : !isPolicyFlair(f)
      return !isPredefined && isModeMatch
    })
  }, [selectedFlairs, availableFlairs, mode])

  // Group Unofficial Flairs by Category
  const unofficialGroups = useMemo(() => {
    const grouped: Record<string, CustomPostFlair[]> = {}
    userCreatedFlairs.forEach((f: CustomPostFlair) => {
      const cat = f.category || 'Uncategorized'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(f)
    })
    return grouped
  }, [userCreatedFlairs])

  const unofficialGroupKeys = Object.keys(unofficialGroups).sort(
    (groupA, groupB) => {
      if (groupA === 'Uncategorized') return 1
      if (groupB === 'Uncategorized') return -1
      return groupA.localeCompare(groupB)
    },
  )

  const filteredOfficialFlairs = useMemo(() => {
    if (!searchQuery) return availableFlairs
    return availableFlairs.filter(f =>
      f.label.toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [availableFlairs, searchQuery])

  const toggleFlair = (f: ComposerFlair) => {
    const isSelected = selectedFlairs.some(item => item.id === f.id)
    const isPolicy = isPolicyFlair(f)

    if (isSelected) {
      // Deselect
      const next = selectedFlairs.filter(item => item.id !== f.id)
      setSelectedFlairs(next)
    } else {
      // Single-select: Replace existing flairs of this mode
      // NOTE: Original FlairBtn logic seemed to handle multi-select mixture but single-select per mode?
      // "Replace existing flairs of this mode" implies single select per mode.
      const next = selectedFlairs.filter(item => {
        const itemIsPolicy = isPolicyFlair(item)
        return isPolicy ? !itemIsPolicy : itemIsPolicy
      })
      next.push(f)
      setSelectedFlairs(next)
    }
  }

  // --- Creation Logic (Only if allowCreation is true) ---
  const handleCreateConfirm = () => {
    const safeLabel = normalizeNewFlairName(newFlairText, mode).trim()
    if (!safeLabel) return

    if (!showCategoryPicker) {
      setNewFlairText(safeLabel)
      setShowCategoryPicker(true)
      return
    }

    let finalCategory = newFlairCategory
    if (newFlairCategory === 'CUSTOM_NEW') {
      if (!customCategoryText.trim()) return
      finalCategory = customCategoryText.trim()
    } else if (newFlairCategory === '') {
      finalCategory = 'Uncategorized'
    }

    const idPrefix = mode === 'policy' ? 'policy_custom_' : 'matter_custom_'
    const tagPrefix = mode === 'policy' ? '||#' : '|#'
    const snakeLabel = safeLabel.toLowerCase().replace(/\s+/g, '_')
    const pascalLabel = safeLabel
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, _index) => word.toUpperCase())
      .replace(/\s+/g, '')
    customFlairCounter.current += 1

    const newFlair: CustomPostFlair = {
      id: `${idPrefix}${snakeLabel}_${customFlairCounter.current}`,
      label: safeLabel,
      tag: `${tagPrefix}${pascalLabel}`,
      color: mode === 'policy' ? POLICY_COLOR : MATTER_COLOR,
      category: finalCategory,
    }

    toggleFlair(newFlair)
    resetCreation()
  }

  const resetCreation = () => {
    setIsCreating(false)
    setNewFlairText('')
    setNewFlairCategory('')
    setIsEnteringCustomCategory(false)
    setCustomCategoryText('')
    setShowCategoryPicker(false)
  }

  // Styling Helpers
  const HEADER_COLOR = mode === 'policy' ? POLICY_COLOR : MATTER_COLOR

  const toggleCategory = (key: string, isUnofficial = false) => {
    if (isUnofficial) {
      setExpandedUnofficialCategories(prev => ({
        ...prev,
        [key]: !prev[key],
      }))
    } else {
      setExpandedCategories(prev => ({
        ...prev,
        [key]: !prev[key],
      }))
    }
  }

  // Formatting Helper: "1. SERVICIOS PÚBLICOS" -> "1. Servicios Públicos"
  const formatCategoryTitle = (title: string) => {
    // Check if it starts with number dot space
    const match = title.match(/^(\d+\.)\s+(.+)$/)
    if (match) {
      const numberPart = match[1] // "1."
      const textPart = match[2] // "SERVICIOS PÚBLICOS"

      // Convert textPart from UPPERCASE to Title Case
      const titleCaseText = textPart
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

      return (
        <Text style={[a.text_md]}>
          <Text style={[a.font_normal]}>{numberPart} </Text>
          <Text style={[a.font_bold]}>{titleCaseText}</Text>
        </Text>
      )
    }
    return <Text style={[a.font_bold, a.text_md]}>{title}</Text>
  }

  return (
    <View style={[a.w_full]}>
      <View style={[a.gap_md, a.pb_xl]}>
        <View style={[a.gap_sm]}>
          <Text style={[a.text_2xl, a.font_bold]}>
            {mode === 'matter' ? (
              <Trans>Select Matter</Trans>
            ) : (
              <Trans>Select Policy</Trans>
            )}
          </Text>
          <SearchInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClearText={() => setSearchQuery('')}
          />
        </View>

        {/* Create New Option */}
        {allowCreation && (
          <View>
            {!isCreating ? (
              <Button
                label={
                  mode === 'policy' ? 'Create new Policy' : 'Create new Matter'
                }
                onPress={() => setIsCreating(true)}
                size="small"
                variant="outline"
                color="primary"
                style={[a.justify_start, a.px_md]}>
                <PlusIcon size="sm" />
                <ButtonText>
                  {mode === 'policy' ? (
                    <Trans>Create new Policy</Trans>
                  ) : (
                    <Trans>Create new Matter</Trans>
                  )}
                </ButtonText>
              </Button>
            ) : (
              <View
                style={[
                  a.gap_sm,
                  a.border,
                  t.atoms.border_contrast_medium,
                  a.rounded_sm,
                  a.p_md,
                ]}>
                <Text style={[a.font_bold, a.text_sm]}>
                  {showCategoryPicker ? (
                    isEnteringCustomCategory ? (
                      <Trans>Enter Category Name</Trans>
                    ) : (
                      <Trans>Select Category</Trans>
                    )
                  ) : (
                    <Trans>Enter Name</Trans>
                  )}
                </Text>

                {!showCategoryPicker ? (
                  // Name input
                  <View style={[a.flex_row, a.align_center]}>
                    <TextInput
                      accessibilityLabel={
                        mode === 'policy'
                          ? _(msg`Policy Name`)
                          : _(msg`Matter Name`)
                      }
                      style={[a.flex_1, a.py_sm, t.atoms.text]}
                      placeholder={
                        mode === 'policy'
                          ? 'New Policy Name'
                          : 'New Matter Name'
                      }
                      accessibilityHint={
                        mode === 'policy'
                          ? _(msg`Enter the name for your new policy`)
                          : _(msg`Enter the name for your new matter`)
                      }
                      placeholderTextColor={t.atoms.text_contrast_medium.color}
                      value={newFlairText}
                      onChangeText={value =>
                        setNewFlairText(normalizeNewFlairName(value, mode))
                      }
                      autoFocus
                      onSubmitEditing={handleCreateConfirm}
                    />
                  </View>
                ) : isEnteringCustomCategory ? (
                  // Custom category input
                  <View style={[a.flex_row, a.align_center]}>
                    <TextInput
                      accessibilityLabel={_(msg`Category Name`)}
                      style={[a.flex_1, a.py_sm, t.atoms.text]}
                      placeholder="Category Name"
                      accessibilityHint={_(
                        msg`Enter the name for the new category`,
                      )}
                      placeholderTextColor={t.atoms.text_contrast_medium.color}
                      value={customCategoryText}
                      onChangeText={setCustomCategoryText}
                      autoFocus
                      onSubmitEditing={handleCreateConfirm}
                    />
                  </View>
                ) : (
                  // Category selection
                  <View style={[a.gap_xs]}>
                    <ScrollView style={{maxHeight: 150}} nestedScrollEnabled>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => {
                          setNewFlairCategory('CUSTOM_NEW')
                          setIsEnteringCustomCategory(true)
                        }}
                        style={[
                          a.p_sm,
                          a.rounded_xs,
                          a.flex_row,
                          a.align_center,
                          a.gap_xs,
                        ]}>
                        <PlusIcon size="xs" fill={t.palette.primary_500} />
                        <Text
                          style={[
                            t.atoms.text,
                            a.font_bold,
                            t.atoms.text_contrast_high,
                          ]}>
                          Create New Category
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => setNewFlairCategory('')}
                        style={[
                          a.p_sm,
                          a.rounded_xs,
                          newFlairCategory === ''
                            ? t.atoms.bg_contrast_25
                            : null,
                        ]}>
                        <Text style={[t.atoms.text]}>None</Text>
                      </TouchableOpacity>
                      {groupKeys.map(key => (
                        <TouchableOpacity
                          accessibilityRole="button"
                          key={key}
                          onPress={() => setNewFlairCategory(key)}
                          style={[
                            a.p_sm,
                            a.rounded_xs,
                            newFlairCategory === key
                              ? t.atoms.bg_contrast_25
                              : null,
                          ]}>
                          <Text style={[t.atoms.text]}>{key}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={[a.flex_row, a.justify_end, a.gap_sm, a.mt_sm]}>
                  <Button
                    label="Cancel"
                    variant="ghost"
                    size="small"
                    onPress={resetCreation}>
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                  <Button
                    label={showCategoryPicker ? 'Create' : 'Next'}
                    variant="solid"
                    size="small"
                    color="primary"
                    onPress={handleCreateConfirm}
                    style={{backgroundColor: HEADER_COLOR}}>
                    <ButtonText style={{color: 'white'}}>
                      {showCategoryPicker ? 'Create' : 'Next'}
                    </ButtonText>
                  </Button>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Official Section */}
        <View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              setSectionsExpanded(prev => ({
                ...prev,
                official: !prev.official,
              }))
            }
            style={[
              a.flex_row,
              a.align_center,
              a.justify_between,
              a.py_sm,
              a.px_xs,
              a.border_b,
              t.atoms.border_contrast_low,
              a.mb_sm,
            ]}>
            <Text style={[a.font_bold, a.text_lg, {color: HEADER_COLOR}]}>
              <Trans>Official</Trans>
            </Text>
            {sectionsExpanded.official ? <ChevronDown /> : <ChevronRight />}
          </TouchableOpacity>

          {sectionsExpanded.official && (
            <View style={[a.pl_sm]}>
              {searchQuery ? (
                // If searching, show flat list
                <View style={[a.gap_xs]}>
                  {filteredOfficialFlairs.length > 0 ? (
                    filteredOfficialFlairs.map((flair: PostFlair) => (
                      <FlairItem
                        key={flair.id}
                        flair={flair}
                        isSelected={selectedFlairs.some(f => f.id === flair.id)}
                        onPress={() => toggleFlair(flair)}
                        activeColor={
                          mode === 'policy' ? POLICY_COLOR : MATTER_COLOR
                        }
                      />
                    ))
                  ) : (
                    <Text
                      style={[
                        a.text_sm,
                        t.atoms.text_contrast_medium,
                        a.py_sm,
                      ]}>
                      <Trans>No official items found</Trans>
                    </Text>
                  )}
                </View>
              ) : (
                // Else show categories
                <View style={[a.gap_sm]}>
                  {groupKeys.map(key => (
                    <View key={key}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => toggleCategory(key)}
                        style={[
                          a.flex_row,
                          a.align_center,
                          a.justify_between,
                          a.py_sm,
                          a.px_xs,
                          a.rounded_sm,
                          t.atoms.bg_contrast_25,
                        ]}>
                        {formatCategoryTitle(key)}
                        {expandedCategories[key] ? (
                          <ChevronDown size="xs" />
                        ) : (
                          <ChevronRight size="xs" />
                        )}
                      </TouchableOpacity>

                      {expandedCategories[key] && (
                        <View style={[a.gap_2xs, a.mt_xs, a.pl_sm]}>
                          {(groups as Record<string, PostFlair[]>)[key]?.map(
                            (flair: PostFlair) => (
                              <FlairItem
                                key={flair.id}
                                flair={flair}
                                isSelected={selectedFlairs.some(
                                  f => f.id === flair.id,
                                )}
                                onPress={() => toggleFlair(flair)}
                                activeColor={
                                  mode === 'policy' ? POLICY_COLOR : MATTER_COLOR
                                }
                              />
                            ),
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Unofficial Section */}
        <View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              setSectionsExpanded(prev => ({
                ...prev,
                unofficial: !prev.unofficial,
              }))
            }
            style={[
              a.flex_row,
              a.align_center,
              a.justify_between,
              a.py_sm,
              a.px_xs,
              a.border_b,
              t.atoms.border_contrast_low,
              a.mb_sm,
            ]}>
            <Text
              style={[a.font_bold, a.text_lg, {color: t.palette.contrast_500}]}>
              <Trans>Unofficial</Trans>
            </Text>
            {sectionsExpanded.unofficial ? <ChevronDown /> : <ChevronRight />}
          </TouchableOpacity>

          {sectionsExpanded.unofficial && (
            <View style={[a.pl_sm]}>
              <View style={[a.gap_sm]}>
                {unofficialGroupKeys.length > 0 ? (
                  unofficialGroupKeys.map(key => (
                    <View key={key}>
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => toggleCategory(key, true)}
                        style={[
                          a.flex_row,
                          a.align_center,
                          a.justify_between,
                          a.py_sm,
                          a.px_xs,
                          a.rounded_sm,
                          t.atoms.bg_contrast_25,
                        ]}>
                        <Text style={[a.font_bold, a.text_md]}>{key}</Text>
                        {expandedUnofficialCategories[key] ? (
                          <ChevronDown size="xs" />
                        ) : (
                          <ChevronRight size="xs" />
                        )}
                      </TouchableOpacity>

                      {expandedUnofficialCategories[key] && (
                        <View style={[a.gap_xs, a.mt_xs, a.pl_sm]}>
                          {unofficialGroups[key]?.map(
                            (flair: PostFlair | CustomPostFlair) => (
                              <FlairItem
                                key={flair.id}
                                flair={flair}
                                isSelected={selectedFlairs.some(
                                  f => f.id === flair.id,
                                )}
                                onPress={() => toggleFlair(flair)}
                                activeColor={
                                  mode === 'policy' ? POLICY_COLOR : MATTER_COLOR
                                }
                              />
                            ),
                          )}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text
                    style={[a.text_sm, t.atoms.text_contrast_medium, a.py_sm]}>
                    <Trans>No unofficial items selected</Trans>
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {onClose && (
          <View style={[a.mt_lg, a.flex_row, a.justify_end]}>
            <Button
              label={_(msg`Done`)}
              onPress={onClose}
              style={{backgroundColor: '#374151'}}
              size={'large'}
              variant="solid">
              <ButtonText style={{color: 'white'}}>
                <Trans>Done</Trans>
              </ButtonText>
            </Button>
          </View>
        )}
      </View>
    </View>
  )
}

function FlairItem({
  flair,
  isSelected,
  onPress,
  activeColor,
}: {
  flair: {label: string; id: string}
  isSelected: boolean
  onPress: () => void
  activeColor: string
}) {
  const t = useTheme()

  return (
    <TouchableOpacity
      accessibilityRole="radio"
      accessibilityState={{checked: isSelected}}
      onPress={onPress}
      style={[
        a.p_sm,
        a.rounded_sm,
        a.flex_row,
        a.align_center,
        a.justify_between,
        isSelected ? t.atoms.bg_contrast_50 : t.atoms.bg_contrast_25,
      ]}>
      <View style={[a.flex_row, a.align_center, a.gap_sm, a.flex_1, a.pr_sm]}>
        {/* Radio Circle */}
        <View
          style={[
            {
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2,
              borderColor: activeColor,
              justifyContent: 'center',
              alignItems: 'center',
              flexShrink: 0,
            },
          ]}>
          {isSelected && (
            <View
              style={[
                {
                  width: 9,
                  height: 9,
                  borderRadius: 4.5,
                  backgroundColor: activeColor,
                },
              ]}
            />
          )}
        </View>
        <Text
          style={[a.text_sm, a.font_semi_bold, a.flex_1]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {flair.label}
        </Text>
      </View>
      {isSelected && (
        <CheckIcon size="sm" fill={activeColor} style={{flexShrink: 0}} />
      )}
    </TouchableOpacity>
  )
}
