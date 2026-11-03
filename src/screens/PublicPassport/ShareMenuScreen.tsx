import {View} from 'react-native'
import {plural} from '@lingui/core/macro'
import {Trans, useLingui} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {type PlatformNavigationProp as NavigationProp} from '#/lib/routes/types'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Toggle from '#/components/forms/Toggle'
import * as Layout from '#/components/Layout'
import {Loader} from '#/components/Loader'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'
import {
  isFlagOn,
  PASSPORT_SECTIONS,
  type PassportSectionId,
} from '#/features/publicPassport/sections'
import {
  type PassportData,
  usePassportData,
} from '#/features/publicPassport/usePassportData'
import {
  useParaIdentityQuery,
  useSetPassportFlagMutation,
} from '#/features/publicPassport/usePassportVisibility'

export function ShareMenuScreen() {
  const t = useTheme()
  const {t: l} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const {currentAccount} = useSession()
  const did = currentAccount?.did
  const identity = useParaIdentityQuery(did)
  const data = usePassportData(did)
  const setFlag = useSetPassportFlagMutation()
  const isPublicFigure = identity.data?.isVerifiedPublicFigure === true

  const copy = getSectionCopy(data, l)

  return (
    <Layout.Screen testID="passportShareScreen">
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
          <View style={[a.gap_xs]}>
            <Text style={[a.text_lg, a.font_semi_bold]}>
              <Trans>Choose what to share</Trans>
            </Text>
            <Text
              style={[a.text_md, a.leading_snug, t.atoms.text_contrast_medium]}>
              <Trans>
                People who open your passport see only the sections you turn on.
                Everything starts off.
              </Trans>
            </Text>
          </View>

          {identity.isLoading ? (
            <Loader size="lg" />
          ) : identity.isError ? (
            <View style={[a.gap_md]}>
              <Text>
                <Trans>Could not load your sharing choices.</Trans>
              </Text>
              <Button
                label={l`Retry`}
                color="primary"
                size="small"
                onPress={() => void identity.refetch()}>
                <ButtonText>
                  <Trans>Retry</Trans>
                </ButtonText>
              </Button>
            </View>
          ) : (
            <View
              style={[a.rounded_md, a.overflow_hidden, t.atoms.bg_contrast_25]}>
              {PASSPORT_SECTIONS.map(({id, flag}) => {
                const section = copy[id]
                const lockedByFigure =
                  isPublicFigure &&
                  isFlagOn(identity.data, flag) &&
                  (flag === 'publicVotes' ||
                    flag === 'publicRaq' ||
                    flag === 'publicHighlights')
                const unavailable = section.unavailable === true
                return (
                  <Toggle.Item
                    key={id}
                    name={id}
                    label={section.title}
                    value={isFlagOn(identity.data, flag)}
                    disabled={unavailable || lockedByFigure}
                    onChange={value =>
                      setFlag.mutate(
                        {flag, value},
                        {
                          onError: () =>
                            Toast.show(l`Could not save your choice`, {
                              type: 'error',
                            }),
                        },
                      )
                    }
                    style={[a.w_full, a.p_md, a.align_start]}>
                    <View style={[a.flex_1, a.gap_2xs]}>
                      <Toggle.LabelText>{section.title}</Toggle.LabelText>
                      <Text
                        style={[
                          a.text_sm,
                          a.leading_snug,
                          t.atoms.text_contrast_medium,
                        ]}>
                        {section.description}
                      </Text>
                      {section.status ? (
                        <Text
                          style={[
                            a.text_sm,
                            a.font_semi_bold,
                            t.atoms.text_contrast_high,
                          ]}>
                          {section.status}
                        </Text>
                      ) : null}
                      {lockedByFigure ? (
                        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                          <Trans>Always shown in Public Figure mode.</Trans>
                        </Text>
                      ) : null}
                    </View>
                    <Toggle.Platform />
                  </Toggle.Item>
                )
              })}
            </View>
          )}

          <Text
            style={[a.text_sm, a.leading_snug, t.atoms.text_contrast_medium]}>
            <Trans>
              PARA apps honor these choices. The records themselves are public
              in your repository, so anyone reading it directly can still find
              them.
            </Trans>
          </Text>

          <Button
            label={l`View public passport`}
            color="primary"
            size="large"
            disabled={!did}
            onPress={() => did && navigation.navigate('PublicPassport', {did})}>
            <ButtonText>
              <Trans>View public passport</Trans>
            </ButtonText>
          </Button>
        </View>
      </Layout.Content>
    </Layout.Screen>
  )
}

type SectionCopy = {
  title: string
  description: string
  status?: string
  unavailable?: boolean
}

function getSectionCopy(
  data: PassportData,
  l: ReturnType<typeof useLingui>['t'],
): Record<PassportSectionId, SectionCopy> {
  return {
    votes: {
      title: l`Votes`,
      description: l`Your ballots on cabildeos.`,
      status:
        data.votes.count === undefined
          ? undefined
          : plural(data.votes.count, {one: '# vote', other: '# votes'}),
    },
    delegations: {
      title: l`Delegated votes`,
      description: l`How many votes you have delegated, and whether each is active or passive.`,
      status:
        data.delegations.count === undefined
          ? undefined
          : plural(data.delegations.count, {
              one: '# delegation',
              other: '# delegations',
            }),
    },
    policies: {
      title: l`Policies you support`,
      description: l`How many policies you rated in favor.`,
      status:
        data.policies.count === undefined
          ? undefined
          : plural(data.policies.count, {
              one: '# policy supported',
              other: '# policies supported',
            }),
    },
    raq: {
      title: l`RAQ answers`,
      description: l`Your published compass result for each RAQ axis.`,
      status: plural(data.raq.axes.length, {
        one: '# axis published',
        other: '# axes published',
      }),
    },
    questions: {
      title: l`Questions`,
      description: l`Questions you proposed and open questions you asked, in your own words.`,
      status: plural(data.questions.texts.length, {
        one: '# question',
        other: '# questions',
      }),
    },
    activities: {
      title: l`Activities`,
      description: l`Activities you attended or took part in.`,
      status: l`Not available yet: PARA does not record attendance.`,
      unavailable: true,
    },
    highlights: {
      title: l`Highlights`,
      description: l`Passages you highlighted in public posts.`,
    },
  }
}
