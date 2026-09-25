import {useMemo} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {
  type CommunityActivityStatus,
  ECONOMIC_ACTIVITY_RAFFLE,
  ECONOMIC_ACTIVITY_SALE,
} from '#/lib/api/para-lexicons'
import {
  ACTIVITY_STATUSES,
  getActivityKindMeta,
  summarizeLedger,
} from '#/lib/community-activities'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {cleanError} from '#/lib/strings/errors'
import {
  type CommunityActivityView,
  type CommunityLedgerEntryView,
  type EconomicActivityView,
  type UpdateCommunityActivityInput,
  useCommunityActivityQuery,
  useUpdateCommunityActivityMutation,
} from '#/state/queries/community-activities'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Layout from '#/components/Layout'
import {InlineLinkText} from '#/components/Link'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {H1, Text} from '#/components/Typography'
import {ChoiceChips} from '#/features/communityActivities/components/ChoiceChips'
import {Card} from '#/features/communityActivities/components/detail/CardBits'
import {
  BusinessModelCard,
  EconomicTermsCard,
  LedgerCard,
  TransparencyCard,
} from '#/features/communityActivities/components/detail/EconomicCards'
import {SocialDetailsCard} from '#/features/communityActivities/components/detail/SocialDetailsCard'
import {ContributeToCommunityTreeDialog} from '#/features/communityCivicTree/components/ContributeToCommunityTreeDialog'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'CommunityActivity'>

export function CommunityActivityScreen({route}: Props) {
  const {_, i18n} = useLingui()
  const t = useTheme()
  const {activityUri} = route.params
  const {currentAccount} = useSession()
  const query = useCommunityActivityQuery(activityUri)
  const activity = query.data?.activity
  const ledger = query.data?.ledger
  const isOrganizer = Boolean(
    activity && currentAccount?.did === activity.authorDid,
  )
  const treeDialog = Dialog.useDialogControl()

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {activity?.category === 'economic' ? (
              <Trans>Economic activity</Trans>
            ) : (
              <Trans>Civic activity</Trans>
            )}
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Center style={styles.center}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled">
          {query.isLoading ? (
            <View style={[a.p_lg, a.align_center]}>
              <Loader size="lg" />
            </View>
          ) : !activity || !ledger ? (
            <View style={[a.gap_md, a.align_start]}>
              <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                {query.error
                  ? cleanError(query.error)
                  : _(msg`This activity could not be found.`)}
              </Text>
              <Button
                label={_(msg`Retry`)}
                size="small"
                color="secondary"
                onPress={() => void query.refetch()}>
                <ButtonText>
                  <Trans>Retry</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : (
            <View style={[a.gap_lg]}>
              <Overview activity={activity} />
              {isOrganizer ? <StatusControl activity={activity} /> : null}
              {activity.category === 'social' ? (
                <SocialDetailsCard
                  activity={activity}
                  isOrganizer={isOrganizer}
                />
              ) : (
                <EconomicSections
                  activity={activity}
                  ledger={ledger}
                  isOrganizer={isOrganizer}
                />
              )}
              <Button
                label={_(msg`Add this activity to the community civic tree`)}
                size="large"
                color="secondary"
                onPress={treeDialog.open}>
                <ButtonText>
                  <Trans>Add to civic tree</Trans>
                </ButtonText>
              </Button>
              <ContributeToCommunityTreeDialog
                control={treeDialog}
                sourceUri={activity.uri}
                title={activity.record.title}
                category={i18n._(
                  getActivityKindMeta(activity.record.details?.$type).label,
                )}
                defaultSourceType="event"
              />
            </View>
          )}
        </ScrollView>
      </Layout.Center>
    </Layout.Screen>
  )
}

function EconomicSections({
  activity,
  ledger,
  isOrganizer,
}: {
  activity: EconomicActivityView
  ledger: CommunityLedgerEntryView[]
  isOrganizer: boolean
}) {
  const {_} = useLingui()
  const summary = useMemo(
    () =>
      summarizeLedger(
        activity.record,
        ledger.map(entry => entry.record),
      ),
    [activity.record, ledger],
  )
  const kind = activity.record.details.$type
  const unitLabel =
    kind === ECONOMIC_ACTIVITY_RAFFLE
      ? _(msg`tickets sold`)
      : kind === ECONOMIC_ACTIVITY_SALE
        ? _(msg`units sold`)
        : undefined

  return (
    <>
      <EconomicTermsCard activity={activity} isOrganizer={isOrganizer} />
      <BusinessModelCard activity={activity} />
      <TransparencyCard summary={summary} unitLabel={unitLabel} />
      <LedgerCard
        activity={activity}
        ledger={ledger}
        isOrganizer={isOrganizer}
      />
    </>
  )
}

function Overview({activity}: {activity: CommunityActivityView}) {
  const t = useTheme()
  const {i18n} = useLingui()
  const {record} = activity
  const meta = getActivityKindMeta(record.details?.$type)
  const status = ACTIVITY_STATUSES.find(s => s.value === record.status)
  const {data: organizer} = useProfileQuery({did: activity.authorDid})
  const fmt = (iso: string) =>
    i18n.date(new Date(iso), {dateStyle: 'full', timeStyle: 'short'})

  return (
    <Card>
      <Text style={[a.text_sm, a.font_semi_bold, t.atoms.text_contrast_medium]}>
        {meta.emoji} {i18n._(meta.label)}
        {status ? ` · ${i18n._(status.label)}` : ''}
      </Text>
      <H1 style={[a.text_2xl, a.font_bold]}>{record.title}</H1>
      <View style={[a.gap_xs]}>
        <Text style={[a.text_sm]}>🗓 {fmt(record.startsAt)}</Text>
        {record.endsAt ? (
          <Text style={[a.text_sm]}>
            <Trans>Until {fmt(record.endsAt)}</Trans>
          </Text>
        ) : null}
        {record.location ? (
          <Text style={[a.text_sm]}>📍 {record.location}</Text>
        ) : null}
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            Organized by{' '}
            {organizer?.handle ? `@${organizer.handle}` : activity.authorDid}
          </Trans>
        </Text>
      </View>
      {record.description ? (
        <Text style={[a.text_md, a.leading_snug]}>{record.description}</Text>
      ) : null}
      {record.links?.map(link => (
        <InlineLinkText key={link} to={link} label={link}>
          {link}
        </InlineLinkText>
      ))}
    </Card>
  )
}

function StatusControl({activity}: {activity: CommunityActivityView}) {
  const {_, i18n} = useLingui()
  const update = useUpdateCommunityActivityMutation()
  const onChange = (status: CommunityActivityStatus) => {
    // Spelled out per category so the union narrows for the mutation input.
    const input: UpdateCommunityActivityInput =
      activity.category === 'social'
        ? {activity, changes: {status}}
        : {activity, changes: {status}}
    update.mutate(input, {
      onError: err => Toast.show(cleanError(err), {type: 'error'}),
    })
  }
  return (
    <Card title={_(msg`Status`)}>
      <ChoiceChips
        label={_(msg`Activity status`)}
        value={activity.record.status}
        onChange={onChange}
        options={ACTIVITY_STATUSES.map(s => ({
          value: s.value,
          label: i18n._(s.label),
        }))}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  center: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 100},
})
