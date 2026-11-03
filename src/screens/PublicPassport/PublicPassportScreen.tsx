import {View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {
  type CommonNavigatorParams,
  type PlatformNavigationProp as NavigationProp,
} from '#/lib/routes/types'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {
  isFlagOn,
  PASSPORT_SECTIONS,
  type PassportSectionId,
} from '#/features/publicPassport/sections'
import {usePassportData} from '#/features/publicPassport/usePassportData'
import {useParaIdentityQuery} from '#/features/publicPassport/usePassportVisibility'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'PublicPassport'>

export function PublicPassportScreen({route}: Props) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const {did} = route.params
  const isMe = did === currentAccount?.did
  const profile = useProfileQuery({did})
  const identity = useParaIdentityQuery(did)
  const data = usePassportData(did)

  const shown = PASSPORT_SECTIONS.filter(
    ({flag}) => flag !== 'publicActivities' && isFlagOn(identity.data, flag),
  )
  const name = profile.data?.displayName || profile.data?.handle

  return (
    <Layout.Screen testID="publicPassportScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Public passport</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <View style={[a.p_lg, a.gap_lg]}>
          {name ? (
            <Text style={[a.text_xl, a.font_bold]} emoji>
              {name}
            </Text>
          ) : null}

          {isMe ? (
            <View
              style={[a.p_md, a.rounded_md, a.gap_sm, t.atoms.bg_contrast_25]}>
              <Text style={[a.text_sm, a.leading_snug]}>
                <Trans>
                  This is what other people see. Sections you keep off are not
                  shown.
                </Trans>
              </Text>
              <Button
                label={l`Choose what to share`}
                color="secondary"
                size="small"
                onPress={() => navigation.navigate('PassportShare')}>
                <ButtonText>
                  <Trans>Choose what to share</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : null}

          {identity.isLoading ? (
            <Loader size="lg" />
          ) : identity.isError ? (
            <Button
              label={l`Retry`}
              color="primary"
              size="small"
              onPress={() => void identity.refetch()}>
              <ButtonText>
                <Trans>Retry</Trans>
              </ButtonText>
            </Button>
          ) : shown.length === 0 ? (
            <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
              {isMe ? (
                <Trans>You are not sharing anything yet.</Trans>
              ) : (
                <Trans>This person has not shared anything yet.</Trans>
              )}
            </Text>
          ) : (
            shown.map(({id}) => (
              <SectionCard key={id} id={id} did={did} data={data} />
            ))
          )}
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

function SectionCard({
  id,
  did,
  data,
}: {
  id: PassportSectionId
  did: string
  data: ReturnType<typeof usePassportData>
}) {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const profile = useProfileQuery({did})

  let title = ''
  let body: React.ReactNode = null
  let loading = false
  let failed = false

  switch (id) {
    case 'votes':
      title = l`Votes`
      loading = data.votes.isLoading
      failed = data.votes.isError
      body = (
        <>
          <Text>
            {plural(data.votes.count ?? 0, {
              one: '# vote cast',
              other: '# votes cast',
            })}
          </Text>
          <Button
            label={l`See votes`}
            color="secondary"
            size="small"
            onPress={() => navigation.navigate('SeeVotes', {did})}>
            <ButtonText>
              <Trans>See votes</Trans>
            </ButtonText>
          </Button>
        </>
      )
      break
    case 'delegations': {
      title = l`Delegated votes`
      loading = data.delegations.isLoading
      failed = data.delegations.isError
      const total = data.delegations.count ?? 0
      const active = data.delegations.activeCount ?? 0
      body = (
        <Text>
          {plural(total, {one: '# delegation', other: '# delegations'})}
          {total > 0
            ? ` (${plural(active, {one: '# active', other: '# active'})}, ${total - active} passive)`
            : ''}
        </Text>
      )
      break
    }
    case 'policies':
      title = l`Policies supported`
      loading = data.policies.isLoading
      failed = data.policies.isError
      body = (
        <Text>
          {plural(data.policies.count ?? 0, {
            one: '# policy supported',
            other: '# policies supported',
          })}
        </Text>
      )
      break
    case 'raq':
      title = l`RAQ answers`
      loading = data.raq.isLoading
      failed = data.raq.isError
      body =
        data.raq.axes.length === 0 ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>No RAQ results published.</Trans>
          </Text>
        ) : (
          data.raq.axes.map(axis => <Text key={axis}>{axis}</Text>)
        )
      break
    case 'questions':
      title = l`Questions`
      loading = data.questions.isLoading
      failed = data.questions.isError
      body =
        data.questions.texts.length === 0 ? (
          <Text style={t.atoms.text_contrast_medium}>
            <Trans>No questions yet.</Trans>
          </Text>
        ) : (
          data.questions.texts.map((text, index) => (
            <Text key={`${index}:${text}`} emoji>
              {text}
            </Text>
          ))
        )
      break
    case 'highlights':
      title = l`Highlights`
      body = (
        <Button
          label={l`See highlights on profile`}
          color="secondary"
          size="small"
          disabled={!profile.data?.handle}
          onPress={() =>
            navigation.navigate('Profile', {name: profile.data?.handle ?? did})
          }>
          <ButtonText>
            <Trans>See highlights on profile</Trans>
          </ButtonText>
        </Button>
      )
      break
    case 'activities':
      return null
  }

  return (
    <View style={[a.p_md, a.rounded_md, a.gap_sm, t.atoms.bg_contrast_25]}>
      <Text style={[a.text_md, a.font_semi_bold]}>{title}</Text>
      {loading ? (
        <Loader size="md" />
      ) : failed ? (
        <Text style={t.atoms.text_contrast_medium}>
          <Trans>Could not load this section.</Trans>
        </Text>
      ) : (
        body
      )}
    </View>
  )
}
