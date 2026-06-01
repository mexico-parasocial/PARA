import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import {
  findNodeHandle,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {getDefaultChatIdentityMode} from '#/lib/chat/identity'
import {type RepresentativeItem} from '#/lib/mock-data'
import {hasOfficialScope} from '#/lib/official-civic-accounts'
import {
  type RepresentativePajareoEntry,
  type RepresentativePajareoEntryType,
} from '#/lib/representatives/participation'
import {useOfficialCivicAccountQuery} from '#/state/queries/official-civic-accounts'
import {
  useCreateOfficialPajareoResponseMutation,
  useCreateRepresentativePajareoEntryMutation,
  useReportRepresentativePajareoEntryMutation,
  useRepresentativePajareoQuery,
  useSupportRepresentativePajareoEntryMutation,
} from '#/state/queries/representative-participation'
import {EmptyState} from '#/view/com/util/EmptyState'
import {List, type ListRef} from '#/view/com/util/List'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {ChatIdentityPill} from '#/components/chat/ChatIdentityPill'
import {EditBig_Stroke1_Corner0_Rounded as EditIcon} from '#/components/icons/EditBig'
import {Text} from '#/components/Typography'
import {IS_IOS} from '#/env'
import {type SectionRef} from './types'

const ENTRY_TYPES: Array<{value: RepresentativePajareoEntryType; label: string}> =
  [
    {value: 'firma', label: 'Firma'},
    {value: 'pregunta', label: 'Pregunta'},
    {value: 'señal', label: 'Señal'},
    {value: 'testimonio', label: 'Testimonio'},
  ]

interface Props {
  representative: RepresentativeItem
  viewerDid?: string
  headerHeight: number
  scrollElRef: ListRef
  setScrollViewTag: (tag: number | null) => void
  isFocused: boolean
}

export const ProfilePajareoSection = forwardRef<SectionRef, Props>(
  function ProfilePajareoSection(
    {
      representative,
      viewerDid,
      headerHeight,
      scrollElRef,
      setScrollViewTag,
      isFocused,
    },
    ref,
  ) {
    const t = useTheme()
    const {_} = useLingui()
    const [entryType, setEntryType] =
      useState<RepresentativePajareoEntryType>('firma')
    const [body, setBody] = useState('')
    const [officialResponseBody, setOfficialResponseBody] = useState('')
    const [respondingEntryId, setRespondingEntryId] = useState<string | null>(
      null,
    )
    const {data} = useRepresentativePajareoQuery({representative, viewerDid})
    const {data: officialAccountData} = useOfficialCivicAccountQuery(
      representative,
      viewerDid,
    )
    const createEntry = useCreateRepresentativePajareoEntryMutation()
    const createOfficialResponse = useCreateOfficialPajareoResponseMutation()
    const supportEntry = useSupportRepresentativePajareoEntryMutation()
    const reportEntry = useReportRepresentativePajareoEntryMutation()
    const isolatedIdentityMode = getDefaultChatIdentityMode('isolated_testimony')

    const entries = data?.entries ?? []
    const eligibility = data?.eligibility
    const officialAccount = officialAccountData?.account
    const viewerController = officialAccountData?.viewerController
    const canRespondOfficially = hasOfficialScope(
      viewerController,
      'official.pajareo.respond',
    )
    const counts = useMemo(() => {
      return {
        firma: entries.filter(entry => entry.type === 'firma').length,
        pregunta: entries.filter(entry => entry.type === 'pregunta').length,
        señal: entries.filter(entry => entry.type === 'señal').length,
        testimonio: entries.filter(entry => entry.type === 'testimonio').length,
      }
    }, [entries])

    useImperativeHandle(ref, () => ({
      scrollToTop: () => {
        scrollElRef.current?.scrollToOffset({
          offset: -headerHeight,
          animated: true,
        })
      },
    }))

    useEffect(() => {
      if (IS_IOS && isFocused && scrollElRef.current) {
        // @ts-ignore
        const nativeTag = findNodeHandle(scrollElRef.current)
        setScrollViewTag(nativeTag)
      }
    }, [isFocused, scrollElRef, setScrollViewTag])

    const submit = () => {
      if (!viewerDid || !body.trim()) return
      createEntry.mutate(
        {
          representativeId: representative.id,
          viewerDid,
          type: entryType,
          body: body.trim(),
        },
        {
          onSuccess: () => setBody(''),
        },
      )
    }

    const submitOfficialResponse = (entry: RepresentativePajareoEntry) => {
      if (
        !viewerDid ||
        !officialAccount ||
        !viewerController ||
        !officialResponseBody.trim()
      ) {
        return
      }
      createOfficialResponse.mutate(
        {
          representativeId: representative.id,
          entryId: entry.id,
          entityId: officialAccount.id,
          entityName: officialAccount.name,
          controllerDid: viewerController.controllerDid,
          body: officialResponseBody.trim(),
        },
        {
          onSuccess: () => {
            setOfficialResponseBody('')
            setRespondingEntryId(null)
          },
        },
      )
    }

    const renderHeader = () => (
      <View style={[styles.header, t.atoms.bg_contrast_25]}>
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>Pajareo local</Trans>
        </Text>
        <Text style={[styles.description, t.atoms.text_contrast_medium]}>
          <Trans>
            Firmas, preguntas y señales públicas de personas verificadas del
            área representada.
          </Trans>
        </Text>
        <View style={styles.statsRow}>
          <Stat label={_(msg`Firmas`)} value={counts.firma} />
          <Stat label={_(msg`Preguntas`)} value={counts.pregunta} />
          <Stat label={_(msg`Señales`)} value={counts.señal} />
          <Stat label={_(msg`Testimonios`)} value={counts.testimonio} />
        </View>
        <View
          style={[
            styles.eligibility,
            {
              borderColor: eligibility?.eligible
                ? t.palette.positive_500
                : t.palette.contrast_200,
            },
          ]}>
          <Text
            style={[
              styles.eligibilityText,
              eligibility?.eligible
                ? {color: t.palette.positive_500}
                : t.atoms.text_contrast_medium,
            ]}>
            {eligibility?.eligible ? (
              <Trans>Elegibilidad verificada para {eligibility.areaLabel}</Trans>
            ) : (
              <Trans>Solo lectura: verifica residencia para participar.</Trans>
            )}
          </Text>
        </View>
        {officialAccount?.status === 'verified' && (
          <View
            style={[
              styles.officialAccountNotice,
              {borderColor: t.palette.primary_500 + '30'},
            ]}>
            <Text style={[styles.officialAccountTitle, t.atoms.text]}>
              <Trans>Cuenta cívica oficial</Trans>
            </Text>
            <Text
              style={[
                styles.officialAccountText,
                t.atoms.text_contrast_medium,
              ]}>
              {canRespondOfficially ? (
                <Trans>
                  Puedes responder como {officialAccount.name}. La autoría
                  pública será la entidad; el controlador queda en auditoría.
                </Trans>
              ) : (
                <Trans>
                  Las respuestas oficiales aparecerán desde la entidad
                  verificada, no desde una cuenta personal.
                </Trans>
              )}
            </Text>
          </View>
        )}
        {eligibility?.eligible && (
          <View style={styles.composer}>
            <View style={styles.typeRow}>
              {ENTRY_TYPES.map(option => {
                const selected = option.value === entryType
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    key={option.value}
                    onPress={() => setEntryType(option.value)}
                    style={[
                      styles.typePill,
                      selected
                        ? {backgroundColor: t.palette.primary_500}
                        : t.atoms.bg_contrast_50,
                    ]}>
                    <Text
                      style={[
                        styles.typeText,
                        selected ? {color: 'white'} : t.atoms.text,
                      ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {entryType === 'testimonio' && (
              <ChatIdentityPill mode={isolatedIdentityMode} />
            )}
            <TextInput
              accessibilityLabel={_(msg`Pajareo entry input`)}
              accessibilityHint={_(msg`Write an anonymous local signature, question, signal, or testimony.`)}
              value={body}
              onChangeText={setBody}
              placeholder={_(msg`Escribe una firma, pregunta o señal local...`)}
              placeholderTextColor={t.palette.contrast_400}
              multiline
              style={[
                styles.input,
                t.atoms.text,
                {
                  borderColor: t.palette.contrast_200,
                  backgroundColor: t.palette.contrast_0,
                },
              ]}
            />
            <Button
              label={_(msg`Publicar en Pajareo`)}
              variant="solid"
              color="primary"
              size="small"
              disabled={!body.trim() || createEntry.isPending}
              onPress={submit}>
              <ButtonText>
                {createEntry.isPending ? (
                  <Trans>Publicando...</Trans>
                ) : (
                  <Trans>Publicar anónimo</Trans>
                )}
              </ButtonText>
            </Button>
          </View>
        )}
      </View>
    )

    const renderItem = ({item}: {item: unknown}) => {
      const entry = item as RepresentativePajareoEntry
      return (
        <View style={[styles.entry, a.border_b, t.atoms.border_contrast_low]}>
          <View style={styles.entryHeader}>
            <Text style={[styles.entryType, {color: t.palette.primary_500}]}>
              {labelForEntryType(entry.type)}
            </Text>
            <Text style={[styles.entryArea, t.atoms.text_contrast_medium]}>
              {entry.anonymousDisplayArea}
            </Text>
          </View>
          <Text style={[styles.entryBody, t.atoms.text]}>{entry.body}</Text>
          {entry.officialResponse && (
            <View
              style={[
                styles.officialResponse,
                {backgroundColor: t.palette.primary_500 + '10'},
              ]}>
              <Text
                style={[
                  styles.officialResponseLabel,
                  {color: t.palette.primary_500},
                ]}>
                <Trans>Respuesta oficial de {entry.officialResponse.entityName}</Trans>
              </Text>
              <Text style={[styles.officialResponseBody, t.atoms.text]}>
                {entry.officialResponse.body}
              </Text>
              <Text
                style={[
                  styles.officialAudit,
                  t.atoms.text_contrast_medium,
                ]}>
                {entry.officialResponse.controllerHash} ·{' '}
                {new Date(entry.officialResponse.createdAt).toLocaleDateString(
                  'es-MX',
                )}
              </Text>
            </View>
          )}
          {canRespondOfficially &&
            !entry.officialResponse &&
            respondingEntryId === entry.id && (
              <View style={styles.officialComposer}>
                <TextInput
                  accessibilityLabel={_(msg`Official response input`)}
                  accessibilityHint={_(msg`Write an official response from this civic account.`)}
                  value={officialResponseBody}
                  onChangeText={setOfficialResponseBody}
                  placeholder={_(msg`Responder oficialmente...`)}
                  placeholderTextColor={t.palette.contrast_400}
                  multiline
                  style={[
                    styles.input,
                    t.atoms.text,
                    {
                      borderColor: t.palette.primary_500 + '55',
                      backgroundColor: t.palette.contrast_0,
                    },
                  ]}
                />
                <Button
                  label={_(msg`Publicar respuesta oficial`)}
                  variant="solid"
                  color="primary"
                  size="small"
                  disabled={
                    !officialResponseBody.trim() ||
                    createOfficialResponse.isPending
                  }
                  onPress={() => submitOfficialResponse(entry)}>
                  <ButtonText>
                    <Trans>Responder oficialmente</Trans>
                  </ButtonText>
                </Button>
              </View>
            )}
          <View style={styles.entryActions}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => supportEntry.mutate(entry.id)}>
              <Text
                style={[styles.actionText, {color: t.palette.primary_500}]}>
                {entry.supportCount} <Trans>apoyos</Trans>
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => reportEntry.mutate(entry.id)}>
              <Text style={[styles.actionText, t.atoms.text_contrast_medium]}>
                <Trans>Reportar</Trans>
              </Text>
            </TouchableOpacity>
            {canRespondOfficially && !entry.officialResponse && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  setRespondingEntryId(
                    respondingEntryId === entry.id ? null : entry.id,
                  )
                }>
                <Text
                  style={[styles.actionText, {color: t.palette.primary_500}]}>
                  <Trans>Responder como oficial</Trans>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )
    }

    return (
      <List
        ref={scrollElRef}
        data={entries}
        renderItem={renderItem}
        keyExtractor={item => (item as RepresentativePajareoEntry).id}
        headerOffset={headerHeight}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon={EditIcon}
            message={_(msg`Todavía no hay Pajareo para este representante.`)}
            style={{width: '100%'}}
          />
        }
        contentContainerStyle={{
          minHeight: '100%',
          paddingBottom: 100,
        }}
      />
    )
  },
)

function Stat({label, value}: {label: string; value: number}) {
  const t = useTheme()
  return (
    <View style={[styles.stat, {backgroundColor: t.palette.contrast_50}]}>
      <Text style={[styles.statValue, t.atoms.text]}>{value}</Text>
      <Text style={[styles.statLabel, t.atoms.text_contrast_medium]}>
        {label}
      </Text>
    </View>
  )
}

function labelForEntryType(type: RepresentativePajareoEntryType) {
  if (type === 'firma') return 'Firma'
  if (type === 'pregunta') return 'Pregunta'
  if (type === 'señal') return 'Señal'
  return 'Testimonio'
}

const styles = StyleSheet.create({
  header: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  stat: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  eligibility: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  eligibilityText: {
    fontSize: 12,
    fontWeight: '800',
  },
  officialAccountNotice: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  officialAccountTitle: {
    fontSize: 13,
    fontWeight: '900',
  },
  officialAccountText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  composer: {
    gap: 10,
    marginTop: 12,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typePill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 86,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  entry: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  entryType: {
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  entryArea: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
  },
  entryBody: {
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  officialResponse: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 5,
  },
  officialResponseLabel: {
    fontSize: 12,
    fontWeight: '900',
  },
  officialResponseBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  officialAudit: {
    fontSize: 11,
    fontWeight: '700',
  },
  officialComposer: {
    gap: 8,
    marginTop: 12,
  },
  entryActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
})
