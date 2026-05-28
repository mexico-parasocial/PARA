import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {RouteProp, useRoute} from '@react-navigation/native'

import {RAQ_AXES_BY_ID} from '#/lib/mock-data'
import {type CommonNavigatorParams} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'

export default function AxisDetailScreen() {
  const t = useTheme()
  const {_} = useLingui()
  const route = useRoute<RouteProp<CommonNavigatorParams, 'AxisDetail'>>()
  const {axisId} = route.params || {}

  const axis = axisId ? RAQ_AXES_BY_ID[axisId] : undefined

  if (!axis) {
    return (
      <Layout.Screen>
        <Layout.Header.Outer>
          <Layout.Header.BackButton />
        </Layout.Header.Outer>
        <Layout.Center style={{flex: 1}}>
          <Text style={t.atoms.text}>{_(msg`Axis not found`)}</Text>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            {axis.title.replace(/^\d+\.\s*/, '')}
          </Layout.Header.TitleText>
        </Layout.Header.Content>
      </Layout.Header.Outer>

      <Layout.Content contentContainerStyle={styles.container}>
        <View style={[styles.headerCard, t.atoms.bg_contrast_25]}>
          <View style={styles.polarityRow}>
            <Text style={[styles.polarityLabel, {color: t.palette.primary_500}]}>
              {axis.labelLow}
            </Text>
            <Text style={[styles.polarityArrow, t.atoms.text_contrast_medium]}>
              ↔
            </Text>
            <Text style={[styles.polarityLabel, {color: t.palette.primary_500}]}>
              {axis.labelHigh}
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, t.atoms.text]}>
          <Trans>Questions</Trans>
        </Text>

        {axis.data.map((q, i) => (
          <View
            key={q.id}
            style={[
              styles.questionCard,
              t.atoms.bg,
              a.border,
              t.atoms.border_contrast_low,
            ]}>
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              {i + 1}
            </Text>
            <Text style={[a.text_sm, a.font_bold, t.atoms.text, a.mt_xs]}>
              {q.text}
            </Text>
          </View>
        ))}
      </Layout.Content>
    </Layout.Screen>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  polarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  polarityLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  polarityArrow: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
  },
})
