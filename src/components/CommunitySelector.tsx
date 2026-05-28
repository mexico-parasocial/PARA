import {useRef} from 'react'
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native'
import {useNavigation} from '@react-navigation/native'

import {
  allCommunities,
  ninthCommunities,
  officialParties,
} from '#/lib/constants/communities'
import {MEXICAN_STATES} from '#/lib/constants/mexico'
import {type NavigationProp} from '#/lib/routes/types'
import {useGlobalFilter} from '#/state/shell/global-filter'
import {useTheme} from '#/alf'
import {CommunityCard} from '#/components/CommunityCard'
import {Compass_Stroke2_Corner0_Rounded as CompassIcon} from '#/components/icons/Compass'
//import {Text} from '#/components/Typography'
import {WebScrollControls} from '#/components/WebScrollControls'

interface CommunitySelectorProps {
  viewMode: string
  onOpenSettings: () => void
}

export function CommunitySelector({
  viewMode,
  onOpenSettings,
}: CommunitySelectorProps) {
  const t = useTheme()
  const navigation = useNavigation<NavigationProp>()
  const scrollViewRef = useRef<ScrollView>(null)

  const {selectedCommunities, toggleCommunity} = useGlobalFilter()

  const toggleFilter = (name: string) => {
    toggleCommunity(name)
  }

  // Determine list of unselected items to show based on viewMode
  const mexicanStates = MEXICAN_STATES // Imported constant

  return (
    <View style={[styles.communitySection, t.atoms.border_contrast_low]}>
      {/* Container with relative positioning for the button */}
      <View style={{position: 'relative'}}>
        {/* Scroll Controls (Web) */}
        <WebScrollControls scrollViewRef={scrollViewRef} />

        {/* Horizontal List */}
        <ScrollView
          ref={scrollViewRef}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.communityCardsContainer}>
          {/* Render Selected (Pinned) Cards First */}
          {selectedCommunities.map(filterName => {
            let community = allCommunities.find(c => c.name === filterName)
            // Handle State fallback
            if (!community) {
              if (mexicanStates.includes(filterName)) {
                community = {name: filterName, color: '#007AFF'}
              } else {
                return null
              }
            }
            return (
              <CommunityCard
                key={community.name}
                name={community.name}
                color={community.color}
                isPinned={true}
                onToggle={() => toggleFilter(community.name)}
                onProfile={() =>
                  navigation.navigate('CommunityProfile', {
                    communityId: community.name,
                    communityName: community.name,
                  })
                }
              />
            )
          })}

          {/* Render Unselected Cards based on View Mode */}
          {viewMode === "View by 9th's"
            ? ninthCommunities
                .filter(c => !selectedCommunities.includes(c.name))
                .map(community => (
                  <CommunityCard
                    key={community.name}
                    name={community.name}
                    color={community.color}
                    isPinned={false}
                    onToggle={() => toggleFilter(community.name)}
                    onProfile={() =>
                      navigation.navigate('CommunityProfile', {
                        communityId: community.name,
                        communityName: community.name,
                      })
                    }
                  />
                ))
            : officialParties
                .filter(p => !selectedCommunities.includes(p.name))
                .map(party => (
                  <CommunityCard
                    key={party.name}
                    name={party.name}
                    color={party.color}
                    isPinned={false}
                    onToggle={() => toggleFilter(party.name)}
                    onProfile={() =>
                      navigation.navigate('CommunityProfile', {
                        communityId: party.name,
                        communityName: party.name,
                      })
                    }
                  />
                ))}
        </ScrollView>

        {/* Compass Button (Settings/View Mode Toggle) - Top Right Absolute */}
        <View style={styles.compassButtonContainer}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={[
              styles.compassButton,
              {backgroundColor: t.palette.primary_500},
            ]}>
            <CompassIcon width={20} height={20} style={{color: 'white'}} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  communitySection: {
    borderBottomWidth: 1,
    paddingTop: 16,
    paddingBottom: 16,
  },
  communityCardsContainer: {
    paddingHorizontal: 16,
    paddingRight: 60, // Extra padding for the absolute button
    alignItems: 'center',
    flexDirection: 'row',
  },
  compassButtonContainer: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  compassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
})
