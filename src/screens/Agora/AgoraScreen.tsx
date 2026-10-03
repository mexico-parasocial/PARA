import {useCallback} from 'react'
import {ScrollView, StyleSheet, View} from 'react-native'
import {msg} from '@lingui/core/macro'
import {useLingui} from '@lingui/react'
import {Trans} from '@lingui/react/macro'
import {useNavigation} from '@react-navigation/native'

import {PressableScale} from '#/lib/custom-animations/PressableScale'
import {type NavigationProp} from '#/lib/routes/types'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {CheckThick_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {CircleQuestion_Stroke2_Corner2_Rounded as QuestionIcon} from '#/components/icons/CircleQuestion'
import {CommunityIcon_Stroke as Community} from '#/components/icons/Community'
import {Tree_Stroke2_Corner0_Rounded as TreeIcon} from '#/components/icons/Tree'
import * as Layout from '#/components/Layout'
import {Text} from '#/components/Typography'
import {HowItWorksSheet} from './components'

/** Community activity explorer entry */
function CommunityActivitiesCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.primary_100},
          ]}>
          <CheckIcon size="md" style={{color: t.palette.primary_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Community Activities</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>
              Explore social events, cabildeos and public financial activity
            </Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Your Community Civic Tree card - direct access to your primary community tree */
function YourCommunityCivicTreeCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.primary_100},
          ]}>
          <TreeIcon size="md" style={{color: t.palette.primary_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Your Community Civic Tree</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>
              Your community's proposals, evidence, votes, and arguments
            </Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

/** Your Communities quick-access card */
function YourCommunitiesCard({onPress}: {onPress: () => void}) {
  const t = useTheme()
  return (
    <PressableScale
      onPress={onPress}
      targetScale={0.98}
      style={[
        styles.featureCard,
        t.atoms.bg,
        {borderColor: t.atoms.border_contrast_low.borderColor},
      ]}>
      <View style={styles.featureCardHeader}>
        <View
          style={[
            styles.featureIconWrap,
            {backgroundColor: t.palette.positive_100},
          ]}>
          <Community size="md" style={{color: t.palette.positive_600}} />
        </View>
        <View style={a.flex_1}>
          <Text style={[styles.featureCardTitle, t.atoms.text]}>
            <Trans>Your Communities</Trans>
          </Text>
          <Text
            style={[styles.featureCardSubtitle, t.atoms.text_contrast_medium]}>
            <Trans>Spaces you participate in</Trans>
          </Text>
        </View>
        <Text style={[styles.featureCardArrow, t.atoms.text_contrast_medium]}>
          →
        </Text>
      </View>
    </PressableScale>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Main Screen ═══════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

export function AgoraScreen() {
  const {_} = useLingui()
  const navigation = useNavigation<NavigationProp>()
  const howItWorksControl = Dialog.useDialogControl()

  const handlePressCommunities = useCallback(() => {
    navigation.navigate('MyCommunities')
  }, [navigation])

  const handlePressCommunityActivities = useCallback(() => {
    navigation.navigate('CommunityDirectory')
  }, [navigation])

  const handlePressYourCommunityCivicTree = useCallback(() => {
    navigation.navigate('CommunityCivicTree')
  }, [navigation])

  return (
    <Layout.Screen>
      <Layout.Header.Outer noBottomBorder>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Ágora</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot>
          <Button
            label={_(msg`How it works`)}
            onPress={howItWorksControl.open}
            size="small"
            variant="ghost"
            color="secondary"
            shape="round"
            style={[a.justify_center]}>
            <ButtonIcon icon={QuestionIcon} size="lg" />
          </Button>
        </Layout.Header.Slot>
      </Layout.Header.Outer>

      <Layout.Center style={a.flex_1}>
        <ScrollView
          style={a.flex_1}
          contentContainerStyle={styles.scrollContent}>
          <View style={styles.sectionWrap}>
            <View style={styles.featureGrid}>
              <YourCommunitiesCard onPress={handlePressCommunities} />
              <CommunityActivitiesCard
                onPress={handlePressCommunityActivities}
              />
              <YourCommunityCivicTreeCard
                onPress={handlePressYourCommunityCivicTree}
              />
            </View>
          </View>
        </ScrollView>
      </Layout.Center>

      <Dialog.Outer control={howItWorksControl}>
        <Dialog.Handle />
        <Dialog.ScrollableInner label={_(msg`How it works`)}>
          <HowItWorksSheet onClose={howItWorksControl.close} />
        </Dialog.ScrollableInner>
      </Dialog.Outer>
    </Layout.Screen>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══ Styles ════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 120,
  },
  sectionWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ─── Feature Cards ──────────────────────────────────────────────────────────
  featureGrid: {
    gap: 10,
    marginTop: 10,
  },
  featureCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureCardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  featureCardArrow: {
    fontSize: 18,
    fontWeight: '400',
  },
})
