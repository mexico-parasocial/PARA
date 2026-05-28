import {useCallback, useState} from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useFocusEffect} from '@react-navigation/native'

import {
  POLITICAL_AFFILIATION_OPTIONS,
  POLITICAL_AFFILIATION_TYPE_LABELS,
  type PoliticalAffiliation,
  type PoliticalAffiliationType,
  upsertPoliticalAffiliation,
} from '#/lib/political-affiliations'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {
  BADGE_INFO,
  usePoliticalAffiliation,
} from '#/state/shell/political-affiliation'
import * as SettingsList from '#/screens/Settings/components/SettingsList'
import {atoms as a, useTheme} from '#/alf'
import {
  AffiliationChangeModal,
  useAffiliationChangeGuard,
} from '#/components/AffiliationChangeModal'
import {ColorStack} from '#/components/AvatarStack'
import {Check_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {TimesLarge_Stroke2_Corner0_Rounded as XIcon} from '#/components/icons/Times'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<
  CommonNavigatorParams,
  'PoliticalAffiliation'
>

export function PoliticalAffiliationScreen({}: Props) {
  const t = useTheme()
  const {_} = useLingui()
  const {
    affiliations,
    setAffiliations,
    isLoading,
    canChangeAffiliation,
    recordCooldown,
    getCooldownRemaining,
  } = usePoliticalAffiliation()
  const [localAffiliations, setLocalAffiliations] = useState<
    PoliticalAffiliation[]
  >([])
  const [showInfoFor, setShowInfoFor] =
    useState<PoliticalAffiliationType | null>(null)
  const guard = useAffiliationChangeGuard()

  useFocusEffect(
    useCallback(() => {
      setLocalAffiliations(affiliations)
    }, [affiliations]),
  )

  const formatCooldown = (ms: number) => {
    const hours = Math.ceil(ms / (1000 * 60 * 60))
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remHours = hours % 24
      return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`
    }
    return `${hours}h`
  }

  const handleSelect = async (option: PoliticalAffiliation) => {
    const existing = localAffiliations.find(item => item.type === option.type)
    const isSame = existing?.id === option.id

    // If clearing (toggling off same item), no cooldown needed
    if (isSame) {
      const next = localAffiliations.filter(item => item.type !== option.type)
      setLocalAffiliations(next)
      await setAffiliations(next)
      Toast.show(`${POLITICAL_AFFILIATION_TYPE_LABELS[option.type]} cleared`)
      return
    }

    // Check cooldown
    if (!canChangeAffiliation(option.type)) {
      const remaining = getCooldownRemaining(option.type)
      const timeText = remaining ? formatCooldown(remaining) : 'soon'
      Toast.show(_(msg`Cooldown active: ${timeText} remaining`))
      return
    }

    // Show guard modal
    guard.requestChange(option.type, async () => {
      const next = upsertPoliticalAffiliation(localAffiliations, option)
      setLocalAffiliations(next)
      await setAffiliations(next)
      await recordCooldown(option.type)
      Toast.show(
        `${POLITICAL_AFFILIATION_TYPE_LABELS[option.type]} set to ${option.name}`,
      )
    })
  }

  const handleClearAll = async () => {
    setLocalAffiliations([])
    await setAffiliations([])
    Toast.show(_(msg`Political affiliations cleared`))
  }

  const isSelected = (option: PoliticalAffiliation) =>
    localAffiliations.some(item => item.id === option.id)

  const getCooldownForType = (type: PoliticalAffiliationType) => {
    const remaining = getCooldownRemaining(type)
    if (!remaining) return null
    return formatCooldown(remaining)
  }

  if (isLoading) {
    return (
      <View style={[a.flex_1, a.align_center, a.justify_center]}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Political Affiliation</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <Layout.Content>
        <ScrollView>
          <SettingsList.Container>
            {/* Info banner */}
            <View style={[a.px_lg, a.py_md]}>
              <Text
                style={[
                  a.text_sm,
                  a.leading_snug,
                  t.atoms.text_contrast_medium,
                ]}>
                <Trans>
                  Save up to one affiliation per type: one party, one 9th, and
                  one 25th. Your selections are stored locally on this device.
                  Changes are protected by cooldown periods to prevent identity
                  manipulation.
                </Trans>
              </Text>
            </View>

            <SettingsList.Divider />

            {/* Current selection */}
            <View style={[a.px_lg, a.py_md, a.gap_sm]}>
              <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_low]}>
                <Trans>Current Selection</Trans>
              </Text>
              {localAffiliations.length > 0 ? (
                <View style={[a.flex_row, a.align_center, a.gap_sm]}>
                  <ColorStack
                    items={localAffiliations.map(item => ({
                      id: item.id,
                      color: item.color,
                    }))}
                    size={22}
                  />
                  <View style={[a.gap_2xs, a.flex_1]}>
                    {localAffiliations.map(item => (
                      <Text key={item.id} style={[a.text_sm, t.atoms.text]}>
                        {POLITICAL_AFFILIATION_TYPE_LABELS[item.type]}:{' '}
                        {item.name}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
                  <Trans>No affiliations selected</Trans>
                </Text>
              )}
            </View>

            <SettingsList.Divider />

            {/* Badge info cards */}
            <View style={[a.px_lg, a.py_md, a.gap_md]}>
              <Text style={[a.text_xs, a.font_bold, t.atoms.text_contrast_low]}>
                <Trans>About Your Badges</Trans>
              </Text>
              {(Object.keys(BADGE_INFO) as PoliticalAffiliationType[]).map(
                type => {
                  const info = BADGE_INFO[type]
                  const cooldown = getCooldownForType(type)
                  return (
                    <TouchableOpacity
                      key={type}
                      accessibilityRole="button"
                      style={[
                        styles.infoCard,
                        t.atoms.bg_contrast_25,
                        t.atoms.border_contrast_low,
                      ]}
                      onPress={() => setShowInfoFor(type)}>
                      <View style={styles.infoCardHeader}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            {backgroundColor: info.color + '20'},
                          ]}>
                          <View
                            style={[
                              styles.infoCardDot,
                              {backgroundColor: info.color},
                            ]}
                          />
                        </View>
                        <View style={a.flex_1}>
                          <Text style={[a.text_sm, a.font_bold, t.atoms.text]}>
                            {info.name}
                          </Text>
                          <Text
                            style={[a.text_2xs, t.atoms.text_contrast_medium]}>
                            {type === 'party'
                              ? '7 day cooldown'
                              : '48 hour cooldown'}
                            {cooldown ? ` • ${cooldown} remaining` : ''}
                          </Text>
                        </View>
                        <XIcon size="sm" style={t.atoms.text_contrast_medium} />
                      </View>
                    </TouchableOpacity>
                  )
                },
              )}
            </View>

            <SettingsList.Divider />

            {/* Clear all */}
            <SettingsList.PressableItem
              label={_(msg`Clear all affiliations`)}
              onPress={() => void handleClearAll()}>
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#888888',
                  marginRight: 8,
                }}
              />
              <SettingsList.ItemText style={[a.flex_1]}>
                <Trans>None (Clear all affiliations)</Trans>
              </SettingsList.ItemText>
              {localAffiliations.length === 0 && (
                <CheckIcon size="md" style={[t.atoms.text]} />
              )}
            </SettingsList.PressableItem>

            <SettingsList.Divider />

            {/* Options by type */}
            {(
              Object.entries(POLITICAL_AFFILIATION_OPTIONS) as Array<
                [PoliticalAffiliationType, PoliticalAffiliation[]]
              >
            ).map(([type, options], sectionIndex) => {
              const cooldown = getCooldownForType(type)

              return (
                <View key={type} style={[a.py_sm]}>
                  <View
                    style={[
                      a.px_lg,
                      a.py_sm,
                      a.flex_row,
                      a.align_center,
                      a.gap_sm,
                    ]}>
                    <Text
                      style={[
                        a.text_xs,
                        a.font_bold,
                        t.atoms.text_contrast_low,
                      ]}>
                      {POLITICAL_AFFILIATION_TYPE_LABELS[type].toUpperCase()}
                    </Text>
                    {cooldown && (
                      <View
                        style={[
                          styles.cooldownBadge,
                          {backgroundColor: t.palette.negative_500 + '20'},
                        ]}>
                        <Text
                          style={[
                            a.text_2xs,
                            a.font_bold,
                            {color: t.palette.negative_500},
                          ]}>
                          ⏳ {cooldown}
                        </Text>
                      </View>
                    )}
                  </View>
                  {options.map(option => (
                    <SettingsList.PressableItem
                      key={option.id}
                      label={option.name}
                      onPress={() => void handleSelect(option)}>
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: option.color,
                          marginRight: 8,
                        }}
                      />
                      <SettingsList.ItemText style={[a.flex_1]}>
                        {option.name}
                      </SettingsList.ItemText>
                      {isSelected(option) && (
                        <CheckIcon size="md" style={[t.atoms.text]} />
                      )}
                    </SettingsList.PressableItem>
                  ))}
                  {sectionIndex <
                  Object.keys(POLITICAL_AFFILIATION_OPTIONS).length - 1 ? (
                    <SettingsList.Divider />
                  ) : null}
                </View>
              )
            })}
          </SettingsList.Container>
        </ScrollView>
      </Layout.Content>

      {/* Guard modal */}
      {guard.pendingChange && (
        <AffiliationChangeModal
          type={guard.pendingChange.type}
          onConfirm={guard.confirm}
          onCancel={guard.cancel}
        />
      )}

      {/* Info modal */}
      {showInfoFor && (
        <AffiliationChangeModal
          type={showInfoFor}
          onConfirm={() => setShowInfoFor(null)}
          onCancel={() => setShowInfoFor(null)}
        />
      )}
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  cooldownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
})
