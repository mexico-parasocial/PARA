import {useState} from 'react'
import {ScrollView, TouchableOpacity, View} from 'react-native'
import {Trans, useLingui} from '@lingui/react/macro'

import {atoms as a, useBreakpoints, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import {ChevronRight_Stroke2_Corner0_Rounded as ChevronRightIcon} from '#/components/icons/Chevron'
import {TimesLarge_Stroke2_Corner0_Rounded as CloseIcon} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import {type TreeCard, type TreeCardLink} from './CivicTreeCards'

export type CardConnection = {
  link: TreeCardLink
  other: TreeCard
  /** The selected card is the link's source. */
  outgoing: boolean
}

const WIDE_WIDTH = 300
const FAB_CLEARANCE = 48

/**
 * The selected card and what it connects to. Sits under the card lanes on
 * phones and beside them on wide layouts. The accent edge repeats the card's
 * color so the panel reads as the card that was tapped.
 */
export function CivicTreeCardInspector({
  card,
  connections,
  wide,
  maxHeight,
  onClear,
  onOpenDetails,
  onSelect,
}: {
  card?: TreeCard
  connections: CardConnection[]
  wide: boolean
  /** Tallest the panel may be on phones, where it sits under the lanes. */
  maxHeight: number
  onClear: () => void
  onOpenDetails: (id: string) => void
  onSelect: (id: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {gtMobile} = useBreakpoints()
  // The add button floats over the bottom-right corner on phones.
  const clearFab = !gtMobile

  const accent = card ? card.color : 'transparent'
  // A vertical ScrollView has no height of its own here, so phones size it from
  // its measured content, up to a share of the screen.
  const [contentHeight, setContentHeight] = useState(0)
  const phoneHeight = Math.min(contentHeight + 4, maxHeight)

  return (
    <ScrollView
      // Kept as the direct child of the panel's wrapper, with the accent as its
      // own border: a plain View around it collapses the panel on phones.
      style={[
        t.atoms.bg,
        wide
          ? {width: WIDE_WIDTH, borderLeftWidth: 4, borderLeftColor: accent}
          : {
              height: phoneHeight,
              borderTopWidth: 4,
              borderTopColor: accent,
            },
      ]}
      onContentSizeChange={(_w, h) => setContentHeight(h)}
      contentContainerStyle={[
        a.p_lg,
        a.gap_md,
        {paddingBottom: clearFab ? FAB_CLEARANCE : 16},
      ]}>
      {card ? (
        <>
          <View style={[a.gap_sm]}>
            <View style={[a.flex_row, a.align_center, a.justify_between]}>
              <View
                style={[
                  a.flex_row,
                  a.align_center,
                  a.gap_xs,
                  a.rounded_full,
                  a.px_sm,
                  {paddingVertical: 3},
                  t.atoms.bg_contrast_25,
                ]}>
                <View
                  style={[
                    a.rounded_full,
                    {width: 8, height: 8, backgroundColor: card.color},
                  ]}
                />
                <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                  {card.type}
                </Text>
              </View>
              <Button
                label={l`Clear selection`}
                size="small"
                variant="ghost"
                color="secondary"
                shape="round"
                onPress={onClear}>
                <ButtonIcon icon={CloseIcon} />
              </Button>
            </View>
            <Text
              style={[a.text_xl, a.font_bold, a.leading_snug, t.atoms.text]}>
              {card.title}
            </Text>
            {card.summary ? (
              <Text
                numberOfLines={4}
                style={[
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                {card.summary}
              </Text>
            ) : null}
          </View>

          <View>
            <Button
              label={l`Open details`}
              size="large"
              variant="solid"
              color="primary"
              onPress={() => onOpenDetails(card.id)}>
              <ButtonText>
                <Trans>Open details</Trans>
              </ButtonText>
              <ButtonIcon icon={ChevronRightIcon} />
            </Button>
          </View>

          <View style={[a.gap_sm]}>
            <View style={[a.flex_row, a.align_center, a.gap_sm]}>
              <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                <Trans>Connections</Trans>
              </Text>
              <View
                style={[
                  a.rounded_full,
                  a.px_sm,
                  {paddingVertical: 1},
                  t.atoms.bg_contrast_50,
                ]}>
                <Text style={[a.text_xs, a.font_bold, t.atoms.text]}>
                  {connections.length}
                </Text>
              </View>
            </View>
            {connections.length === 0 ? (
              <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                <Trans>No visible connections for this card.</Trans>
              </Text>
            ) : (
              connections.map(({link, other, outgoing}) => (
                <TouchableOpacity
                  key={link.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${outgoing ? card.title : other.title} ${link.label} ${outgoing ? other.title : card.title}`}
                  accessibilityHint={l`Selects the connected card`}
                  onPress={() => onSelect(other.id)}
                  style={[
                    a.flex_row,
                    a.align_center,
                    a.gap_md,
                    a.p_md,
                    a.rounded_md,
                    a.overflow_hidden,
                    t.atoms.bg_contrast_25,
                  ]}>
                  <View
                    style={[
                      a.rounded_full,
                      {
                        width: 4,
                        alignSelf: 'stretch',
                        backgroundColor: link.color,
                      },
                    ]}
                  />
                  <View style={[a.flex_1, a.gap_2xs]}>
                    <Text
                      numberOfLines={1}
                      style={[a.text_xs, t.atoms.text_contrast_medium]}>
                      {link.directed === false ? '↔' : outgoing ? '→' : '←'}{' '}
                      {link.label}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        a.text_sm,
                        a.font_bold,
                        a.leading_snug,
                        t.atoms.text,
                      ]}>
                      {other.title}
                    </Text>
                  </View>
                  <ChevronRightIcon
                    size="sm"
                    style={t.atoms.text_contrast_medium}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        </>
      ) : (
        <View style={[a.gap_sm]}>
          <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
            <Trans>Follow a connection</Trans>
          </Text>
          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              Select a card to see what connects to it. Select a connected card
              to follow the thread.
            </Trans>
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
