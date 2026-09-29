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
      title: _(msg`Weighted votes on policies`),
      body: _(
        msg`Everyone has one vote. On a policy you vote from -3 to +3, and the number says how much your vote weighs: +3 adds three times what +1 does. On a cabildeo you pick one option, and every vote counts the same.`,
      ),
    },
    {
      emoji: '🔗',
      title: _(msg`Lending your vote`),
      body: _(
        msg`You can lend your vote to someone you trust, for one proposal or for a topic, renewing every 90 days. They cannot pass it on. It still counts once, as yours, and votes the way they vote. If you vote yourself, your vote counts instead, and you can take it back at any moment. Lending is public today: anyone can see whom you trust.`,
      ),
    },
    {
      emoji: '⚖️',
      title: _(msg`How votes are counted`),
      body: _(
        msg`A policy is counted by adding everyone's -3 to +3; a cabildeo by counting the votes for each option. Any other count shown beside them is an experiment in shadow and decides nothing.`,
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
