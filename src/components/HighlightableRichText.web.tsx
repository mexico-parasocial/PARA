/**
 * HighlightableRichText - Web implementation using window.getSelection()
 * Provides text selection functionality for web platform
 */
import {memo, useCallback, useEffect, useRef, useState} from 'react'
import {View} from 'react-native'
import {type RichText as RichTextAPI} from '@atproto/api'

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
  const {currentAccount} = useSession()
  const containerRef = useRef<View>(null)
  const isHighlightMode = useIsHighlightModeActive(postUri)
  const {enterHighlightMode, exitHighlightMode} = useHighlightMode()
  const {highlights, addHighlight, removeHighlight, updateHighlightData} =
    useHighlights(postUri)

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

  // Handle text selection on web
  const handleMouseUp = useCallback(() => {
    if (!isHighlightMode) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed) return

    const selectedText = selection.toString()
    if (!selectedText.trim()) return

    // Find the start index by locating the selected text in the original text
    const startIndex = text.indexOf(selectedText)
    if (startIndex === -1) return

    setPendingSelection({
      start: startIndex,
      end: startIndex + selectedText.length,
    })
    setModalVisible(true)

    // Clear browser selection
    selection.removeAllRanges()
  }, [isHighlightMode, text])

  // Set up event listener for selection
  useEffect(() => {
    if (isHighlightMode) {
      document.addEventListener('mouseup', handleMouseUp)
      return () => document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isHighlightMode, handleMouseUp])

  // Handle click on existing highlight
  const handleHighlightClick = useCallback((highlight: HighlightData) => {
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
        false, // isPublic default false
        highlightText,
      )
    }
    setPendingSelection(null)
    setEditingHighlight(null)
    setModalVisible(false)
    // Re-enter highlight mode to allow more selections
    enterHighlightMode(postUri)
  }, [pendingSelection, addHighlight, enterHighlightMode, postUri, text])

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

  // If no highlights and not in highlight mode, use regular RichText
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

  // Render text with highlights
  const renderHighlightedText = () => {
    if (highlights.length === 0) {
      return (
        <RichText
          value={richText}
          style={style}
          numberOfLines={numberOfLines}
          selectable={isHighlightMode || selectable}
          enableTags={enableTags}
          authorHandle={authorHandle}
        />
      )
    }

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)

    const parts: React.ReactNode[] = []
    let lastEnd = 0

    sortedHighlights.forEach((highlight, index) => {
      // Add unhighlighted text before this highlight
      if (highlight.start > lastEnd) {
        parts.push(
          <span key={`text-${index}`}>
            {text.slice(lastEnd, highlight.start)}
          </span>,
        )
      }

      const gradient = getCrossGradientByColor(highlight.color)
      const highlightStyle = gradient
        ? {
            backgroundColor: gradient.colors[0],
            backgroundImage: `linear-gradient(90deg, ${gradient.colors[0]}, ${gradient.colors[1]})`,
          }
        : {backgroundColor: highlight.color}

      // Add highlighted text
      // Always force black text so it stays readable on any
      // light compass background color.
      // boxDecorationBreak: 'clone' ensures each wrapped line gets its own
      // copy of the gradient instead of one gradient stretched across all lines.
      parts.push(
        <span
          key={`highlight-${index}`}
          onClick={() => handleHighlightClick(highlight)}
          style={{
            ...highlightStyle,
            color: '#000000',
            cursor: 'pointer',
            borderRadius: 2,
            padding: '1px 3px',
            WebkitBoxDecorationBreak: 'clone',
            boxDecorationBreak: 'clone',
          }}>
          {text.slice(highlight.start, highlight.end)}
        </span>,
      )

      lastEnd = highlight.end
    })

    // Add remaining text
    if (lastEnd < text.length) {
      parts.push(<span key="text-end">{text.slice(lastEnd)}</span>)
    }

    return (
      <div
        style={{
          color: t.atoms.text.color,
          cursor: isHighlightMode ? 'text' : 'default',
          userSelect: isHighlightMode ? 'text' : 'auto',
        }}>
        {parts}
      </div>
    )
  }

  return (
    <View ref={containerRef}>
      {renderHighlightedText()}

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

HighlightableRichText = memo(HighlightableRichText)
export {HighlightableRichText}
