import {useMemo, useState} from 'react'
import {ActivityIndicator, Pressable, ScrollView, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {useDebouncedValue} from '#/lib/hooks/useDebouncedValue'
import {countByGroup, countMatters, tagsForGroups} from '#/lib/matter-filter'
import {type NavigationProp} from '#/lib/routes/types'
import {useParaSearchPostsQuery} from '#/state/queries/search-posts'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {SearchInput} from '#/components/forms/SearchInput'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {MatterFilter} from '#/components/MatterFilter'
import {Text} from '#/components/Typography'
import {getPolicyPostParts, PolicyCard} from './PolicyCard'

/**
 * Data → Policies. Policies are posts people vote on from -3 to +3, so this
 * lists the posts themselves with where the community stands and a way to
 * vote, rather than debates with phases and options (those live in Lobbying).
 */
export function PoliciesScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const [searchText, setSearchText] = useState('')
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [officialOnly, setOfficialOnly] = useState(false)
  const selectedTags = useMemo(
    () => tagsForGroups(selectedGroups, officialOnly),
    [selectedGroups, officialOnly],
  )
  const query = useDebouncedValue(searchText.trim(), 300)
  const filtering = query.length > 0 || selectedTags.length > 0

  // Every policy, unfiltered: it is what the matters are discovered from, so
  // the chips stay put while a filter narrows the list below them.
  const everything = useParaSearchPostsQuery({
    // The AppView refuses an empty `q`; a blank term lists every policy.
    query: ' ',
    sort: 'latest',
    postType: 'policy',
  })
  // The AppView applies search and matters across every page, not just the
  // ones already loaded.
  const narrowed = useParaSearchPostsQuery({
    query: query || ' ',
    sort: 'latest',
    postType: 'policy',
    flairs: selectedTags.length > 0 ? selectedTags : undefined,
    enabled: filtering,
  })
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = filtering ? narrowed : everything

  const posts = useMemo(
    () => data?.pages.flatMap(page => page.posts) ?? [],
    [data],
  )

  // What the list actually contains, so the filter shows real counts and
  // lists unofficial matters only once something is filed under them.
  const groupCounts = useMemo(
    () =>
      countByGroup(
        countMatters(
          (everything.data?.pages.flatMap(page => page.posts) ?? []).map(
            post => getPolicyPostParts(post).record.flairs,
          ),
        ),
      ),
    [everything.data],
  )

  const clearFilters = () => {
    setSearchText('')
    setSelectedGroups([])
    setOfficialOnly(false)
  }

  return (
    <Layout.Screen testID="policiesDashboard">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Policies</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>

      <Layout.Center style={{flex: 1}}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={{padding: 16, paddingBottom: 100}}>
          <View style={[a.gap_md, a.mb_lg]}>
            <SearchInput
              value={searchText}
              onChangeText={setSearchText}
              onClearText={() => setSearchText('')}
              placeholder={_(msg`Buscar policies`)}
            />
            <MatterFilter
              selected={selectedGroups}
              onChange={setSelectedGroups}
              counts={groupCounts}
              verified={officialOnly}
              onVerifiedChange={setOfficialOnly}
            />
            {filtering && !isLoading && !isError ? (
              <View style={[a.flex_row, a.align_center, a.justify_between]}>
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  {posts.length === 1 ? (
                    <Trans>1 policy</Trans>
                  ) : (
                    <Trans>{posts.length} policies</Trans>
                  )}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={_(msg`Quitar filtros`)}
                  accessibilityHint={_(
                    msg`Vuelve a mostrar todas las policies`,
                  )}
                  onPress={clearFilters}>
                  <Text
                    style={[
                      a.text_sm,
                      a.font_bold,
                      {color: t.palette.primary_500},
                    ]}>
                    <Trans>Quitar filtros</Trans>
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {isLoading ? (
            <View style={[a.align_center, a.justify_center, {minHeight: 200}]}>
              <ActivityIndicator size="large" color={t.palette.primary_500} />
            </View>
          ) : isError ? (
            <ListMaybePlaceholder
              isLoading={false}
              isError
              onRetry={refetch}
              emptyType="results"
              errorTitle={_(msg`No se pudieron cargar las policies`)}
              errorMessage={_(msg`Revisa tu conexión e inténtalo de nuevo.`)}
            />
          ) : posts.length === 0 ? (
            <View style={[a.align_center, a.gap_xs, {padding: 40}]}>
              <Text style={[a.text_md, a.font_bold, t.atoms.text]}>
                <Trans>No hay policies que mostrar</Trans>
              </Text>
              <Text
                style={[
                  a.text_sm,
                  a.text_center,
                  t.atoms.text_contrast_medium,
                ]}>
                {query ? (
                  <Trans>Prueba con otra búsqueda.</Trans>
                ) : selectedTags.length === 0 ? (
                  <Trans>
                    Las policies aparecen aquí cuando alguien las publica.
                  </Trans>
                ) : (
                  <Trans>Ninguna policy está archivada en estos matters.</Trans>
                )}
              </Text>
            </View>
          ) : (
            <View style={[a.gap_md]}>
              {posts.map(post => (
                <PolicyCard
                  key={post.uri}
                  post={post}
                  onPress={() =>
                    navigation.navigate('PolicyDetails', {policyUri: post.uri})
                  }
                />
              ))}
              {hasNextPage ? (
                <Button
                  label={_(msg`Cargar más`)}
                  size="large"
                  variant="outline"
                  color="secondary"
                  disabled={isFetchingNextPage}
                  onPress={() => fetchNextPage()}>
                  <ButtonText>
                    {isFetchingNextPage ? (
                      <Trans>Cargando…</Trans>
                    ) : (
                      <Trans>Cargar más</Trans>
                    )}
                  </ButtonText>
                </Button>
              ) : null}
            </View>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}
