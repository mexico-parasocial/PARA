import {View} from 'react-native'
import Animated, {FadeInDown, FadeOut} from 'react-native-reanimated'
import {type AppBskyActorDefs} from '@atproto/api'
import {Trans} from '@lingui/react/macro'

import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeHandle} from '#/lib/strings/handles'
import {useActorAutocompleteQuery} from '#/state/queries/actor-autocomplete'
import {UserAvatar} from '#/view/com/util/UserAvatar'
import {atoms as a, platform, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {useSimpleVerificationState} from '#/components/verification'
import {VerificationCheck} from '#/components/verification/VerificationCheck'
import {
  type CivicAutocompleteItem,
  type ComposerAutocompleteContext,
  getCivicAutocompleteItems,
} from '../civic-autocomplete'

type NativeAutocompleteItem =
  | {
      type: 'mention'
      profile: AppBskyActorDefs.ProfileViewBasic
    }
  | CivicAutocompleteItem

export function Autocomplete({
  context,
  onSelect,
}: {
  context: ComposerAutocompleteContext | null
  onSelect: (item: NativeAutocompleteItem) => void
}) {
  const t = useTheme()

  const isMention = context?.type === 'mention'
  const isCivic = context?.type === 'hashtag' || context?.type === 'command'
  const {data: suggestions, isFetching} = useActorAutocompleteQuery(
    isMention ? context.query : '',
    true,
  )

  if (!context) return null

  const items: NativeAutocompleteItem[] = isMention
    ? (suggestions || []).slice(0, 5).map(profile => ({
        type: 'mention',
        profile,
      }))
    : isCivic
      ? getCivicAutocompleteItems(context, 8)
      : []

  if (context.type === 'hashtag' && !context.query) {
    return null
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOut.duration(100)}
      style={[
        t.atoms.bg,
        a.mt_sm,
        a.border,
        a.rounded_sm,
        t.atoms.border_contrast_high,
        {marginLeft: -62},
      ]}>
      {items.length ? (
        items.map((item, index, arr) => {
          switch (item.type) {
            case 'mention':
              return (
                <AutocompleteProfileCard
                  key={item.profile.did}
                  profile={item.profile}
                  itemIndex={index}
                  totalItems={arr.length}
                  onPress={() => {
                    onSelect(item)
                  }}
                />
              )
            case 'composerCommand':
              return (
                <AutocompleteCivicCard
                  key={item.key}
                  item={item}
                  itemIndex={index}
                  totalItems={arr.length}
                  onPress={() => {
                    onSelect(item)
                  }}
                />
              )
            default:
              return (
                <AutocompleteCivicCard
                  key={item.key}
                  item={item}
                  itemIndex={index}
                  totalItems={arr.length}
                  onPress={() => {
                    onSelect(item)
                  }}
                />
              )
          }
        })
      ) : (
        <Text style={[a.text_md, a.px_sm, a.py_md]}>
          {isFetching ? <Trans>Loading...</Trans> : <Trans>No result</Trans>}
        </Text>
      )}
    </Animated.View>
  )
}

function AutocompleteProfileCard({
  profile,
  itemIndex,
  totalItems,
  onPress,
}: {
  profile: AppBskyActorDefs.ProfileViewBasic
  itemIndex: number
  totalItems: number
  onPress: () => void
}) {
  const t = useTheme()
  const state = useSimpleVerificationState({profile})
  const displayName = sanitizeDisplayName(
    profile.displayName || sanitizeHandle(profile.handle),
  )
  return (
    <View
      style={[
        itemIndex !== totalItems - 1 && a.border_b,
        t.atoms.border_contrast_high,
        a.px_sm,
        a.py_md,
      ]}>
      <PressableScale
        testID="autocompleteButton"
        style={[a.flex_row, a.gap_lg, a.justify_between, a.align_center]}
        onPress={onPress}
        accessibilityLabel={`Select ${profile.handle}`}
        accessibilityHint="">
        <View style={[a.flex_row, a.gap_sm, a.align_center, a.flex_1]}>
          <UserAvatar
            avatar={profile.avatar ?? null}
            size={24}
            type={profile.associated?.labeler ? 'labeler' : 'user'}
          />
          <View
            style={[
              a.flex_row,
              a.align_center,
              a.gap_xs,
              platform({ios: a.flex_1}),
            ]}>
            <Text
              style={[a.text_md, a.font_semi_bold, a.leading_snug]}
              emoji
              numberOfLines={1}>
              {displayName}
            </Text>
            {state.isVerified && (
              <View
                style={[
                  {
                    marginTop: platform({android: -2}),
                  },
                ]}>
                <VerificationCheck
                  width={12}
                  verifier={state.role === 'verifier'}
                />
              </View>
            )}
          </View>
        </View>
        <Text
          style={[t.atoms.text_contrast_medium, a.text_right, a.leading_snug]}
          numberOfLines={1}>
          {sanitizeHandle(profile.handle, '@')}
        </Text>
      </PressableScale>
    </View>
  )
}

function AutocompleteCivicCard({
  item,
  itemIndex,
  totalItems,
  onPress,
}: {
  item: CivicAutocompleteItem
  itemIndex: number
  totalItems: number
  onPress: () => void
}) {
  const t = useTheme()
  const badgeColor =
    item.type === 'composerCommand'
      ? item.postType.color
      : item.flair.color || t.palette.primary_500
  const badgeText =
    item.type === 'composerCommand'
      ? item.value
      : item.type === 'policyFlair'
        ? '||#'
        : '|#'

  return (
    <View
      style={[
        itemIndex !== totalItems - 1 && a.border_b,
        t.atoms.border_contrast_high,
        a.px_sm,
        a.py_md,
      ]}>
      <PressableScale
        style={[a.flex_row, a.gap_md, a.align_center]}
        onPress={onPress}
        accessibilityLabel={`Select ${item.label}`}
        accessibilityHint="">
        <View
          style={[
            a.rounded_full,
            a.align_center,
            a.justify_center,
            {
              width: 34,
              height: 34,
              backgroundColor: badgeColor,
            },
          ]}>
          <Text style={[a.font_bold, {color: 'white', fontSize: 11}]}>
            {badgeText}
          </Text>
        </View>
        <View style={[a.flex_1]}>
          <Text style={[a.text_md, a.font_semi_bold]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text
            style={[a.text_sm, t.atoms.text_contrast_medium]}
            numberOfLines={1}>
            {item.type === 'composerCommand' ? item.description : item.value}
          </Text>
        </View>
      </PressableScale>
    </View>
  )
}
