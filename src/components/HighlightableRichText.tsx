/**
 * HighlightableRichText - Native implementation
 * Uses TextInput's onSelectionChange to capture partial text selection
 */
import {memo, useCallback, useEffect, useRef, useState} from 'react'
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native'
import {type RichText as RichTextAPI} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {getCrossGradientByColor} from '#/lib/compass/compassColors'
import {
  useHighlightMode,
  useHighlights,
  useIsHighlightModeActive,
} from '#/state/highlights'
import {
  HIGHLIGHT_COLORS,
  type HighlightColor,
  type HighlightData,
} from '#/state/highlights/highlightTypes'
import {useSession} from '#/state/session'
import {useTheme} from '#/alf'
import {
  type HighlightActionPayload,
  HighlightOptionsModal,
} from '#/components/HighlightOptionsModal'
import {RichText} from '#/components/RichText'
import {useHighlightQuickActions} from '#/components/useHighlightQuickActions'

interface HighlightableRichTextProps {
  postUri: string
  text: string
  richText: RichTextAPI
  style?: object
  numberOfLines?: number
  selectable?: boolean
  enableTags?: boolean
  authorHandle?: string
}

let HighlightableRichText = ({
  postUri,
  text,
  richText,
  style,
  numberOfLines,
  selectable,
  enableTags,
  authorHandle,
}: HighlightableRichTextProps): React.ReactNode => {
  const t = useTheme()
  const {_} = useLingui()
  const {currentAccount} = useSession()
  const isHighlightMode = useIsHighlightModeActive(postUri)
  const {enterHighlightMode, exitHighlightMode} = useHighlightMode()
  const {highlights, addHighlight, removeHighlight, updateHighlightData} =
    useHighlights(postUri)
  const inputRef = useRef<TextInput>(null)

  // Selection state
  const [selection, setSelection] = useState<{
    start: number
    end: number
  } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  // Modal state
  const [modalVisible, setModalVisible] = useState(false)
  const [pendingSelection, setPendingSelection] = useState<{
    start: number
    end: number
  } | null>(null)
  const [editingHighlight, setEditingHighlight] =
    useState<HighlightData | null>(null)

  const persistSelectedHighlight = useCallback(
    async (color: HighlightColor, isPublic: boolean, tag?: string) => {
      if (editingHighlight) {
        await updateHighlightData(editingHighlight.id, {color, isPublic, tag})
        return {...editingHighlight, color, isPublic, tag}
      }
      if (pendingSelection) {
        const highlightText = text.slice(
          pendingSelection.start,
          pendingSelection.end,
        )
        return await addHighlight(
          pendingSelection.start,
          pendingSelection.end,
          color,
          isPublic,
          highlightText,
          tag,
        )
      }
      return null
    },
    [
      addHighlight,
      editingHighlight,
      pendingSelection,
      text,
      updateHighlightData,
    ],
  )

  const finishHighlightAction = useCallback(() => {
    setPendingSelection(null)
    setEditingHighlight(null)
    setSelection(null)
    setHasSelection(false)
    setModalVisible(false)
    exitHighlightMode()
  }, [exitHighlightMode])

  const persistHighlightAction = useCallback(
    async (payload: HighlightActionPayload) => {
      return persistSelectedHighlight(
        payload.color,
        payload.isPublic,
        payload.note,
      )
    },
    [persistSelectedHighlight],
  )

  const {sendToAgent, saveToCivicTree} = useHighlightQuickActions({
    postUri,
    persistHighlight: persistHighlightAction,
    onDone: finishHighlightAction,
  })

  const activeHighlightText =
    editingHighlight?.text ||
    (pendingSelection
      ? text.slice(pendingSelection.start, pendingSelection.end)
      : undefined)

  // Cleanup: exit highlight mode when component unmounts
  useEffect(() => {
    return () => {
      if (isHighlightMode) {
        exitHighlightMode()
      }
    }
  }, [isHighlightMode, exitHighlightMode])

  // Handle selection change
  const onSelectionChange = useCallback(
    (event: {nativeEvent: {selection: {start: number; end: number}}}) => {
      const {start, end} = event.nativeEvent.selection
      setSelection({start, end})
      setHasSelection(start !== end)
    },
    [],
  )

  // Handle "Save Selection" button press
  const onSaveSelection = useCallback(() => {
    if (selection && selection.start !== selection.end) {
      setPendingSelection({
        start: Math.min(selection.start, selection.end),
        end: Math.max(selection.start, selection.end),
      })
      setModalVisible(true)
    }
  }, [selection])

  // Handle tap on existing highlight
  const onTapHighlight = useCallback((highlight: HighlightData) => {
    setEditingHighlight(highlight)
    setModalVisible(true)
  }, [])

  // Save new highlight
  const handleSave = useCallback(
    async (color: HighlightColor, isPublic: boolean, tag?: string) => {
      await persistSelectedHighlight(color, isPublic, tag)
      finishHighlightAction()
    },
    [finishHighlightAction, persistSelectedHighlight],
  )

  // Highlight more text
  const handleHighlightMore = useCallback(async () => {
    if (pendingSelection) {
      const highlightText = text.slice(
        pendingSelection.start,
        pendingSelection.end,
      )
      await addHighlight(
        pendingSelection.start,
        pendingSelection.end,
        HIGHLIGHT_COLORS.centerCenter,
        false, // isPublic default false for quick highlight
        highlightText,
      )
    }
    setPendingSelection(null)
    setEditingHighlight(null)
    setModalVisible(false)
    // Stay in highlight mode, reset selection
    setSelection(null)
    setHasSelection(false)
    // Re-enter highlight mode to allow more selections
    enterHighlightMode(postUri)
    // Refocus TextInput to allow new selections
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }, [addHighlight, pendingSelection, enterHighlightMode, postUri, text])

  // Delete existing highlight
  const handleDelete = useCallback(async () => {
    if (editingHighlight) {
      await removeHighlight(editingHighlight.id)
    }
    setEditingHighlight(null)
    setModalVisible(false)
  }, [editingHighlight, removeHighlight])

  // Close modal
  const handleClose = useCallback(() => {
    setPendingSelection(null)
    setEditingHighlight(null)
    setModalVisible(false)
    if (!editingHighlight) {
      exitHighlightMode()
    }
  }, [editingHighlight, exitHighlightMode])

  // Cancel highlight mode
  const handleCancel = useCallback(() => {
    setSelection(null)
    setHasSelection(false)
    exitHighlightMode()
  }, [exitHighlightMode])

  // If not in highlight mode and no highlights, use regular RichText
  if (!isHighlightMode && highlights.length === 0) {
    return (
      <RichText
        value={richText}
        style={style}
        numberOfLines={numberOfLines}
        selectable={selectable}
        enableTags={enableTags}
        authorHandle={authorHandle}
      />
    )
  }

  // Render text with existing highlights as styled spans
  // Always force black text so highlighted text stays readable
  // regardless of how light the compass background color is.
  const getHighlightBackgroundStyle = (color: HighlightColor) => {
    const gradient = getCrossGradientByColor(color)
    if (gradient) {
      // Cross-section (edge) colors: use the first gradient color as the
      // vibrant background and underline with the second color for a
      // two-tone "notable" effect. Avoids the muddy look of blending.
      return {
        backgroundColor: gradient.colors[0],
        color: '#000000',
        textDecorationLine: 'underline' as const,
        textDecorationColor: gradient.colors[1],
        textDecorationStyle: 'solid' as const,
      }
    }
    return {
      backgroundColor: color,
      color: '#000000',
    }
  }

  const renderTextWithHighlights = () => {
    if (highlights.length === 0) {
      return text
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)
    const parts: React.ReactNode[] = []
    let lastEnd = 0

    sortedHighlights.forEach((highlight, index) => {
      // Text before this highlight
      if (highlight.start > lastEnd) {
        parts.push(text.slice(lastEnd, highlight.start))
      }

      const highlightStyle = getHighlightBackgroundStyle(highlight.color)

      // The highlighted text (shown as styled text, tappable when not in edit mode)
      parts.push(
        <Text
          key={`hl-${index}`}
          onPress={() => !isHighlightMode && onTapHighlight(highlight)}
          style={highlightStyle}>
          {text.slice(highlight.start, highlight.end)}
        </Text>,
      )

      lastEnd = highlight.end
    })

    // Remaining text after last highlight
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd))
    }

    return parts
  }

  // In highlight mode, show editable TextInput for selection
  if (isHighlightMode) {
    return (
      <View>
        {/* Instructions */}
        {/* TextInput for selection */}
        <TextInput
          ref={inputRef}
          multiline
          editable={false}
          value={text}
          onSelectionChange={onSelectionChange}
          selection={selection || undefined}
          accessibilityLabel={_(msg`Post text for selection`)}
          accessibilityHint={_(msg`Select text here to create a highlight`)}
          style={[
            styles.textInput,
            style,
            {
              color: t.atoms.text.color,
              backgroundColor: 'rgba(255, 235, 59, 0.1)',
              borderColor: 'rgba(255, 235, 59, 0.5)',
            },
          ]}
          selectTextOnFocus={false}
        />

        {/* Instructions */}
        <View style={styles.highlightModeIndicator}>
          <Text style={[styles.highlightModeText, {color: t.atoms.text.color}]}>
            ✨ Select text below, then tap "Save"
          </Text>
          <View style={styles.buttonRow}>
            {hasSelection && (
              <Pressable
                accessibilityRole="button"
                onPress={onSaveSelection}
                style={styles.saveButton}>
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={handleCancel}
              style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>

        {/* Options modal */}
        <HighlightOptionsModal
          visible={modalVisible}
          onClose={handleClose}
          onSave={(color, isPublic, tag) => {
            void handleSave(color, isPublic, tag)
          }}
          onSendToAgent={payload => {
            void sendToAgent(payload)
          }}
          onSaveToCivicTree={payload => {
            void saveToCivicTree(payload)
          }}
          onHighlightMore={() => {
            void handleHighlightMore()
          }}
          onDelete={
            editingHighlight &&
            (!editingHighlight.creatorDid ||
              editingHighlight.creatorDid === currentAccount?.did)
              ? () => {
                  void handleDelete()
                }
              : undefined
          }
          existingTag={editingHighlight?.tag}
          existingColor={editingHighlight?.color}
          existingIsPublic={editingHighlight?.isPublic}
          actionText={activeHighlightText}
        />
      </View>
    )
  }

  // Display mode: show text with highlight backgrounds
  return (
    <View>
      <Text
        style={[style, {color: t.atoms.text.color}]}
        numberOfLines={numberOfLines}
        selectable={selectable}>
        {renderTextWithHighlights()}
      </Text>

      {/* Options modal for editing existing highlights */}
      <HighlightOptionsModal
        visible={modalVisible}
        onClose={handleClose}
        onSave={(color, isPublic, tag) => {
          void handleSave(color, isPublic, tag)
        }}
        onSendToAgent={payload => {
          void sendToAgent(payload)
        }}
        onSaveToCivicTree={payload => {
          void saveToCivicTree(payload)
        }}
        onHighlightMore={() => {
          void handleHighlightMore()
        }}
        onDelete={
          editingHighlight &&
          (!editingHighlight.creatorDid ||
            editingHighlight.creatorDid === currentAccount?.did)
            ? () => {
                void handleDelete()
              }
            : undefined
        }
        existingTag={editingHighlight?.tag}
        existingColor={editingHighlight?.color}
        existingIsPublic={editingHighlight?.isPublic}
        actionText={activeHighlightText}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  highlightModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: 'rgba(255, 235, 59, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 235, 59, 0.5)',
  },
  highlightModeText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: 'rgba(158, 158, 158, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  selectionPreview: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  textInput: {
    fontSize: 16,
    lineHeight: 22,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    textAlignVertical: 'top',
    minHeight: 80,
  },
})

HighlightableRichText = memo(HighlightableRichText)
export {HighlightableRichText}
