import {forwardRef, useEffect, useImperativeHandle, useMemo} from 'react'
import {findNodeHandle, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'

import {RAQ_AXES} from '#/lib/mock-data'
import * as persisted from '#/state/persisted'
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

type ProfileRaqItem = {
  id: string
  question: string
  answer: string
  score: string
}

export const ProfileRAQSection = forwardRef<SectionRef, Props>(
  function ProfileRAQSection(
    {headerHeight, scrollElRef, setScrollViewTag, isFocused},
    ref,
  ) {
    const t = useTheme()
    const {_} = useLingui()

    const answers = persisted.get('raqAnswers') as Record<string, number> | undefined

    const history = useMemo<ProfileRaqItem[]>(() => {
      if (!answers) return []
      const items: ProfileRaqItem[] = []
      for (const axis of RAQ_AXES) {
        for (const q of axis.data) {
          const val = answers[q.id]
          if (val === undefined) continue
          const label = val > 0 ? 'Agree' : val < 0 ? 'Disagree' : 'Neutral'
          items.push({
            id: q.id,
            question: q.text,
            answer: label,
            score: `${val > 0 ? '+' : ''}${val}`,
          })
        }
      }
      return items
    }, [answers])

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

    const renderItem = ({item}: {item: ProfileRaqItem}) => (
      <View style={[a.p_md, a.border_b, t.atoms.border_contrast_low]}>
        <Text style={[a.text_md, a.font_bold]}>{item.question}</Text>
        <View style={[a.flex_row, a.justify_between, a.mt_xs]}>
          <Text style={[t.atoms.text_contrast_medium]}>
            Answer:{' '}
            <Text style={[a.font_bold, t.atoms.text]}>{item.answer}</Text>
          </Text>
          <Text style={[t.atoms.text_contrast_low]}>{item.score}</Text>
        </View>
      </View>
    )

    return (
      <List
        ref={scrollElRef}
        data={history as unknown[]}
        renderItem={renderItem as unknown as (info: {item: unknown; index: number}) => React.ReactElement}
        keyExtractor={(item: unknown) => (item as ProfileRaqItem).id}
        headerOffset={headerHeight}
        ListEmptyComponent={
          <EmptyState
            icon={EditIcon}
            message={_(msg`No public RAQ answers yet`)}
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
