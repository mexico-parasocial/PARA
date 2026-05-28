import {useMemo, useState} from 'react'
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'

import {
  type CabildeoDelegationMode,
  type CabildeoDelegationSignal,
} from '#/lib/api/cabildeo'
import {fromCabildeoRouteParam} from '#/lib/cabildeo-client'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
} from '#/lib/routes/types'
import {
  useCabildeoQuery,
  useDelegateCabildeoVoteMutation,
  useDelegationCandidatesQuery,
} from '#/state/queries/cabildeo'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {ListMaybePlaceholder} from '#/components/Lists'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'DelegateVote'>
const SIGNALS: CabildeoDelegationSignal[] = [-3, -2, -1, 0, 1, 2, 3]

/**
 * Calculate quadratic voting power: √(N+1)
 * +1 because the representative also votes for themselves
 */
function calcQuadraticPower(delegationCount: number): number {
  return Math.sqrt(delegationCount + 1)
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value)}%`
}

export function DelegateVoteScreen({route, navigation}: Props) {
  const t = useTheme()
  const cabildeoUri = fromCabildeoRouteParam(route.params.cabildeoUri)
  const {
    data: cabildeo = null,
    isFetched,
    isLoading,
    isError,
    refetch,
  } = useCabildeoQuery(cabildeoUri)
  const {
    data: candidates = [],
    isLoading: isCandidatesLoading,
    isError: isCandidatesError,
    refetch: refetchCandidates,
  } = useDelegationCandidatesQuery({
    cabildeoUri,
    communityId: cabildeo?.community,
  })
  const delegateMutation = useDelegateCabildeoVoteMutation()

  const [cessionMode, setCessionMode] =
    useState<CabildeoDelegationMode>('active')
  const [selectedRep, setSelectedRep] = useState<string | null>(null)
  const [preferredOption, setPreferredOption] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [signal, setSignal] = useState<CabildeoDelegationSignal | null>(null)
  const [passiveParty, setPassiveParty] = useState('')
  const [passiveMatter, setPassiveMatter] = useState('')
  const [passiveCommunity, setPassiveCommunity] = useState('')
  const [activeFlairs, setActiveFlairs] = useState<string[]>([])

  const activeCriteriaCount =
    (preferredOption !== null ? 1 : 0) +
    (reason.trim().length > 0 ? 1 : 0) +
    (signal !== null ? 1 : 0)
  const canSubmitActive = Boolean(selectedRep) && activeCriteriaCount >= 2
  const canSubmitPassive =
    passiveParty.trim().length > 0 &&
    passiveMatter.trim().length > 0 &&
    passiveCommunity.trim().length > 0
  const canSubmitCession =
    cessionMode === 'active' ? canSubmitActive : canSubmitPassive

  const handleCede = async () => {
    if (!canSubmitCession) return
    try {
      await delegateMutation.mutateAsync({
        cabildeoUri: cessionMode === 'active' ? cabildeoUri : undefined,
        delegateTo:
          cessionMode === 'active' ? selectedRep || undefined : undefined,
        mode: cessionMode,
        preferredOption: preferredOption ?? undefined,
        reason: reason.trim() || undefined,
        signal: signal ?? undefined,
        party: cessionMode === 'passive' ? passiveParty.trim() : undefined,
        community:
          cessionMode === 'passive'
            ? passiveCommunity.trim()
            : cabildeo?.community,
        scopeFlairs:
          cessionMode === 'passive' && passiveMatter.trim()
            ? [passiveMatter.trim()]
            : activeFlairs.length > 0
              ? activeFlairs
              : cabildeo?.flairs,
      })
    } catch {
      // Error state is rendered from the mutation below.
    }
  }

  const selectedRepData = useMemo(
    () => candidates.find(r => r.did === selectedRep),
    [candidates, selectedRep],
  )
  const delegationTotal = useMemo(
    () =>
      candidates.reduce(
        (total, candidate) => total + candidate.activeDelegationCount,
        0,
      ),
    [candidates],
  )
  const directVoteTotal = cabildeo?.voteTotals.direct ?? 0
  const delegatedParticipationPct =
    delegationTotal + directVoteTotal > 0
      ? (delegationTotal / (delegationTotal + directVoteTotal)) * 100
      : 0
  const suggestedCandidates = useMemo(() => {
    return [...candidates]
      .sort((a, b) => {
        if (a.hasVoted !== b.hasVoted) return a.hasVoted ? -1 : 1
        const delegationDelta =
          b.activeDelegationCount - a.activeDelegationCount
        if (delegationDelta !== 0) return delegationDelta
        return (a.displayName || a.handle || a.did).localeCompare(
          b.displayName || b.handle || b.did,
        )
      })
      .slice(0, 3)
  }, [candidates])
  const hasDelegated =
    Boolean(cabildeo?.userContext?.hasDelegatedTo) || delegateMutation.isSuccess

  if (!cabildeo && (isLoading || !isFetched || isError)) {
    return (
      <Layout.Screen testID="delegateVoteScreen">
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Ceder mi voto</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={isLoading || !isFetched}
          isError={isError}
          onRetry={refetch}
          emptyType="page"
          emptyMessage="Estamos cargando el cabildeo para cesión."
        />
      </Layout.Screen>
    )
  }

  if (!cabildeo) {
    return (
      <Layout.Screen testID="delegateVoteScreen">
        <Layout.Header.Outer noBottomBorder>
          <Layout.Header.BackButton />
          <Layout.Header.Content>
            <Layout.Header.TitleText>
              <Trans>Ceder mi voto</Trans>
            </Layout.Header.TitleText>
          </Layout.Header.Content>
        </Layout.Header.Outer>
        <ListMaybePlaceholder
          isLoading={false}
          isError={false}
          emptyType="page"
          emptyTitle="Cabildeo no disponible"
          emptyMessage="No se puede ceder porque este cabildeo ya no está disponible."
        />
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen testID="delegateVoteScreen">
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Ceder mi voto</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            {cabildeo.community}
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}>
        <Layout.Center style={styles.center}>
          {/* Explainer */}
          <View
            style={[
              styles.explainer,
              {
                backgroundColor: '#FF9500' + '10',
                borderColor: '#FF9500' + '30',
              },
            ]}>
            <Text style={[styles.explainerTitle, {color: '#FF9500'}]}>
              √ Votación Cuadrática
            </Text>
            <Text style={[styles.explainerText, t.atoms.text_contrast_medium]}>
              Tu voto directo vale{' '}
              <Text style={[{fontWeight: '900'}, t.atoms.text]}>1.0</Text>.
              {'\n'}Cuando muchas personas ceden a la misma voz, su poder crece
              más lento como{' '}
              <Text style={[{fontWeight: '900'}, t.atoms.text]}>√N</Text> — esto
              evita que una sola voz acumule poder ilimitado.
            </Text>
          </View>

          {/* Power Comparison Visual */}
          <View style={[styles.powerComparison, t.atoms.bg_contrast_25]}>
            <Text style={[styles.powerTitle, t.atoms.text]}>
              Cesión en este cabildeo
            </Text>
            <View style={styles.powerRow}>
              <View style={styles.powerItem}>
                <Text style={[styles.powerValue, {color: '#34C759'}]}>
                  {delegationTotal}
                </Text>
                <Text style={[styles.powerLabel, t.atoms.text_contrast_medium]}>
                  votos cedidos
                </Text>
              </View>
              <View
                style={[
                  styles.powerDivider,
                  {backgroundColor: t.palette.contrast_100},
                ]}
              />
              <View style={styles.powerItem}>
                <Text style={[styles.powerValue, {color: '#FF9500'}]}>
                  {formatPercent(delegatedParticipationPct)}
                </Text>
                <Text style={[styles.powerLabel, t.atoms.text_contrast_medium]}>
                  participación cedida
                </Text>
              </View>
              <View
                style={[
                  styles.powerDivider,
                  {backgroundColor: t.palette.contrast_100},
                ]}
              />
              <View style={styles.powerItem}>
                <Text style={[styles.powerValue, {color: '#AF52DE'}]}>
                  {selectedRepData
                    ? (
                        (1.0 /
                          calcQuadraticPower(
                            selectedRepData.activeDelegationCount,
                          )) *
                        100
                      ).toFixed(0) + '%'
                    : '—'}
                </Text>
                <Text style={[styles.powerLabel, t.atoms.text_contrast_medium]}>
                  Tu peso relativo
                </Text>
              </View>
            </View>

            {/* √N Visual Scale */}
            <View style={styles.scaleContainer}>
              {[1, 4, 9, 16, 25, 36, 49].map(n => {
                const power = Math.sqrt(n)
                const barHeight = (power / 7) * 60
                const isHighlighted =
                  selectedRepData &&
                  Math.abs(selectedRepData.activeDelegationCount + 1 - n) < 5

                return (
                  <View key={n} style={styles.scaleItem}>
                    <View
                      style={[
                        styles.scaleBar,
                        {
                          height: barHeight,
                          backgroundColor: isHighlighted
                            ? '#FF9500'
                            : t.palette.contrast_200,
                        },
                      ]}
                    />
                    <Text style={[styles.scaleN, t.atoms.text_contrast_medium]}>
                      {n}
                    </Text>
                    <Text
                      style={[
                        styles.scalePower,
                        {
                          color: isHighlighted
                            ? '#FF9500'
                            : t.palette.contrast_300,
                        },
                      ]}>
                      √{power.toFixed(1)}
                    </Text>
                  </View>
                )
              })}
            </View>
            <Text style={[styles.scaleCaption, t.atoms.text_contrast_medium]}>
              N cesiones → √N poder efectivo
            </Text>
          </View>

          <View style={styles.modeTabs}>
            {[
              {key: 'active' as const, label: 'Cesión activa'},
              {key: 'passive' as const, label: 'Cesión pasiva'},
            ].map(mode => {
              const selected = cessionMode === mode.key
              return (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={mode.key}
                  onPress={() => setCessionMode(mode.key)}
                  style={[
                    styles.modeTab,
                    selected
                      ? {backgroundColor: t.palette.primary_500}
                      : t.atoms.bg_contrast_25,
                  ]}>
                  <Text
                    style={[
                      styles.modeTabText,
                      selected ? {color: '#fff'} : t.atoms.text,
                    ]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Representative Selection */}
          <Text style={[styles.sectionTitle, t.atoms.text]}>
            {cessionMode === 'active'
              ? 'Elegir voz receptora'
              : 'Configurar regla pasiva'}
          </Text>

          {hasDelegated ? (
            <View
              style={[
                styles.delegatedConfirm,
                {borderColor: '#34C759' + '40'},
              ]}>
              <Text style={[styles.delegatedTitle, {color: '#34C759'}]}>
                ✅ Voto cedido exitosamente
              </Text>
              <Text style={[styles.delegatedSub, t.atoms.text_contrast_medium]}>
                {(selectedRepData?.displayName ||
                  selectedRepData?.handle ||
                  cabildeo.userContext?.hasDelegatedTo) ??
                  'Tu voz receptora'}{' '}
                podrá votar por ti.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={[styles.revokeButton, {borderColor: '#FF3B30' + '40'}]}>
                <Text style={[styles.revokeText, {color: '#FF3B30'}]}>
                  Volver al cabildeo
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {cessionMode === 'passive' ? (
                <View
                  style={[
                    styles.passiveCard,
                    t.atoms.bg_contrast_25,
                    {borderColor: t.palette.primary_200},
                  ]}>
                  <Text style={[styles.passiveTitle, t.atoms.text]}>
                    Ceder automáticamente
                  </Text>
                  <Text
                    style={[styles.passiveSub, t.atoms.text_contrast_medium]}>
                    Define cuándo tu voto fluye por criterio político. Esta
                    regla aplica cuando no eliges una persona específica.
                  </Text>
                  <TextInput
                    accessibilityRole="text"
                    style={[styles.input, t.atoms.bg, t.atoms.text]}
                    placeholder="Partido o movimiento"
                    placeholderTextColor={t.palette.contrast_500}
                    value={passiveParty}
                    onChangeText={setPassiveParty}
                  />
                  <TextInput
                    accessibilityRole="text"
                    style={[styles.input, t.atoms.bg, t.atoms.text]}
                    placeholder="Materia, ej. educación"
                    placeholderTextColor={t.palette.contrast_500}
                    value={passiveMatter}
                    onChangeText={setPassiveMatter}
                  />
                  <TextInput
                    accessibilityRole="text"
                    style={[styles.input, t.atoms.bg, t.atoms.text]}
                    placeholder={`Comunidad, ej. ${cabildeo.community}`}
                    placeholderTextColor={t.palette.contrast_500}
                    value={passiveCommunity}
                    onChangeText={setPassiveCommunity}
                  />
                  <Text
                    style={[
                      styles.passiveExample,
                      t.atoms.text_contrast_medium,
                    ]}>
                    Ejemplo: En {passiveMatter || 'educación'} dentro de{' '}
                    {passiveCommunity || cabildeo.community}, cedo mi voto al
                    criterio de {passiveParty || 'mi partido'}.
                  </Text>
                </View>
              ) : isCandidatesLoading || isCandidatesError ? (
                <ListMaybePlaceholder
                  isLoading={isCandidatesLoading}
                  isError={isCandidatesError}
                  onRetry={refetchCandidates}
                  emptyType="results"
                  emptyMessage="Estamos buscando voces receptoras disponibles para este cabildeo."
                />
              ) : candidates.length === 0 ? (
                <ListMaybePlaceholder
                  isLoading={false}
                  isError={false}
                  emptyType="results"
                  emptyTitle="No hay voces receptoras disponibles"
                  emptyMessage="Esta comunidad todavía no tiene representantes o miembros con roles para ceder voto."
                />
              ) : (
                <View style={styles.repList}>
                  {/* Flair selection for active delegation */}
                  <View style={[a.mb_md, a.px_sm]}>
                    <Text style={[a.font_bold, a.mb_xs]}>Alcance de la cesión</Text>
                    <View style={[a.flex_row, a.flex_wrap, a.gap_xs]}>
                      <TouchableOpacity accessibilityRole="button"
                        onPress={() => setActiveFlairs([])}
                        style={[
                          styles.filterPill,
                          activeFlairs.length === 0 && {backgroundColor: t.palette.primary_500},
                          t.atoms.bg_contrast_25,
                        ]}>
                        <Text style={[activeFlairs.length === 0 ? {color: 'white'} : t.atoms.text, {fontSize: 12}]}>
                          Este cabildeo
                        </Text>
                      </TouchableOpacity>
                      {cabildeo.flairs?.map(f => {
                        const isSelected = activeFlairs.includes(f)
                        return (
                          <TouchableOpacity accessibilityRole="button"
                            key={f}
                            onPress={() => {
                              if (isSelected) {
                                setActiveFlairs(activeFlairs.filter(x => x !== f))
                              } else {
                                setActiveFlairs([...activeFlairs, f])
                              }
                            }}
                            style={[
                              styles.filterPill,
                              isSelected && {backgroundColor: t.palette.primary_500},
                              t.atoms.bg_contrast_25,
                            ]}>
                            <Text style={[isSelected ? {color: 'white'} : t.atoms.text, {fontSize: 12}]}>
                              Todo en "{f}"
                            </Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  </View>
                  {suggestedCandidates.length ? (
                    <View
                      style={[
                        styles.suggestions,
                        t.atoms.bg_contrast_25,
                        {borderColor: t.palette.primary_200},
                      ]}>
                      <Text style={[styles.suggestionsTitle, t.atoms.text]}>
                        Sugerencias para ceder
                      </Text>
                      <Text
                        style={[
                          styles.suggestionsSub,
                          t.atoms.text_contrast_medium,
                        ]}>
                        Prioriza representantes que ya votaron y quienes
                        concentran confianza de la comunidad.
                      </Text>
                      <View style={styles.suggestionRow}>
                        {suggestedCandidates.map((rep, index) => {
                          const displayName =
                            rep.displayName || rep.handle || rep.did
                          const reason = rep.hasVoted
                            ? 'Ya votó'
                            : rep.activeDelegationCount > 0
                              ? `${rep.activeDelegationCount} cesiones`
                              : rep.roles?.[0] || 'Miembro activo'
                          return (
                            <TouchableOpacity
                              accessibilityRole="button"
                              key={rep.did}
                              onPress={() => setSelectedRep(rep.did)}
                              style={[
                                styles.suggestionChip,
                                {
                                  borderColor:
                                    selectedRep === rep.did
                                      ? t.palette.primary_500
                                      : t.palette.contrast_100,
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.suggestionRank,
                                  {color: t.palette.primary_500},
                                ]}>
                                #{index + 1}
                              </Text>
                              <Text
                                style={[styles.suggestionName, t.atoms.text]}
                                numberOfLines={1}>
                                {displayName}
                              </Text>
                              <Text
                                style={[
                                  styles.suggestionReason,
                                  t.atoms.text_contrast_medium,
                                ]}
                                numberOfLines={1}>
                                {reason}
                              </Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  ) : null}
                  {candidates.map(rep => {
                    const isSelected = selectedRep === rep.did
                    const power = calcQuadraticPower(rep.activeDelegationCount)
                    const newPower = calcQuadraticPower(
                      rep.activeDelegationCount + 1,
                    )
                    const displayName = rep.displayName || rep.handle || rep.did

                    return (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={rep.did}
                        onPress={() => setSelectedRep(rep.did)}
                        activeOpacity={0.8}
                        style={[
                          styles.repCard,
                          t.atoms.bg_contrast_25,
                          isSelected && {
                            borderColor: t.palette.primary_500,
                            borderWidth: 2,
                          },
                        ]}>
                        {/* Avatar placeholder */}
                        <View
                          style={[
                            styles.repAvatar,
                            {backgroundColor: t.palette.primary_500 + '20'},
                          ]}>
                          <Text style={{fontSize: 20}}>
                            {displayName.charAt(0)}
                          </Text>
                        </View>

                        <View style={styles.repInfo}>
                          <Text style={[styles.repName, t.atoms.text]}>
                            {displayName}
                          </Text>
                          <Text
                            style={[
                              styles.repHandle,
                              t.atoms.text_contrast_medium,
                            ]}>
                            {rep.handle ? `@${rep.handle}` : rep.did}
                          </Text>
                          <Text
                            style={[
                              styles.repBio,
                              t.atoms.text_contrast_medium,
                            ]}>
                            {rep.description ||
                              rep.roles?.join(' · ') ||
                              'Representante comunitario'}
                          </Text>
                        </View>

                        <View style={styles.repStats}>
                          {/* Current delegations */}
                          <View style={styles.repStatItem}>
                            <Text style={[styles.repStatValue, t.atoms.text]}>
                              {rep.activeDelegationCount}
                            </Text>
                            <Text
                              style={[
                                styles.repStatLabel,
                                t.atoms.text_contrast_medium,
                              ]}>
                              cesiones
                            </Text>
                          </View>

                          {/* Power */}
                          <View style={styles.repStatItem}>
                            <Text
                              style={[styles.repStatValue, {color: '#FF9500'}]}>
                              √{power.toFixed(1)}
                            </Text>
                            <Text
                              style={[
                                styles.repStatLabel,
                                t.atoms.text_contrast_medium,
                              ]}>
                              poder actual
                            </Text>
                          </View>

                          {/* Power if you cede */}
                          <View style={styles.repStatItem}>
                            <Text
                              style={[styles.repStatValue, {color: '#34C759'}]}>
                              →√{newPower.toFixed(1)}
                            </Text>
                            <Text
                              style={[
                                styles.repStatLabel,
                                t.atoms.text_contrast_medium,
                              ]}>
                              con tu voto
                            </Text>
                          </View>

                          {/* Compass */}
                          <View
                            style={[
                              styles.compassBadge,
                              {backgroundColor: t.palette.contrast_50},
                            ]}>
                            <Text
                              style={[
                                styles.compassBadgeText,
                                t.atoms.text_contrast_medium,
                              ]}>
                              {rep.hasVoted ? 'Ya votó' : 'Sin voto registrado'}
                            </Text>
                          </View>
                        </View>

                        {/* Selection radio */}
                        <View
                          style={[
                            styles.radioOuter,
                            {
                              borderColor: isSelected
                                ? t.palette.primary_500
                                : t.palette.contrast_200,
                            },
                          ]}>
                          {isSelected && (
                            <View
                              style={[
                                styles.radioInner,
                                {backgroundColor: t.palette.primary_500},
                              ]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {cessionMode === 'active' ? (
                <View style={[styles.criteriaCard, t.atoms.bg_contrast_25]}>
                  <Text style={[styles.criteriaTitle, t.atoms.text]}>
                    Tu criterio propio
                  </Text>
                  <Text
                    style={[styles.criteriaSub, t.atoms.text_contrast_medium]}>
                    Cedes la ejecución, pero dejas tu criterio registrado.
                    Completa al menos 2 de 3.
                  </Text>
                  <View style={styles.optionGrid}>
                    {cabildeo.options.map((option, index) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={`${option.label}-${index}`}
                        onPress={() => setPreferredOption(index)}
                        style={[
                          styles.optionChoice,
                          {
                            borderColor:
                              preferredOption === index
                                ? t.palette.primary_500
                                : t.palette.contrast_100,
                          },
                        ]}>
                        <Text
                          style={[styles.optionChoiceText, t.atoms.text]}
                          numberOfLines={2}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    accessibilityRole="text"
                    style={[styles.reasonInput, t.atoms.bg, t.atoms.text]}
                    placeholder="Razón o condición de tu cesión"
                    placeholderTextColor={t.palette.contrast_500}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={styles.signalRow}>
                    {SIGNALS.map(item => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        key={item}
                        onPress={() => setSignal(item)}
                        style={[
                          styles.signalPill,
                          {
                            backgroundColor:
                              signal === item
                                ? t.palette.primary_500
                                : t.palette.contrast_50,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.signalText,
                            signal === item ? {color: '#fff'} : t.atoms.text,
                          ]}>
                          {item > 0 ? `+${item}` : item}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.criteriaMeter,
                      {
                        color:
                          activeCriteriaCount >= 2
                            ? '#34C759'
                            : t.palette.contrast_500,
                      },
                    ]}>
                    {activeCriteriaCount}/3 elementos completos
                  </Text>
                </View>
              ) : null}

              {/* Cede Button */}
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  handleCede().catch(() => {})
                }}
                disabled={!canSubmitCession || delegateMutation.isPending}
                style={[
                  styles.delegateBtn,
                  {
                    backgroundColor:
                      canSubmitCession && !delegateMutation.isPending
                        ? '#FF9500'
                        : t.palette.contrast_200,
                  },
                ]}>
                <Text style={styles.delegateBtnText}>
                  {delegateMutation.isPending
                    ? 'Cediendo...'
                    : cessionMode === 'active'
                      ? '🤝 Ceder mi voto'
                      : '⚙️ Guardar cesión pasiva'}
                </Text>
                {cessionMode === 'active' && selectedRepData && (
                  <Text style={styles.delegateBtnSub}>
                    a{' '}
                    {selectedRepData.displayName ||
                      selectedRepData.handle ||
                      selectedRepData.did}{' '}
                    · nuevo poder: √
                    {calcQuadraticPower(
                      selectedRepData.activeDelegationCount + 1,
                    ).toFixed(1)}
                  </Text>
                )}
                {cessionMode === 'passive' && canSubmitPassive ? (
                  <Text style={styles.delegateBtnSub}>
                    {passiveParty} · {passiveMatter} · {passiveCommunity}
                  </Text>
                ) : null}
              </TouchableOpacity>
              {!canSubmitCession ? (
                <Text style={[styles.errorText, t.atoms.text_contrast_medium]}>
                  {cessionMode === 'active'
                    ? 'Elige una voz receptora y completa al menos 2 piezas de criterio.'
                    : 'Completa partido, materia y comunidad para guardar la regla.'}
                </Text>
              ) : null}
              {delegateMutation.isError ? (
                <Text style={[styles.errorText, {color: '#FF3B30'}]}>
                  No se pudo registrar la cesión. Intenta otra vez.
                </Text>
              ) : null}

              {/* Or vote directly */}
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => navigation.goBack()}
                style={[styles.directBtn, t.atoms.bg_contrast_25]}>
                <Text style={[styles.directBtnText, t.atoms.text]}>
                  ← Mejor voto directo (peso 1.0)
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Layout.Center>
      </ScrollView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 60},
  center: {paddingHorizontal: 16, paddingTop: 8},

  // Explainer
  explainer: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  explainerTitle: {fontSize: 14, fontWeight: '900', marginBottom: 6},
  explainerText: {fontSize: 13, lineHeight: 20},

  // Power Comparison
  powerComparison: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  powerTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
  },
  powerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  powerItem: {flex: 1, alignItems: 'center'},
  powerValue: {fontSize: 28, fontWeight: '900'},
  powerLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  powerDivider: {width: 1, height: 40},

  // Scale
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 80,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  scaleItem: {alignItems: 'center', gap: 2},
  scaleBar: {width: 18, borderRadius: 4},
  scaleN: {fontSize: 9, fontWeight: '700'},
  scalePower: {fontSize: 8, fontWeight: '600'},
  scaleCaption: {fontSize: 10, textAlign: 'center', fontStyle: 'italic'},

  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 14,
    opacity: 0.7,
  },
  modeTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  modeTab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modeTabText: {fontSize: 13, fontWeight: '900'},

  // Delegated confirmation
  delegatedConfirm: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  delegatedTitle: {fontSize: 18, fontWeight: '900', marginBottom: 6},
  delegatedSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  revokeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  revokeText: {fontSize: 13, fontWeight: '800'},
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
  },
  passiveCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  passiveTitle: {fontSize: 16, fontWeight: '900', marginBottom: 4},
  passiveSub: {fontSize: 12, lineHeight: 17, marginBottom: 12},
  input: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  passiveExample: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 2,
  },
  criteriaCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  criteriaTitle: {fontSize: 16, fontWeight: '900', marginBottom: 4},
  criteriaSub: {fontSize: 12, lineHeight: 17, marginBottom: 12},
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  optionChoice: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: '30%',
    flex: 1,
  },
  optionChoiceText: {fontSize: 12, fontWeight: '800'},
  reasonInput: {
    borderRadius: 12,
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  signalRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  signalPill: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  signalText: {fontSize: 12, fontWeight: '900'},
  criteriaMeter: {fontSize: 12, fontWeight: '800', textAlign: 'right'},

  // Rep List
  repList: {gap: 12, marginBottom: 16},
  suggestions: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 4,
  },
  suggestionsTitle: {fontSize: 15, fontWeight: '900', marginBottom: 4},
  suggestionsSub: {fontSize: 12, lineHeight: 17, marginBottom: 12},
  suggestionRow: {flexDirection: 'row', gap: 8},
  suggestionChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    minHeight: 88,
  },
  suggestionRank: {fontSize: 11, fontWeight: '900', marginBottom: 4},
  suggestionName: {fontSize: 13, fontWeight: '900'},
  suggestionReason: {fontSize: 10, fontWeight: '700', marginTop: 4},
  repCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  repAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  repInfo: {marginBottom: 10},
  repName: {fontSize: 16, fontWeight: '800'},
  repHandle: {fontSize: 12, marginTop: 1},
  repBio: {fontSize: 12, marginTop: 4, lineHeight: 16},

  repStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  repStatItem: {alignItems: 'center'},
  repStatValue: {fontSize: 14, fontWeight: '900'},
  repStatLabel: {fontSize: 9, fontWeight: '600'},
  compassBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6},
  compassBadgeText: {fontSize: 10, fontWeight: '700'},

  radioOuter: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {width: 12, height: 12, borderRadius: 6},

  // Buttons
  delegateBtn: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  delegateBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
  delegateBtnSub: {color: '#ffffff90', fontSize: 11, marginTop: 2},

  directBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  directBtnText: {fontSize: 14, fontWeight: '700'},
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
})
