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
import {useNavigation, useRoute} from '@react-navigation/native'
import {useQueryClient} from '@tanstack/react-query'

import {publishCabildeoPosition} from '#/lib/api/cabildeo'
import {type CabildeoPositionRecord} from '#/lib/api/para-lexicons'
import {fromCabildeoRouteParam} from '#/lib/cabildeo-client'
import {
  type CommonNavigatorParams,
  type NativeStackScreenProps,
  type NavigationProp,
} from '#/lib/routes/types'
import {
  cabildeoDetailQueryKey,
  cabildeoPositionsQueryKey,
  cabildeosQueryKey,
} from '#/state/queries/cabildeo'
import {useAgent} from '#/state/session'
import {useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import * as Toast from '#/components/Toast'
import {Text} from '#/components/Typography'

type Props = NativeStackScreenProps<CommonNavigatorParams, 'CreatePosition'>

export function CreatePositionScreen(_props: Props) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<Props['route']>()
  const agent = useAgent()
  const queryClient = useQueryClient()

  const {optionIndex} = route.params
  const cabildeoUri = fromCabildeoRouteParam(route.params.cabildeoUri)

  const [stance, setStance] = useState<CabildeoPositionRecord['stance']>('for')
  const [text, setText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePublish = useCallback(async () => {
    if (!text.trim()) {
      Toast.show('Debes proveer un argumento')
      return
    }

    setIsSubmitting(true)
    try {
      const recordData: Omit<CabildeoPositionRecord, 'createdAt'> = {
        cabildeo: cabildeoUri,
        stance,
        ...(optionIndex !== undefined ? {optionIndex} : {}),
        text: text.trim(),
      }

      await publishCabildeoPosition(agent, recordData)
      void queryClient.invalidateQueries({
        queryKey: cabildeoDetailQueryKey(cabildeoUri),
      })
      void queryClient.invalidateQueries({
        queryKey: cabildeoPositionsQueryKey(cabildeoUri),
      })
      void queryClient.invalidateQueries({queryKey: cabildeosQueryKey})
      Toast.show('Posición publicada exitosamente')
      navigation.goBack()
    } catch (e: unknown) {
      console.error(e)
      Toast.show(
        'Error al publicar: ' +
          (e instanceof Error ? e.message : 'Error desconocido'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [agent, cabildeoUri, stance, optionIndex, text, navigation, queryClient])

  const stances: Array<{
    value: typeof stance
    label: string
    icon: string
    color: string
  }> = [
    {value: 'for', label: 'A Favor', icon: '✅', color: '#34C759'},
    {value: 'against', label: 'En Contra', icon: '❌', color: '#FF3B30'},
    {value: 'amendment', label: 'Enmienda', icon: '✍️', color: '#FF9500'},
  ]

  return (
    <Layout.Screen testID="createPositionScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Tomar Postura</Trans>
          </Layout.Header.TitleText>
          <Layout.Header.SubtitleText>Debate Cívico</Layout.Header.SubtitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}>
          <Layout.Center style={styles.center}>
            <Text style={[styles.instruction, t.atoms.text_contrast_medium]}>
              {optionIndex !== undefined
                ? `Estás argumentando sobre la Opción ${optionIndex + 1}`
                : 'Estás argumentando sobre el Cabildeo en general'}
            </Text>

            {/* Stance Selector */}
            <View style={styles.stanceRow}>
              {stances.map(s => (
                <TouchableOpacity
                  accessibilityRole="button"
                  key={s.value}
                  onPress={() => setStance(s.value)}
                  style={[
                    styles.stanceButton,
                    t.atoms.bg_contrast_25,
                    stance === s.value && {
                      backgroundColor: s.color + '20',
                      borderColor: s.color,
                    },
                  ]}>
                  <Text style={{fontSize: 20, marginBottom: 4}}>{s.icon}</Text>
                  <Text
                    style={[
                      styles.stanceLabel,
                      t.atoms.text_contrast_medium,
                      stance === s.value && {color: s.color},
                    ]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Argument TextInput */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, t.atoms.text]}>Tu Argumento *</Text>
              <TextInput
                accessibilityRole="text"
                style={[styles.input, t.atoms.bg_contrast_25, t.atoms.text]}
                placeholder="Explica tu reasoning para esta postura. Trata de mantener un tono constructivo e informativo."
                placeholderTextColor={t.palette.contrast_500}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={3000}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, t.atoms.text_contrast_medium]}>
                {text.length} / 3000
              </Text>
            </View>

            {/* Submit */}
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
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Publicando...' : 'Publicar Argumento'}
              </Text>
            </TouchableOpacity>
          </Layout.Center>
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingBottom: 60},
  center: {paddingHorizontal: 16, paddingTop: 16},

  instruction: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },

  stanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  stanceButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  stanceLabel: {
    fontSize: 13,
    fontWeight: '800',
  },

  inputGroup: {marginBottom: 24},
  label: {fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4},
  input: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 180,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    marginTop: 8,
    marginRight: 4,
  },

  submitBtn: {
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 30,
  },
  submitBtnText: {color: '#fff', fontSize: 16, fontWeight: '900'},
})
