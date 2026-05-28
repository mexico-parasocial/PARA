/**
 * HighlightOptionsModal - React Native Modal for highlight color/tag selection
 * Uses standard Modal (NOT Dialog.Outer/BottomSheet) to avoid Reanimated crashes
 */
import {memo, useCallback, useEffect, useState} from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native'
import {LinearGradient} from 'expo-linear-gradient'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  COMPASS_CROSS_GRADIENTS,
  type CompassPositionId,
} from '#/lib/compass/compassColors'
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type HighlightColorKey,
} from '#/state/highlights/highlightTypes'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Macintosh_Stroke2_Corner2_Rounded as MacintoshIcon} from '#/components/icons/Macintosh'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {Text} from '#/components/Typography'

// ─── constants ────────────────────────────────────────────────────────────────

const CELL_SIZE = 40 // square touch-target (px)
const CELL_GAP = 4 // gap between cells (px)
const LABEL_W = 26 // row-label width (px)

/** camelCase key → compass-position ID (for gradient lookup) */
const KEY_TO_COMPASS_ID: Record<HighlightColorKey, CompassPositionId> = {
  authLeft: 'auth-left',
  authCenter: 'auth-center',
  authRight: 'auth-right',
  centerLeft: 'center-left',
  centerCenter: 'center',
  centerRight: 'center-right',
  libLeft: 'lib-left',
  libCenter: 'lib-center',
  libRight: 'lib-right',
}

/** Human-readable label for each position */
const KEY_TO_LABEL: Record<HighlightColorKey, string> = {
  authLeft: 'Auth Left',
  authCenter: 'Auth Center',
  authRight: 'Auth Right',
  centerLeft: 'Center Left',
  centerCenter: 'Center',
  centerRight: 'Center Right',
  libLeft: 'Lib Left',
  libCenter: 'Lib Center',
  libRight: 'Lib Right',
}

const COMPASS_GRID = [
  {
    rowLabel: 'Auth',
    keys: ['authLeft', 'authCenter', 'authRight'] as HighlightColorKey[],
  },
  {
    rowLabel: 'Ctr',
    keys: ['centerLeft', 'centerCenter', 'centerRight'] as HighlightColorKey[],
  },
  {
    rowLabel: 'Lib',
    keys: ['libLeft', 'libCenter', 'libRight'] as HighlightColorKey[],
  },
]

/** Resolve an existing stored color back to its key (fallback: centerCenter) */
function colorToKey(color: HighlightColor | undefined): HighlightColorKey {
  if (!color) return 'centerCenter'
  const entry = (
    Object.entries(HIGHLIGHT_COLORS) as [HighlightColorKey, HighlightColor][]
  ).find(([, v]) => v === color)
  return entry?.[0] ?? 'centerCenter'
}

// ─── component ────────────────────────────────────────────────────────────────

interface HighlightOptionsModalProps {
  visible: boolean
  onClose: () => void
  onSave: (color: HighlightColor, isPublic: boolean, tag?: string) => void
  onSendToAgent?: (payload: HighlightActionPayload) => void
  onSaveToCivicTree?: (payload: HighlightActionPayload) => void
  onHighlightMore: () => void
  onDelete?: () => void
  actionText?: string
  existingTag?: string
  existingColor?: HighlightColor
  existingIsPublic?: boolean
}

export interface HighlightActionPayload {
  color: HighlightColor
  colorKey: HighlightColorKey
  label: string
  note?: string
  isPublic: boolean
  text?: string
}

