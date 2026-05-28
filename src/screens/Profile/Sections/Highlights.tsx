import {forwardRef, useEffect, useImperativeHandle} from 'react'
import {findNodeHandle, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {EmptyState} from '#/view/com/util/EmptyState'
import {List} from '#/view/com/util/List'
import {type ListRef} from '#/view/com/util/List'
import {atoms as a, useTheme} from '#/alf'
import {EditBig_Stroke1_Corner0_Rounded as EditIcon} from '#/components/icons/EditBig'
import {Text} from '#/components/Typography'
import {IS_IOS} from '#/env'
import {type SectionRef} from './types'

interface Props {
  headerHeight: number
  scrollElRef: ListRef
  setScrollViewTag: (tag: number | null) => void
  isFocused: boolean
}

type ProfileHighlightItem = {
  id: string
  color: string
  community: string
  createdAt: string
  text: string
  postAuthor: string
}

const PROFILE_HIGHLIGHTS: ProfileHighlightItem[] = []

export const ProfileHighlightsSection = forwardRef<SectionRef, Props>(
  function ProfileHighlightsSection(
    {headerHeight, scrollElRef, setScrollViewTag, isFocused},
    ref,
  ) {
    const t = useTheme()
    const {_} = useLingui()

    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        scrollElRef.current?.scrollToOffset({
          offset: -headerHeight,
          animated: true,
        })
      },
    }))

    useEffect(() => {
      if (IS_IOS && isFocused && scrollElRef.current) {
        // @ts-ignore
        const nativeTag = findNodeHandle(scrollElRef.current)
        setScrollViewTag(nativeTag)
      }
    }, [isFocused, scrollElRef, setScrollViewTag])

    const renderItem = ({item}: {item: ProfileHighlightItem}) => (
      <View style={[a.p_md, a.border_b, t.atoms.border_contrast_low]}>
        <View style={[a.flex_row, a.justify_between]}>
          <Text style={[a.text_xs, {color: item.color}, a.font_bold]}>
            {item.community}
          </Text>
          <Text style={[a.text_xs, t.atoms.text_contrast_low]}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={[a.text_md, a.mt_xs]}>{item.text}</Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium, a.mt_xs]}>
          @{item.postAuthor}
        </Text>
      </View>
    )

    return (
      <List
        ref={scrollElRef}
        data={PROFILE_HIGHLIGHTS}
        renderItem={renderItem}
        keyExtractor={(item: ProfileHighlightItem) => item.id}
        headerOffset={headerHeight}
        ListEmptyComponent={
          <EmptyState
            icon={EditIcon}
            message={_(msg`No public highlights yet`)}
            style={{width: '100%'}}
          />
        }
        contentContainerStyle={{
          minHeight: '100%',
          paddingBottom: 100,
        }}
      />
    )
  },
)
