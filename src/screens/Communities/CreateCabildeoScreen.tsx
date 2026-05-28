import {useCallback, useState} from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {publishCabildeo} from '#/lib/api/cabildeo'
import {
  type CabildeoAccessTier,
  type CabildeoOption,
  type CabildeoVoteVisibility,
} from '#/lib/api/para-lexicons'
import {
  CABILDEO_ACCESS_TIERS,
  getAccessTierLabel,
} from '#/lib/official-civic-accounts'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {cabildeosQueryKey} from '#/state/queries/cabildeo'
import {useAgent} from '#/state/session'
import {useTheme} from '#/alf'
import {
  GeoScopeSelector,
  type ResolvedGeoScope,
} from '#/components/GeoScopeSelector'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'CreateCabildeo'>

export function CreateCabildeoScreen(_props: Props) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const agent = useAgent()
  const queryClient = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [community, setCommunity] = useState('')
  const [geoScope, setGeoScope] = useState<ResolvedGeoScope | undefined>(
    undefined,
  )
  const [geoRestricted, setGeoRestricted] = useState(false)
  const [minimumViewTier, setMinimumViewTier] =
    useState<CabildeoAccessTier>('public')
  const [minimumParticipationTier, setMinimumParticipationTier] =
    useState<CabildeoAccessTier>('signed_in')
  const [voteVisibility, setVoteVisibility] =
    useState<CabildeoVoteVisibility>('party_only')

  const [options, setOptions] = useState<CabildeoOption[]>([
    {label: '', description: ''},
    {label: '', description: ''},
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleAddOption = useCallback(() => {
    setOptions(prev => [...prev, {label: '', description: ''}])
  }, [])

  const handleUpdateOption = useCallback(
    (index: number, field: keyof CabildeoOption, value: string) => {
      setOptions(prev => {
        const next = [...prev]
        next[index] = {...next[index], [field]: value}
        return next
      })
    },
    [],
  )

  const handleRemoveOption = useCallback((index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handlePublish = useCallback(async () => {
    if (!title.trim() || !description.trim() || !community.trim()) {
      Toast.show('Faltan campos requeridos')
      return
    }

    const validOptions = options.filter(o => o.label.trim() !== '')
    if (validOptions.length < 2) {
      Toast.show('Debes proveer al menos 2 opciones')
      return
    }

    setIsSubmitting(true)
    try {
      // Build the record with geo-privacy scope data
      const recordData = {
        title: title.trim(),
        description: description.trim(),
        community: community.trim(),
        options: validOptions,
        phase: 'draft' as const,
        minimumViewTier,
        minimumParticipationTier,
        voteVisibility,
        ...(geoRestricted ? {geoRestricted: true} : {}),
        ...(geoScope
          ? {
              region: geoScope.region,
              geoScope: geoScope.scope,
              ...(geoScope.districtKey
                ? {districtKey: geoScope.districtKey}
                : {}),
              ...(geoScope.city ? {city: geoScope.city} : {}),
              ...(geoScope.neighborhood
                ? {neighborhood: geoScope.neighborhood}
                : {}),
              ...(geoScope.geo ? {geo: geoScope.geo} : {}),
              ...(geoScope.positionalAccuracy != null
                ? {positionalAccuracy: geoScope.positionalAccuracy}
                : {}),
            }
          : {}),
      }

      await publishCabildeo(agent, recordData)
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
      Toast.show('Cabildeo creado exitosamente')
      navigation.goBack()
    } catch (e: unknown) {
      console.error(e)
      Toast.show(
        'Error al publicar: ' + (e instanceof Error ? e.message : String(e)),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [
    agent,
    title,
    description,
    community,
    geoScope,
    geoRestricted,
    minimumParticipationTier,
    minimumViewTier,
    voteVisibility,
    options,
    navigation,
    queryClient,
  ])

  return (
    <Layout.Screen testID="createCabildeoScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Crear Propuesta</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>
            Cabildeo Cívico
          </Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}>
          <Layout.Center style={styles.center}>
            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, t.atoms.text]}>Título *</Text>
              <TextInput
                accessibilityRole="text"
                style={[
                  styles.input,
                  t.atoms.bg_contrast_25,
                  t.atoms.text,
                  {fontSize: 18, fontWeight: '800'},
                ]}
                placeholder="¿Qué problema debemos resolver?"
                placeholderTextColor={t.palette.contrast_500}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                multiline
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, t.atoms.text]}>Descripción *</Text>
              <TextInput
                accessibilityRole="text"
                style={[
                  styles.input,
                  t.atoms.bg_contrast_25,
                  t.atoms.text,
                  {minHeight: 100},
                ]}
                placeholder="Contexto, implicaciones y urgencia de la propuesta..."
                placeholderTextColor={t.palette.contrast_500}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Community */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, t.atoms.text]}>Comunidad *</Text>
              <TextInput
                accessibilityLabel="Text input field"
                accessibilityHint="Enter the primary community identifier"
                style={[styles.input, t.atoms.bg_contrast_25, t.atoms.text]}
                placeholder="p/Jalisco"
                placeholderTextColor={t.palette.contrast_500}
                value={community}
                onChangeText={setCommunity}
                autoCapitalize="none"
              />
            </View>

            {/* Geo Scope Selector */}
            <GeoScopeSelector value={geoScope} onChange={setGeoScope} />

            {/* Geo-Restriction Toggle */}
            {geoScope?.region && (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => setGeoRestricted(prev => !prev)}
                style={[
                  styles.toggleCard,
                  geoRestricted
                    ? {
                        backgroundColor: t.palette.negative_500 + '15',
                        borderColor: t.palette.negative_500,
                      }
                    : t.atoms.bg_contrast_25,
                ]}>
                <View style={styles.toggleRow}>
                  <Text style={{fontSize: 20}}>🔒</Text>
                  <View style={{flex: 1}}>
                    <Text
                      style={[
                        styles.toggleLabel,
                        geoRestricted
                          ? {color: t.palette.negative_500}
                          : t.atoms.text,
                      ]}>
                      Restringir a residentes de {geoScope.region}
                    </Text>
                    <Text
                      style={[
                        styles.toggleSub,
                        geoRestricted
                          ? {color: t.palette.negative_500}
                          : t.atoms.text_contrast_medium,
                      ]}>
                      Solo usuarios verificados podrán votar o delegar.
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      geoRestricted
                        ? {borderColor: t.palette.negative_500}
                        : {borderColor: t.palette.contrast_200},
                    ]}>
                    {geoRestricted && (
                      <View
                        style={[
                          styles.radioInner,
                          {backgroundColor: t.palette.negative_500},
                        ]}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <AccessTierSection
              title="Quién puede ver"
              description="Define el mínimo para abrir este cabildeo. Público mantiene máxima visibilidad."
              value={minimumViewTier}
              onChange={setMinimumViewTier}
            />

            <AccessTierSection
              title="Quién puede participar"
              description="Define el mínimo para votar, delegar o publicar posición."
              value={minimumParticipationTier}
              onChange={setMinimumParticipationTier}
            />

            <VoteVisibilitySection
              value={voteVisibility}
              onChange={setVoteVisibility}
            />

            {/* Options */}
            <View style={styles.optionsSection}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>
                Opciones a Votar
              </Text>

              {options.map((opt, index) => (
                <View
                  key={index}
                  style={[
                    styles.optionCard,
                    t.atoms.bg_contrast_25,
                    {borderColor: t.palette.contrast_100},
                  ]}>
                  <View style={styles.optionHeader}>
                    <Text style={[styles.optionIndex, t.atoms.text]}>
                      Opción {index + 1}
                    </Text>
                    {options.length > 2 && (
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => handleRemoveOption(index)}>
                        <Text
                          style={{
                            color: t.palette.negative_500,
                            fontSize: 13,
                            fontWeight: '700',
                          }}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    accessibilityRole="text"
                    style={[
                      styles.input,
                      t.atoms.bg,
                      t.atoms.text,
                      {marginBottom: 8, fontWeight: '700'},
                    ]}
                    placeholder="Resumen corto..."
                    placeholderTextColor={t.palette.contrast_500}
                    value={opt.label}
                    onChangeText={val =>
                      handleUpdateOption(index, 'label', val)
                    }
                  />
                  <TextInput
                    accessibilityRole="text"
                    style={[
                      styles.input,
                      t.atoms.bg,
                      t.atoms.text,
                      {minHeight: 60},
                    ]}
                    placeholder="Detalles de la implementación..."
                    placeholderTextColor={t.palette.contrast_500}
                    value={opt.description}
                    onChangeText={val =>
                      handleUpdateOption(index, 'description', val)
                    }
                    multiline
                  />
                </View>
              ))}

              <TouchableOpacity
                accessibilityRole="button"
                onPress={handleAddOption}
                style={[
                  styles.addOptionBtn,
                  {borderColor: t.palette.primary_500},
                ]}>
                <Text
                  style={[
                    styles.addOptionText,
                    {color: t.palette.primary_500},
                  ]}>
                  + Añadir Opción
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                handlePublish().catch(() => {})
              }}
              disabled={isSubmitting}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: isSubmitting
                    ? t.palette.contrast_300
                    : t.palette.primary_500,
                },
              ]}>
              <Text
                style={[styles.submitBtnText, {color: t.palette.contrast_100}]}>
                {isSubmitting
                  ? 'Publicando...'
                  : 'Publicar Cabildeo (Fase Borrador)'}
              </Text>
            </TouchableOpacity>
          </Layout.Center>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout.Screen>
  )
}

