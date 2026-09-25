import {useMemo} from 'react'
import {Pressable, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {
  ACTIVITY_STATUSES,
  formatMinor,
  getActivityKindMeta,
} from '#/lib/community-activities'
import {type CommunityGovernanceView} from '#/lib/community-governance'
import {type NavigationProp} from '#/lib/routes/types'
import {
  type CommunityActivityView,
  type CommunityWikiPageView,
  useCommunityActivitiesQuery,
  useCommunityOrganizers,
  useCommunityWikiPagesQuery,
} from '#/state/queries/community-activities'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {CIVIC_TREE_COPY, CIVIC_TREE_LABELS} from '#/features/civicTree/labels'

/*
 * The community's table of contents, in the spirit of a subreddit's sidebar
 * menu: pinned megathreads first, then the wiki, then the calendar of
 * activities. Everything listed here is a record in an organizer's repo.
 */
export function CommunityMenu({
  communityUri,
  communityName,
  communityId,
  governance,
}: {
  communityUri: string | undefined
  communityName: string
  communityId?: string
  governance?: CommunityGovernanceView
}) {
  const t = useTheme()
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {organizerDids, canOrganize} = useCommunityOrganizers({
    communityUri,
    governance,
  })
  const wikiQuery = useCommunityWikiPagesQuery({communityUri, organizerDids})
  const activitiesQuery = useCommunityActivitiesQuery({
    communityUri,
    organizerDids,
  })

  const {megathreads, pages} = useMemo(() => {
    const all = wikiQuery.data ?? []
    return {
      megathreads: all.filter(page => page.record.kind === 'megathread'),
      pages: all.filter(page => page.record.kind !== 'megathread'),
    }
  }, [wikiQuery.data])

  const {social, economic} = useMemo(() => {
    const all = activitiesQuery.data ?? []
    return {
      social: all.filter(activity => activity.category === 'social'),
      economic: all.filter(activity => activity.category === 'economic'),
    }
  }, [activitiesQuery.data])

  if (!communityUri) {
    return (
      <Text style={[a.p_lg, t.atoms.text_contrast_medium]}>
        <Trans>The menu is available once this community's details load.</Trans>
      </Text>
    )
  }

  const openPage = (slug?: string, kind?: 'page' | 'megathread') =>
    navigation.navigate('CommunityWikiPage', {
      communityUri,
      communityName,
      communityId,
      slug,
      kind,
    })

  return (
    <View style={[a.gap_lg]}>
      <MenuSection
        title={_(msg`Megathreads`)}
        action={
          canOrganize
            ? {
                label: _(msg`New megathread`),
                onPress: () => openPage(undefined, 'megathread'),
              }
            : undefined
        }
        isLoading={wikiQuery.isLoading}
        isError={wikiQuery.isError}
        onRetry={() => void wikiQuery.refetch()}
        emptyText={_(msg`No megathreads pinned yet.`)}
        isEmpty={megathreads.length === 0}>
        {megathreads.map(page => (
          <WikiRow
            key={page.uri}
            page={page}
            onPress={() => openPage(page.record.slug)}
          />
        ))}
      </MenuSection>

      <MenuSection
        title={_(msg`Wiki`)}
        action={
          canOrganize
            ? {label: _(msg`New page`), onPress: () => openPage(undefined)}
            : undefined
        }
        isLoading={wikiQuery.isLoading}
        isError={wikiQuery.isError}
        onRetry={() => void wikiQuery.refetch()}
        emptyText={_(msg`The wiki is empty.`)}
        isEmpty={pages.length === 0}>
        {pages.map(page => (
          <WikiRow
            key={page.uri}
            page={page}
            onPress={() => openPage(page.record.slug)}
          />
        ))}
      </MenuSection>

      {(
        [
          {
            category: 'social',
            title: _(msg`Civic activities`),
            action: _(msg`Register civic activity`),
            empty: _(msg`No marches, signature drives or assemblies yet.`),
            activities: social,
          },
          {
            category: 'economic',
            title: _(msg`Economic activities`),
            action: _(msg`Register economic activity`),
            empty: _(msg`No sales, raffles or fundraisers yet.`),
            activities: economic,
          },
        ] as const
      ).map(section => (
        <MenuSection
          key={section.category}
          title={section.title}
          action={
            canOrganize
              ? {
                  label: section.action,
                  onPress: () =>
                    navigation.navigate('CreateCommunityActivity', {
                      communityUri,
                      communityName,
                      communityId,
                      category: section.category,
                    }),
                }
              : undefined
          }
          isLoading={activitiesQuery.isLoading}
          isError={activitiesQuery.isError}
          onRetry={() => void activitiesQuery.refetch()}
          emptyText={section.empty}
          isEmpty={section.activities.length === 0}>
          <ActivityList activities={section.activities} />
        </MenuSection>
      ))}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={CIVIC_TREE_LABELS.community}
        accessibilityHint={_(msg`Opens the community civic tree`)}
        onPress={() =>
          navigation.navigate('CommunityCivicTree', {
            communityUri,
            communityName,
          })
        }
        style={[
          a.flex_row,
          a.align_center,
          a.gap_md,
          a.p_lg,
          a.rounded_md,
          a.border,
          t.atoms.border_contrast_low,
          t.atoms.bg,
        ]}>
        <TreeIcon size="lg" style={t.atoms.text} />
        <View style={[a.flex_1]}>
          <Text style={[a.text_md, a.font_semi_bold]}>
            {CIVIC_TREE_LABELS.community}
          </Text>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {CIVIC_TREE_COPY.communityPublic}
          </Text>
        </View>
      </Pressable>
    </View>
  )
}

function MenuSection({
  title,
  action,
  isLoading,
  isError,
  onRetry,
  emptyText,
  isEmpty,
  children,
}: {
  title: string
  action?: {label: string; onPress: () => void}
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  emptyText: string
  isEmpty: boolean
  children: React.ReactNode
}) {
  const t = useTheme()
  const {_} = useLingui()

  return (
    <View
      style={[
        a.rounded_md,
        a.border,
        a.overflow_hidden,
        t.atoms.border_contrast_low,
        t.atoms.bg,
      ]}>
      <View
        style={[
          a.flex_row,
          a.align_center,
          a.justify_between,
          a.px_lg,
          a.py_md,
          t.atoms.bg_contrast_25,
        ]}>
        <Text style={[a.text_lg, a.font_bold]}>{title}</Text>
        {action ? (
          <Button
            label={action.label}
            size="tiny"
            color="primary_subtle"
            onPress={action.onPress}>
            <ButtonText>{action.label}</ButtonText>
          </Button>
        ) : null}
      </View>
      {isLoading ? (
        <View style={[a.p_lg, a.align_center]}>
          <Loader />
        </View>
      ) : isError ? (
        <View style={[a.p_lg, a.gap_sm, a.align_start]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            <Trans>Could not load this section.</Trans>
          </Text>
          <Button
            label={_(msg`Retry`)}
            size="tiny"
            color="secondary"
            onPress={onRetry}>
            <ButtonText>
              <Trans>Retry</Trans>
            </ButtonText>
          </Button>
        </View>
      ) : !isEmpty ? (
        <View>{children}</View>
      ) : (
        <Text style={[a.p_lg, a.text_sm, t.atoms.text_contrast_medium]}>
          {emptyText}
        </Text>
      )}
    </View>
  )
}

function SubHeading({text}: {text: string}) {
  const t = useTheme()
  return (
    <Text
      style={[
        a.px_lg,
        a.pt_md,
        a.pb_xs,
        a.text_xs,
        a.font_bold,
        t.atoms.text_contrast_medium,
      ]}>
      {text.toUpperCase()}
    </Text>
  )
}

function WikiRow({
  page,
  onPress,
}: {
  page: CommunityWikiPageView
  onPress: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={page.record.title}
      accessibilityHint=""
      onPress={onPress}
      style={({pressed}) => [
        a.flex_row,
        a.align_center,
        a.gap_sm,
        a.px_lg,
        a.py_md,
        a.border_t,
        t.atoms.border_contrast_low,
        pressed && t.atoms.bg_contrast_25,
      ]}>
      <Text style={[a.text_md]}>
        {page.record.kind === 'megathread' ? '🧵' : '📖'}
      </Text>
      <Text style={[a.flex_1, a.text_md, a.font_semi_bold]} numberOfLines={1}>
        {page.record.title}
      </Text>
      {page.record.pinned ? (
        <Text style={[a.text_xs, t.atoms.text_contrast_medium]}>📌</Text>
      ) : null}
    </Pressable>
  )
}

function ActivityList({activities}: {activities: CommunityActivityView[]}) {
  const {_} = useLingui()
  if (activities.length === 0) return null
  const now = new Date().toISOString()
  const isPast = (activity: CommunityActivityView) =>
    activity.record.status === 'completed' ||
    activity.record.status === 'cancelled' ||
    (activity.record.endsAt ?? activity.record.startsAt) < now
  const upcoming = activities.filter(activity => !isPast(activity))
  const past = activities.filter(isPast).reverse()
  return (
    <>
      {upcoming.length > 0 ? <SubHeading text={_(msg`Upcoming`)} /> : null}
      {upcoming.map(activity => (
        <ActivityRow key={activity.uri} activity={activity} />
      ))}
      {past.length > 0 ? <SubHeading text={_(msg`Past`)} /> : null}
      {past.map(activity => (
        <ActivityRow key={activity.uri} activity={activity} />
      ))}
    </>
  )
}

function ActivityRow({activity}: {activity: CommunityActivityView}) {
  const t = useTheme()
  const {_, i18n} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {record} = activity
  const meta = getActivityKindMeta(record.details?.$type)
  const status = ACTIVITY_STATUSES.find(s => s.value === record.status)
  const plan =
    activity.category === 'economic' ? activity.record.financialPlan : undefined

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={record.title}
      accessibilityHint={
        plan
          ? _(msg`Opens the activity and its public ledger`)
          : _(msg`Opens the activity`)
      }
      onPress={() =>
        navigation.navigate('CommunityActivity', {activityUri: activity.uri})
      }
      style={({pressed}) => [
        a.flex_row,
        a.gap_md,
        a.px_lg,
        a.py_md,
        a.border_t,
        t.atoms.border_contrast_low,
        pressed && t.atoms.bg_contrast_25,
      ]}>
      <Text style={[a.text_2xl]}>{meta.emoji}</Text>
      <View style={[a.flex_1, a.gap_2xs]}>
        <Text style={[a.text_md, a.font_semi_bold]} numberOfLines={2}>
          {record.title}
        </Text>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          {i18n._(meta.label)} ·{' '}
          {i18n.date(new Date(record.startsAt), {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          {status ? ` · ${i18n._(status.label)}` : ''}
        </Text>
        {plan ? (
          <Text style={[a.text_xs, {color: t.palette.positive_600}]}>
            {plan.fundingGoalMinor
              ? _(
                  msg`Open ledger · goal ${formatMinor(
                    plan.fundingGoalMinor,
                    plan.currency,
                  )}`,
                )
              : _(msg`Open ledger`)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
