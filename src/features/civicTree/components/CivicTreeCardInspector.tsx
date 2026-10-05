import {
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
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
const FAB_CLEARANCE = 96

/**
 * The selected card and what it connects to. Sits under the card lanes on
 * phones and beside them on wide layouts. The accent edge repeats the card's
 * color so the panel reads as the card that was tapped.
 */
export function CivicTreeCardInspector({
  card,
  connections,
  wide,
  onClear,
  onOpenDetails,
  onSelect,
}: {
  card?: TreeCard
  connections: CardConnection[]
  wide: boolean
  onClear: () => void
  onOpenDetails: (id: string) => void
  onSelect: (id: string) => void
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const {height} = useWindowDimensions()
  const {gtMobile} = useBreakpoints()
  // The add button floats over the bottom-right corner on phones.
  const clearFab = !gtMobile

  return (
    <View
      style={[
        t.atoms.bg,
        wide ? [{width: WIDE_WIDTH}, a.flex_row] : {maxHeight: height * 0.46},
      ]}>
      {card ? (
        <View
          style={[
            wide ? {width: 4} : {height: 4},
            wide && {alignSelf: 'stretch'},
            !wide && {position: 'absolute', top: 0, left: 0, right: 0},
            {backgroundColor: card.color, zIndex: 1},
          ]}
        />
      ) : null}
      <ScrollView
        style={[a.flex_1]}
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

            <View style={[clearFab && {paddingRight: 72}]}>
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
                Select a card to see what connects to it. Select a connected
                card to follow the thread.
              </Trans>
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}