function VoteVisibilitySection({
  value,
  onChange,
}: {
  value: CabildeoVoteVisibility
  onChange: (value: CabildeoVoteVisibility) => void
}) {
  const t = useTheme()
  const options: Array<{
    value: CabildeoVoteVisibility
    title: string
    description: string
  }> = [
    {
      value: 'party_only',
      title: 'Solo partido',
      description: 'Muestra actividad por partido sin nombres de votantes.',
    },
    {
      value: 'anonymous',
      title: 'Anónimo',
      description: 'Oculta nombres y partidos; solo muestra totales.',
    },
    {
      value: 'public',
      title: 'Público',
      description: 'Permite superficies transparentes con identidad visible.',
    },
  ]

  return (
    <View style={styles.accessSection}>
      <Text style={[styles.sectionTitle, t.atoms.text]}>
        Privacidad del voto
      </Text>
      <Text style={[styles.accessDescription, t.atoms.text_contrast_medium]}>
        Esta configuración queda fija al crear el cabildeo.
      </Text>
      <View style={styles.visibilityStack}>
        {options.map(option => {
          const selected = option.value === value
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.visibilityCard,
                selected
                  ? {
                      borderColor: t.palette.primary_500,
                      backgroundColor: t.palette.primary_500 + '12',
                    }
                  : t.atoms.bg_contrast_25,
              ]}>
              <View style={{flex: 1}}>
                <Text
                  style={[
                    styles.toggleLabel,
                    selected ? {color: t.palette.primary_500} : t.atoms.text,
                  ]}>
                  {option.title}
                </Text>
                <Text style={[styles.toggleSub, t.atoms.text_contrast_medium]}>
                  {option.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  selected
                    ? {borderColor: t.palette.primary_500}
                    : {borderColor: t.palette.contrast_200},
                ]}>
                {selected && (
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
    </View>
  )
}

function AccessTierSection({
  title,
  description,
  value,
  onChange,
}: {
  title: string
  description: string
  value: CabildeoAccessTier
  onChange: (value: CabildeoAccessTier) => void
}) {
  const t = useTheme()
  return (
    <View style={styles.accessSection}>
      <Text style={[styles.sectionTitle, t.atoms.text]}>{title}</Text>
      <Text style={[styles.accessDescription, t.atoms.text_contrast_medium]}>
        {description}
      </Text>
      <View style={styles.accessTierGrid}>
        {CABILDEO_ACCESS_TIERS.map(tier => {
          const selected = tier.value === value
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={tier.value}
              onPress={() => onChange(tier.value)}
              style={[
                styles.accessTierPill,
                selected
                  ? {backgroundColor: t.palette.primary_500}
                  : t.atoms.bg_contrast_25,
              ]}>
              <Text
                style={[
                  styles.accessTierText,
                  selected ? {color: 'white'} : t.atoms.text,
                ]}>
                {getAccessTierLabel(tier.value)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 60},
  center: {paddingHorizontal: 16, paddingTop: 16},

  inputGroup: {marginBottom: 16},
  row: {flexDirection: 'row', gap: 12},
  label: {fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4},
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },

  toggleCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 20,
  },
  toggleRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  toggleLabel: {fontSize: 14, fontWeight: '800'},
  toggleSub: {fontSize: 11, marginTop: 2},
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {width: 12, height: 12, borderRadius: 6},

  accessSection: {
    marginBottom: 18,
  },
  accessDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  accessTierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accessTierPill: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  accessTierText: {
    fontSize: 12,
    fontWeight: '800',
  },
  visibilityStack: {
    gap: 10,
  },
  visibilityCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },

  optionsSection: {marginTop: 8, marginBottom: 24},
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  optionCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionIndex: {fontSize: 12, fontWeight: '800'},

  addOptionBtn: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 4,
  },
  addOptionText: {fontSize: 14, fontWeight: '700'},

  submitBtn: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitBtnText: {fontSize: 16, fontWeight: '900'},
})
