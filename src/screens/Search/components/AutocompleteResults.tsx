import {memo} from 'react'
import {ActivityIndicator, TouchableOpacity, View, type ViewStyle} from 'react-native'
import {type AppBskyActorDefs} from '@atproto/api'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {SearchProfileCard} from '#/screens/Search/components/SearchProfileCard'
import {atoms as a, native, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {Text} from '#/components/Typography'
import {useAnalytics} from '#/analytics'
import {IS_NATIVE} from '#/env'

let AutocompleteResults = ({
  isAutocompleteFetching,
  autocompleteData,
  searchText,
  onSubmit,
  onResultPress,
  onProfileClick,
}: {
  isAutocompleteFetching: boolean
  autocompleteData: AppBskyActorDefs.ProfileViewBasic[] | undefined
  searchText: string
  onSubmit: () => void
  onResultPress: () => void
  onProfileClick: (profile: AppBskyActorDefs.ProfileViewBasic) => void
}): React.ReactNode => {
  const ax = useAnalytics()
  const {_} = useLingui()
  const moderationOpts = useModerationOpts()
  return (
    <>
      {(isAutocompleteFetching && !autocompleteData?.length) ||
      !moderationOpts ? (
        <Layout.Content>
          <View style={[a.py_xl]}>
            <ActivityIndicator />
          </View>
        </Layout.Content>
      ) : (
        <Layout.Content
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <SearchLinkCard
            label={_(msg`Search for "${searchText}"`)}
            onPress={native(onSubmit)}
            to={
              IS_NATIVE
                ? undefined
                : `/search?q=${encodeURIComponent(searchText)}`
            }
            style={a.border_b}
          />
          {autocompleteData?.map((item, index) => (
            <SearchProfileCard
              key={item.did}
              profile={item}
              moderationOpts={moderationOpts}
              onPress={() => {
                ax.metric('search:autocomplete:press', {
                  profileDid: item.did,
                  position: index,
                })
                onProfileClick(item)
                onResultPress()
              }}
            />
          ))}
          <View style={{height: 200}} />
        </Layout.Content>
      )}
    </>
  )
}
AutocompleteResults = memo(AutocompleteResults)
export {AutocompleteResults}

let SearchLinkCard = ({
  label,
  to,
  onPress,
  style,
}: {
  label: string
  to?: string
  onPress?: () => void
  style?: ViewStyle
}): React.ReactNode => {
  const t = useTheme()

  const inner = (
    <View
      style={[
        a.flex_1,
        a.py_lg,
        a.px_md,
        t.atoms.border_contrast_low,
        style,
      ]}>
      <Text emoji style={[a.text_md, t.atoms.text]}>
        {label}
      </Text>
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={label}
        accessibilityHint="">
        {inner}
      </TouchableOpacity>
    )
  }

  if (to) {
    return (
      <Link label={label} to={to}>
        {inner}
      </Link>
    )
  }

  return inner
}
SearchLinkCard = memo(SearchLinkCard)
