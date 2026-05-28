import {StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'

import {useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

export function HowItWorksSheet({onClose}: {onClose: () => void}) {
  const t = useTheme()
  const {_} = useLingui()

  const sections = [
    {
      emoji: '🗳️',
      title: _(msg`Quadratic Voting`),
      body: _(
        msg`You can vote from -3 (strongly oppose) to +3 (strongly support). But intensity matters: each additional "unit" of conviction costs the square of that unit in credits. 1 unit = 1 credit, 2 units = 4 credits, 4 units = 16 credits. This makes extreme positions expensive and encourages honest signaling.`,
      ),
    },
    {
      emoji: '🔗',
      title: _(msg`Liquid Delegation`),
      body: _(
        msg`Don't have time to research every proposal? Delegate your vote to someone you trust for a specific community, topic, or single proposal. You can revoke at any time. Your delegate's vote is transparent — you always know how they voted on your behalf.`,
      ),
    },
    {
      emoji: '⚖️',
      title: _(msg`Three Tallies`),
      body: _(
        msg`Every proposal computes three results: Flat (one person, one vote), √n-weighted (discounts highly correlated voters), and Correlation-adjusted (also weights by deliberation quality). Flat is binding; the others are advisory transparency layers.`,
      ),
    },
    {
      emoji: '💬',
      title: _(msg`Deliberation Matters`),
      body: _(
        msg`Voting without deliberation is just polling. The Agora surfaces "bridging statements" — ideas that people across different opinion groups agree on. These are the ideas that actually move democracy forward.`,
      ),
    },
    {
      emoji: '🌐',
      title: _(msg`Cross-Community Intelligence`),
      body: _(
        msg`The most interesting proposals are the ones that bring together communities that don't usually agree. The Agora detects these "emergent coalitions" and surfaces them as signs of new publics forming.`,
      ),
    },
  ]

  return (
    <View style={[styles.wrap, t.atoms.bg]}>
      <View style={styles.header}>
        <Text style={[styles.title, t.atoms.text]}>
          <Trans>How PARA Democracy Works</Trans>
        </Text>
        <Text style={[styles.subtitle, t.atoms.text_contrast_medium]}>
          <Trans>
            This is not majority rule. This is collective intelligence.
          </Trans>
        </Text>
      </View>
      <View style={styles.sections}>
        {sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.emoji}>{s.emoji}</Text>
            <View style={styles.sectionBody}>
              <Text style={[styles.sectionTitle, t.atoms.text]}>{s.title}</Text>
              <Text style={[styles.sectionText, t.atoms.text_contrast_medium]}>
                {s.body}
              </Text>
            </View>
          </View>
        ))}
      </View>
      <Button
        variant="solid"
        color="primary"
        size="large"
        label={_(msg`Got it`)}
        onPress={onClose}>
        <ButtonText>{_(msg`Got it`)}</ButtonText>
      </Button>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {padding: 20, gap: 20},
  header: {gap: 4},
  title: {fontSize: 20, fontWeight: '800'},
  subtitle: {fontSize: 14, fontWeight: '500'},
  sections: {gap: 16},
  section: {flexDirection: 'row', gap: 12},
  emoji: {fontSize: 24},
  sectionBody: {flex: 1, gap: 2},
  sectionTitle: {fontSize: 15, fontWeight: '700'},
  sectionText: {fontSize: 13, lineHeight: 19},
})