let HighlightOptionsModal = ({
  visible,
  onClose,
  onSave,
  onSendToAgent,
  onSaveToCivicTree,
  onHighlightMore,
  onDelete,
  actionText,
  existingTag,
  existingColor,
  existingIsPublic,
}: HighlightOptionsModalProps): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()

  const [selectedKey, setSelectedKey] = useState<HighlightColorKey>(
    colorToKey(existingColor),
  )
  const [tag, setTag] = useState(existingTag ?? '')
  const [isPublic, setIsPublic] = useState(existingIsPublic ?? false)

  useEffect(() => {
    if (!visible) return
    setSelectedKey(colorToKey(existingColor))
    setTag(existingTag ?? '')
    setIsPublic(existingIsPublic ?? false)
  }, [existingColor, existingIsPublic, existingTag, visible])

  const handleSave = useCallback(() => {
    onSave(HIGHLIGHT_COLORS[selectedKey], isPublic, tag.trim() || undefined)
  }, [onSave, selectedKey, isPublic, tag])

  const selectedColor = HIGHLIGHT_COLORS[selectedKey]
  const actionPayload = useCallback(
    (): HighlightActionPayload => ({
      color: selectedColor,
      colorKey: selectedKey,
      label: KEY_TO_LABEL[selectedKey],
      note: tag.trim() || undefined,
      isPublic,
      text: actionText?.trim() || undefined,
    }),
    [actionText, isPublic, selectedColor, selectedKey, tag],
  )

  const handleSendToAgent = useCallback(() => {
    onSendToAgent?.(actionPayload())
  }, [actionPayload, onSendToAgent])

  const handleSaveToCivicTree = useCallback(() => {
    onSaveToCivicTree?.(actionPayload())
  }, [actionPayload, onSaveToCivicTree])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[a.flex_1, a.justify_center, a.align_center]}>
        {/* Backdrop */}
        <Pressable
          accessibilityRole="button"
          style={[a.absolute, a.inset_0, {backgroundColor: 'rgba(0,0,0,0.5)'}]}
          onPress={onClose}
        />

        <View
          style={[
            a.rounded_md,
            a.p_lg,
            a.mx_lg,
            {
              width: '100%',
              maxWidth: 380,
              backgroundColor: t.atoms.bg.backgroundColor,
            },
          ]}>
          {/* ── Header row: title + selected-color chip ──────── */}
          <View
            style={[a.flex_row, a.align_center, a.justify_between, a.mb_md]}>
            <Text style={[a.text_lg, a.font_bold]}>
              <Trans>Highlight</Trans>
            </Text>

            {/* Selected position indicator */}
            <View style={[a.flex_row, a.align_center, {gap: 6}]}>
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  backgroundColor: selectedColor,
                  borderWidth: 1,
                  borderColor: t.atoms.border_contrast_low.borderColor,
                }}
              />
              <Text
                style={[a.text_xs, a.font_bold, t.atoms.text_contrast_medium]}>
                {KEY_TO_LABEL[selectedKey]}
              </Text>
            </View>
          </View>

          {/* ── Compact 3 × 3 compass grid ───────────────────── */}
          <View style={[a.align_center, a.mb_md]}>
            {COMPASS_GRID.map(({rowLabel, keys}, rowIdx) => (
              <View
                key={rowLabel}
                style={[
                  a.flex_row,
                  a.align_center,
                  {gap: CELL_GAP, marginTop: rowIdx === 0 ? 0 : CELL_GAP},
                ]}>
                {/* Row label */}
                <Text
                  style={[
                    a.font_bold,
                    {
                      width: LABEL_W,
                      textAlign: 'right',
                      fontSize: 9,
                      color: t.atoms.text_contrast_low.color,
                    },
                  ]}>
                  {rowLabel}
                </Text>

                {/* 3 cells */}
                {keys.map(colorKey => {
                  const color = HIGHLIGHT_COLORS[colorKey]
                  const isSelected = selectedKey === colorKey
                  const compassId = KEY_TO_COMPASS_ID[colorKey]
                  const gradient = COMPASS_CROSS_GRADIENTS[compassId]

                  return (
                    <Pressable
                      key={colorKey}
                      onPress={() => setSelectedKey(colorKey)}
                      accessibilityLabel={_(msg`Select ${colorKey} color`)}
                      accessibilityHint={_(
                        msg`Selects the ${colorKey} highlight color`,
                      )}
                      accessibilityRole="button"
                      style={[
                        styles.cell,
                        {
                          backgroundColor: gradient ? undefined : color,
                          borderWidth: isSelected ? 2.5 : 1,
                          borderColor: isSelected
                            ? t.palette.primary_500
                            : t.atoms.border_contrast_low.borderColor,
                          transform: [{scale: isSelected ? 1.08 : 1}],
                        },
                      ]}>
                      {gradient && (
                        <LinearGradient
                          colors={gradient.colors}
                          start={gradient.start}
                          end={gradient.end}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      {isSelected && (
                        <View
                          style={[StyleSheet.absoluteFill, styles.selectedRing]}
                        />
                      )}
                    </Pressable>
                  )
                })}
              </View>
            ))}
          </View>

          {/* ── Tag input ────────────────────────────────────── */}
          <TextInput
            value={tag}
            onChangeText={setTag}
            placeholder={_(msg`Tag or note (optional)…`)}
            accessibilityLabel={_(msg`Highlight tag`)}
            accessibilityHint={_(
              msg`Enter an optional tag or note for this highlight`,
            )}
            placeholderTextColor={t.atoms.text_contrast_low.color}
            style={[
              a.rounded_sm,
              a.p_sm,
              a.mb_sm,
              a.text_sm,
              {
                backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
                color: t.atoms.text.color,
                borderWidth: 1,
                borderColor: t.atoms.border_contrast_low.borderColor,
              },
            ]}
            maxLength={50}
          />

          {/* ── Public toggle (inline compact row) ───────────── */}
          <View
            style={[a.flex_row, a.justify_between, a.align_center, a.mb_md]}>
            <Text style={[a.text_sm, a.font_semi_bold]}>
              <Trans>Make Public</Trans>
            </Text>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{
                false: t.atoms.bg_contrast_100.backgroundColor,
                true: t.palette.primary_500,
              }}
              thumbColor="#fff"
            />
          </View>

          {(onSendToAgent || onSaveToCivicTree) && (
            <View style={[styles.actionCluster, a.mb_md]}>
              {onSendToAgent && (
                <Pressable
                  accessibilityLabel={_(msg`Send highlight to agent`)}
                  accessibilityHint={_(
                    msg`Sends the highlighted text, color, and note to your civic agent`,
                  )}
                  accessibilityRole="button"
                  onPress={handleSendToAgent}
                  style={({pressed}) => [
                    styles.quickActionButton,
                    {
                      backgroundColor: t.atoms.bg_contrast_25.backgroundColor,
                      borderColor: t.atoms.border_contrast_low.borderColor,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <MacintoshIcon
                    size="md"
                    fill={t.atoms.text_contrast_medium.color}
                  />
                </Pressable>
              )}

              {onSaveToCivicTree && (
                <Pressable
                  accessibilityLabel={_(msg`Save highlight as Civic Tree note`)}
                  accessibilityHint={_(
                    msg`Saves the highlighted text, color, and note to your Civic Tree`,
                  )}
                  accessibilityRole="button"
                  onPress={handleSaveToCivicTree}
                  style={({pressed}) => [
                    styles.quickActionButton,
                    {
                      backgroundColor: selectedColor,
                      borderColor: t.atoms.border_contrast_low.borderColor,
                      opacity: pressed ? 0.72 : 1,
                    },
                  ]}>
                  <TreeIcon size="md" fill="#111111" />
                </Pressable>
              )}
            </View>
          )}

          {/* ── Buttons ──────────────────────────────────────── */}

          {/* Primary CTA */}
          <Button
            label={_(msg`Save Highlight`)}
            onPress={handleSave}
            size="large"
            color="primary"
            variant="solid"
            style={[a.mb_sm]}>
            <ButtonText>
              <Trans>Save Highlight</Trans>
            </ButtonText>
          </Button>

          {/* Secondary row: Highlight More + Cancel (+ Delete if editing) */}
          <View style={[a.flex_row, a.gap_sm]}>
            <Button
              label={_(msg`Highlight More`)}
              onPress={onHighlightMore}
              size="small"
              color="secondary"
              variant="solid"
              style={[a.flex_1]}>
              <ButtonText>
                <Trans>+ More</Trans>
              </ButtonText>
            </Button>

            {onDelete && (
              <Button
                label={_(msg`Delete`)}
                onPress={onDelete}
                size="small"
                color="negative"
                variant="ghost"
                style={[a.flex_1]}>
                <ButtonText>
                  <Trans>Delete</Trans>
                </ButtonText>
              </Button>
            )}

            <Button
              label={_(msg`Cancel`)}
              onPress={onClose}
              size="small"
              color="secondary"
              variant="ghost"
              style={[a.flex_1]}>
              <ButtonText>
                <Trans>Cancel</Trans>
              </ButtonText>
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

HighlightOptionsModal = memo(HighlightOptionsModal)
export {HighlightOptionsModal}

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 6,
    overflow: 'hidden',
  },
  selectedRing: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 5,
  },
  actionCluster: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
  },
  quickActionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
