import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'
import {useQueryClient} from '@tanstack/react-query'
import debounce from 'lodash.debounce'

import {type CivicCategoryKey, useCivicCategories} from '#/lib/interests'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {
  preferencesQueryKey,
  usePreferencesQuery,
} from '#/state/queries/preferences'
import {type UsePreferencesQueryResponse} from '#/state/queries/preferences/types'
import {createGetSuggestedFeedsQueryKey} from '#/state/queries/trending/useGetSuggestedFeedsQuery'
import {createGetSuggestedUsersForDiscoverQueryKey} from '#/state/queries/trending/useGetSuggestedUsersForDiscoverQuery'
import {createGetSuggestedUsersForExploreQueryKey} from '#/state/queries/trending/useGetSuggestedUsersForExploreQuery'
import {createGetSuggestedUsersForSeeMoreQueryKey} from '#/state/queries/trending/useGetSuggestedUsersForSeeMoreQuery'
import {createSuggestedStarterPacksQueryKey} from '#/state/queries/useSuggestedStarterPacksQuery'
import {useAgent} from '#/state/session'
import {atoms as a, useGutters, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Divider} from '#/components/Divider'
import * as Toggle from '#/components/forms/Toggle'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'InterestsSettings'>
export function InterestsSettingsScreen({}: Props) {
  const t = useTheme()
  const gutters = useGutters(['base'])
  const {data: preferences} = usePreferencesQuery()
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Your interests</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>{isSaving && <Loader />}</Layout.Header.Slot>
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[gutters, a.gap_lg]}>
          <Text
            style={[
              a.flex_1,
              a.text_sm,
              a.leading_snug,
              t.atoms.text_contrast_medium,
            ]}>
            <Trans>
              Your selected interests help us serve you content you care about.
            </Trans>
          </Text>

          <Divider />

          {preferences ? (
            <Inner preferences={preferences} setIsSaving={setIsSaving} />
          ) : (
            <View style={[a.flex_row, a.justify_center, a.p_lg]}>
              <Loader size="xl" />
            </View>
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function Inner({
  preferences,
  setIsSaving,
}: {
  preferences: UsePreferencesQueryResponse
  setIsSaving: (isSaving: boolean) => void
}) {
  const {_} = useLingui()
  const agent = useAgent()
  const qc = useQueryClient()
  const civicCategories = useCivicCategories()
  const preselectedInterests = useMemo(
    () => preferences.interests.tags || [],
    [preferences.interests.tags],
  )
  const [interests, setInterests] = useState<string[]>(preselectedInterests)

  const saveInterests = useMemo(() => {
    return debounce(async (interests: string[]) => {
      const noEdits =
        interests.length === preselectedInterests.length &&
        preselectedInterests.every(pre => {
          return interests.find(int => int === pre)
        })

      if (noEdits) return

      setIsSaving(true)

      try {
        await agent.setInterestsPref({tags: interests})
        qc.setQueriesData(
          {queryKey: preferencesQueryKey},
          (old?: UsePreferencesQueryResponse) => {
            if (!old) return old
            old.interests.tags = interests
            return old
          },
        )
        await Promise.all([
          qc.resetQueries({queryKey: createSuggestedStarterPacksQueryKey()}),
          qc.resetQueries({queryKey: createGetSuggestedFeedsQueryKey()}),
          qc.resetQueries({
            queryKey: createGetSuggestedUsersForDiscoverQueryKey({}),
          }),
          qc.resetQueries({
            queryKey: createGetSuggestedUsersForExploreQueryKey({}),
          }),
          qc.resetQueries({
            queryKey: createGetSuggestedUsersForSeeMoreQueryKey({}),
          }),
        ])

        Toast.show(
          _(
            msg({
              message: 'Your interests have been updated!',
              context: 'toast',
            }),
          ),
        )
      } catch (error) {
        Toast.show(
          _(
            msg({
              message: 'Failed to save your interests.',
              context: 'toast',
            }),
          ),
          {
            type: 'error',
          },
        )
      } finally {
        setIsSaving(false)
      }
    }, 1500)
  }, [_, agent, setIsSaving, qc, preselectedInterests])

  const onChangeInterests = (interests: string[]) => {
    setInterests(interests)
    void saveInterests(interests)
  }

  const categoryKeys = Object.keys(civicCategories) as CivicCategoryKey[]

  return (
    <>
      {interests.length === 0 && (
        <Admonition type="tip">
          <Trans>We recommend selecting at least two interests.</Trans>
        </Admonition>
      )}

      <Toggle.Group
        values={interests}
        onChange={onChangeInterests}
        label={_(msg`Select your interests from the options below`)}>
        <View style={[a.gap_lg]}>
          {categoryKeys.map(categoryKey => {
            const category = civicCategories[categoryKey]
            return (
              <View key={categoryKey} style={[a.gap_sm]}>
                <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                  <Text style={[{fontSize: 18}]}>{category.emoji}</Text>
                  <Text style={[a.font_semi_bold, a.text_md]}>
                    {category.label}
                  </Text>
                </View>
                <View style={[a.flex_row, a.flex_wrap, a.gap_sm]}>
                  {category.interests.map(interest => {
                    const label =
                      category.interestLabels[interest] || interest
                    return (
                      <Toggle.Item
                        key={interest}
                        name={interest}
                        label={label}>
                        <CivicInterestPill label={label} />
                      </Toggle.Item>
                    )
                  })}
                </View>
              </View>
            )
          })}
        </View>
      </Toggle.Group>
    </>
  )
}

function CivicInterestPill({label}: {label: string}) {
  const t = useTheme()
  const ctx = Toggle.useItemContext()

  return (
    <View
      style={[
        a.rounded_full,
        a.px_lg,
        {paddingVertical: 10},
        ctx.selected
          ? {backgroundColor: t.palette.contrast_900}
          : {backgroundColor: t.palette.contrast_100},
        ctx.hovered && !ctx.selected
          ? {backgroundColor: t.palette.contrast_200}
          : {},
      ]}>
      <Text
        style={[
          a.font_semi_bold,
          a.text_sm,
          ctx.selected
            ? {color: t.palette.contrast_100}
            : {color: t.palette.contrast_900},
        ]}>
        {label}
      </Text>
    </View>
  )
}
