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
      title: _(msg`Quadratic voting (being tested)`),
      body: _(
        msg`You vote from -3 to +3, and the number is your voice. Each extra voice costs more: 1 voice costs 1 credit, 2 cost 4, 3 cost 9. You can say something matters a lot to you, but it is expensive, so you save it for what matters most. In PARA this is still an experiment: its results are shown for comparison and decide nothing.`,
      ),
    },
    {
      emoji: '🔗',
      title: _(msg`Lending your voice`),
      body: _(
        msg`You can lend your voice to someone you trust, for one proposal or for a topic, renewing every 90 days. They cannot pass it on. It still counts as one person, at the intensity you allowed, paid from your own credits. If you vote yourself, your vote counts instead, and you can take your voice back at any moment. Lending is public today: anyone can see whom you trust.`,
      ),
    },
    {
      emoji: '⚖️',
      title: _(msg`Three Tallies`),
      body: _(
        msg`Every proposal is counted one person, one vote, and that count decides. A quadratic count runs alongside it in shadow, so the community can compare the two before choosing. An adjustment for voters who always vote together has been designed but not built.`,
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
