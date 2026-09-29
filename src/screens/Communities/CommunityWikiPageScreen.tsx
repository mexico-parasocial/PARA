import {useEffect, useMemo, useState} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {type CommunityWikiPageKind} from '#/lib/api/para-lexicons'
import {
  parseThreadReference,
  slugifyWikiTitle,
} from '#/lib/community-activities'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {postUriToRelativePath} from '#/lib/strings/url-helpers'
import {
  type CommunityWikiPageView,
  useCommunityOrganizers,
  useCommunityWikiPagesQuery,
  useSaveWikiPageMutation,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as TextField from '#/components/forms/TextField'
import * as Toggle from '#/components/forms/Toggle'
import * as Layout from '#/components/Layout'
import {Link} from '#/components/Link'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {H1, Text} from '#/components/Typography'
import {ChoiceChips} from '#/features/communityActivities/components/ChoiceChips'
import {WikiBody} from '#/features/communityActivities/components/WikiBody'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'CommunityWikiPage'>

export function CommunityWikiPageScreen({route, navigation}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const {communityUri, communityName, communityId, slug, kind} = route.params
  const {organizerDids, canOrganize} = useCommunityOrganizers({
    communityUri,
    communityName,
    communityId,
  })
  const pagesQuery = useCommunityWikiPagesQuery({communityUri, organizerDids})
  const page = useMemo(
    () => pagesQuery.data?.find(p => p.record.slug === slug),
    [pagesQuery.data, slug],
  )
  const [isEditing, setIsEditing] = useState(!slug)
  const isMissing = Boolean(slug) && pagesQuery.isSuccess && !page

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Wiki</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {communityName}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          {canOrganize && page && !isEditing ? (
            <Button
              label={_(msg`Edit page`)}
              size="small"
              color="secondary"
              onPress={() => setIsEditing(true)}>
              <ButtonText>
                <Trans>Edit</Trans>
              </ButtonText>
            </Button>
          ) : null}
        </Layout.Header.Slot>
      </Layout.Header.Outer>
      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {pagesQuery.isLoading ? (
            <View style={[a.p_lg, a.align_center]}>
              <Loader size="lg" />
            </View>
          ) : pagesQuery.isError ? (
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>Could not load the wiki.</Trans>
            </Text>
          ) : isEditing || (isMissing && canOrganize) ? (
            <WikiEditor
              key={page?.uri ?? slug ?? 'new'}
              communityUri={communityUri}
              existing={page}
              initialSlug={slug}
              initialKind={kind}
              takenSlugs={(pagesQuery.data ?? [])
                .map(p => p.record.slug)
                .filter(s => s !== page?.record.slug)}
              onCancel={() =>
                page ? setIsEditing(false) : navigation.goBack()
              }
              onSaved={savedSlug => {
                setIsEditing(false)
                navigation.setParams({slug: savedSlug})
              }}
            />
          ) : isMissing || !page ? (
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              <Trans>This page does not exist yet.</Trans>
            </Text>
          ) : (
            <WikiPageView
              page={page}
              communityUri={communityUri}
              communityName={communityName}
              communityId={communityId}
            />
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

function WikiPageView({
  page,
  communityUri,
  communityName,
  communityId,
}: {
  page: CommunityWikiPageView
  communityUri: string
  communityName: string
  communityId?: string
}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const threadPath = page.record.threadUri
    ? postUriToRelativePath(page.record.threadUri)
    : undefined

  return (
    <View style={[a.gap_md]}>
      <H1 style={[a.text_2xl, a.font_bold]}>{page.record.title}</H1>
      <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>
        {page.record.kind === 'megathread'
          ? _(msg`Megathread`)
          : _(msg`Wiki page`)}{' '}
        ·{' '}
        {_(
          msg`Updated ${i18n.date(new Date(page.record.updatedAt), {
            dateStyle: 'medium',
          })}`,
        )}
      </Text>
      {threadPath ? (
        <Link
          to={threadPath}
          label={_(msg`Open the discussion thread`)}
          style={[
            a.p_md,
            a.rounded_md,
            a.border,
            t.atoms.border_contrast_low,
            t.atoms.bg_contrast_25,
          ]}>
          <Text style={[a.text_md, a.font_semi_bold]}>
            🧵 <Trans>Open the discussion thread</Trans>
          </Text>
        </Link>
      ) : null}
      <WikiBody
        body={page.record.body}
        communityUri={communityUri}
        communityName={communityName}
        communityId={communityId}
      />
    </View>
  )
}

function WikiEditor({
  communityUri,
  existing,
  initialSlug,
  initialKind,
  takenSlugs,
  onCancel,
  onSaved,
}: {
  communityUri: string
  existing?: CommunityWikiPageView
  initialSlug?: string
  initialKind?: CommunityWikiPageKind
  takenSlugs: string[]
  onCancel: () => void
  onSaved: (slug: string) => void
}) {
  const t = useTheme()
  const {_} = useLingui()
  const save = useSaveWikiPageMutation()
  const [title, setTitle] = useState(
    existing?.record.title ?? initialSlug?.replace(/-/g, ' ') ?? '',
  )
  const [kind, setKind] = useState<CommunityWikiPageKind>(
    existing?.record.kind ?? initialKind ?? 'page',
  )
  const [threadInput, setThreadInput] = useState(
    existing?.record.threadUri ?? '',
  )
  const [pinned, setPinned] = useState(
    existing?.record.pinned ?? initialKind === 'megathread',
  )
  const [body, setBody] = useState(existing?.record.body ?? '')
  const [error, setError] = useState<string>()

  // A page keeps its slug when renamed so existing [[links]] keep working.
  const slug = existing?.record.slug ?? initialSlug ?? slugifyWikiTitle(title)

  useEffect(() => setError(undefined), [title, threadInput, body])

  const onSave = () => {
    if (!title.trim() || !slug) {
      setError(_(msg`Give the page a title.`))
      return
    }
    if (takenSlugs.includes(slug)) {
      setError(_(msg`Another page already uses this title.`))
      return
    }
    const threadUri =
      kind === 'megathread' && threadInput.trim()
        ? parseThreadReference(threadInput)
        : undefined
    if (kind === 'megathread' && threadInput.trim() && !threadUri) {
      setError(_(msg`Paste a post link or an at:// post URI.`))
      return
    }
    save.mutate(
      {
        existing,
        page: {
          communityUri,
          kind,
          slug,
          title: title.trim(),
          body,
          threadUri,
          pinned,
          sortOrder: existing?.record.sortOrder,
        },
      },
      {
        onSuccess: () => {
          Toast.show(_(msg`Page saved`))
          onSaved(slug)
        },
        onError: err => setError(cleanError(err)),
      },
    )
  }

  return (
    <View style={[a.gap_lg]}>
      <View>
        <TextField.LabelText>
          <Trans>Title</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Title`)}
            value={title}
            onChangeText={setTitle}
            maxLength={300}
          />
        </TextField.Root>
        {slug ? (
          <Text style={[a.text_xs, a.mt_xs, t.atoms.text_contrast_medium]}>
            <Trans>Link to this page with [[{slug}]]</Trans>
          </Text>
        ) : null}
      </View>

      <View style={[a.gap_sm]}>
        <TextField.LabelText>
          <Trans>Type</Trans>
        </TextField.LabelText>
        <ChoiceChips
          label={_(msg`Page type`)}
          value={kind}
          onChange={setKind}
          options={[
            {value: 'page', label: _(msg`Wiki page`)},
            {value: 'megathread', label: _(msg`Megathread`)},
          ]}
        />
      </View>

      {kind === 'megathread' ? (
        <View>
          <TextField.LabelText>
            <Trans>Discussion thread (post link)</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <TextField.Input
              label={_(msg`Discussion thread`)}
              placeholder="https://…/profile/…/post/…"
              value={threadInput}
              onChangeText={setThreadInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </TextField.Root>
        </View>
      ) : null}

      <Toggle.Item
        name="pinned"
        label={_(msg`Pin to the top of the menu`)}
        value={pinned}
        onChange={setPinned}>
        <Toggle.Checkbox />
        <Toggle.LabelText>
          <Trans>Pin to the top of the menu</Trans>
        </Toggle.LabelText>
      </Toggle.Item>

      <View>
        <TextField.LabelText>
          <Trans>Content</Trans>
        </TextField.LabelText>
        <TextField.Root>
          <TextField.Input
            label={_(msg`Content`)}
            placeholder={_(
              msg`Write the page. Link other pages with [[Page title]] and paste web links as-is.`,
            )}
            value={body}
            onChangeText={setBody}
            multiline
            numberOfLines={12}
            style={[{minHeight: 240, textAlignVertical: 'top'}]}
            maxLength={50000}
          />
        </TextField.Root>
      </View>

      {error ? (
        <Text style={[a.text_sm, {color: t.palette.negative_500}]}>
          {error}
        </Text>
      ) : null}

      <View style={[a.flex_row, a.gap_sm, a.justify_end]}>
        <Button
          label={_(msg`Cancel`)}
          size="large"
          color="secondary"
          onPress={onCancel}>
          <ButtonText>
            <Trans>Cancel</Trans>
          </ButtonText>
        </Button>
        <Button
          label={_(msg`Save page`)}
          size="large"
          color="primary"
          disabled={save.isPending}
          onPress={onSave}>
          <ButtonText>
            <Trans>Save</Trans>
          </ButtonText>
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
