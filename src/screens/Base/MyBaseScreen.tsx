import {useMemo} from 'react'
import {StyleSheet} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {type NavigationProp} from '#/lib/routes/types'
import {useCabildeosQuery} from '#/state/queries/cabildeo'
import {useProfileQuery} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {usePoliticalAffiliation} from '#/state/shell/political-affiliation'
import {Text} from '#/view/com/util/text/Text'
import {useBreakpoints, useTheme} from '#/alf'
import * as Layout from '#/components/Layout'
import {MyBaseDashboard} from './components/MyBaseDashboard'
import {MyBaseHero} from './components/MyBaseHero'
import {deriveCivicWeight} from './mybase-metrics'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export function MyBaseScreen() {
  const {currentAccount} = useSession()
  const navigation = useNavigation<NavigationProp>()
  const {gtMobile} = useBreakpoints()
  const t = useTheme()
  const currentDid = currentAccount?.did

  const {data: currentProfile} = useProfileQuery({did: currentDid})
  const {data: cabildeos = []} = useCabildeosQuery()
  const {affiliations} = usePoliticalAffiliation()

  const votedCount = useMemo(() => {
    return cabildeos.filter(c => c.userContext?.viewerVoteOption !== undefined)
      .length
  }, [cabildeos])
  const civicWeight = useMemo(() => deriveCivicWeight(cabildeos), [cabildeos])

  if (!currentAccount) {
    return null
  }

  if (!currentProfile) {
    return (
      <Layout.Screen>
        <Layout.Center style={styles.loadingWrap}>
          <Text style={[styles.loadingTitle, t.atoms.text]}>My Base</Text>
          <Text style={[styles.loadingText, t.atoms.text_contrast_medium]}>
            Loading your profile
          </Text>
        </Layout.Center>
      </Layout.Screen>
    )
  }

  return (
    <Layout.Screen>
      <MyBaseHero
        profile={currentProfile}
        civicWeight={civicWeight}
        affiliations={affiliations}
        onPressSettings={() => navigation.navigate('AccountSettings')}
        onPressCommunities={() => navigation.navigate('MyCommunities')}
        onPressCompass={() => navigation.navigate('MyAffiliations')}
        onPressBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack()
          }
        }}
        gtMobile={gtMobile}
      />
      <MyBaseDashboard
        votedCount={votedCount}
        affiliations={affiliations}
        onPressSeeVotes={() =>
          navigation.navigate('SeeVotes', {did: currentDid})
        }
        onPressSeePosts={() =>
          navigation.navigate('SeePosts', {did: currentDid})
        }
        onPressRAQ={() => navigation.navigate('MyRAQ')}
        onPressAffiliations={() => navigation.navigate('MyAffiliations')}
        onPressCivicTree={() => navigation.navigate('CivicTree')}
        onPressSpatialDeliberation={() =>
          navigation.navigate('DeliberationGraph')
        }
        onPressViewProfile={() =>
          navigation.navigate('Profile', {
            name: currentProfile?.handle || '',
          })
        }
        gtMobile={gtMobile}
      />
    </Layout.Screen>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
